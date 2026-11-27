import { z } from 'zod';

const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const clock = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/);
const slot = z.object({ start: clock, end: clock }).strict();
const goals = z.object({
  response: z.number().int().min(1).max(43200),
  resolution: z.number().int().min(1).max(43200),
}).strict().refine(({ response, resolution }) => response <= resolution);
const goalEntries = Object.fromEntries(priorities.map(priority => [priority, goals]));
export const policySchema = z.object({
  enabled: z.boolean(),
  week: z.array(z.array(slot).max(4)).length(7),
  holidays: z.array(z.object({ date: z.iso.date(), name: z.string().trim().min(1).max(100) }).strict()).max(100),
  rules: z.object({ STANDARD: z.object(goalEntries).strict(), VIP: z.object(goalEntries).strict().nullable() }).strict(),
}).strict().refine(policy =>
  (!policy.enabled || policy.week.some(day => day.length)) &&
  new Set(policy.holidays.map(day => day.date)).size === policy.holidays.length &&
  policy.week.every(day => {
    const sorted = [...day].sort((left, right) => left.start.localeCompare(right.start));
    return sorted.every(({ start, end }, index) => start < end && (!index || sorted[index - 1].end <= start));
  }),
);

const defaultPolicy = {
  enabled: false,
  week: Array.from({ length: 7 }, (_, index) => index < 5 ? [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] : []),
  holidays: [],
  rules: {
    STANDARD: {
      LOW: { response: 480, resolution: 2400 },
      MEDIUM: { response: 240, resolution: 960 },
      HIGH: { response: 120, resolution: 480 },
      URGENT: { response: 30, resolution: 240 },
    },
    VIP: null,
  },
};

export async function readPolicy(connection, organizationId) {
  const [[row]] = await connection.execute('SELECT policy FROM sla_settings WHERE organization_id = ?', [organizationId]);
  return row?.policy ?? structuredClone(defaultPolicy);
}

const minute = 60_000;
const day = 24 * 60 * minute;
// The workspace calendar uses Vietnam time. Deadlines are stored and returned in UTC.
const vietnamOffset = 7 * 60 * minute;
const minutesSinceMidnight = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

export function businessDeadline(startedAt, minutes, week, holidays) {
  let remaining = minutes * minute;
  const start = startedAt.getTime() + vietnamOffset;
  const noWork = new Set(holidays.map(item => item.date));
  const ordered = week.map(slots => [...slots].sort((a, b) => a.start.localeCompare(b.start)));
  for (let midnight = Math.floor(start / day) * day; ; midnight += day) {
    const date = new Date(midnight);
    if (noWork.has(date.toISOString().slice(0, 10))) continue;
    for (const slot of ordered[(date.getUTCDay() + 6) % 7]) {
      const from = Math.max(start, midnight + minutesSinceMidnight(slot.start) * minute);
      const available = midnight + minutesSinceMidnight(slot.end) * minute - from;
      if (available <= 0) continue;
      if (remaining <= available) return new Date(from + remaining - vietnamOffset);
      remaining -= available;
    }
  }
}

export async function ticketDeadlines(connection, requesterId, priority, startedAt) {
  const [[member]] = await connection.execute(
    'SELECT organization_id AS organizationId, customer_tier AS tier FROM organization_members WHERE user_id = ?', [requesterId],
  );
  if (!member) return null;
  const policy = await readPolicy(connection, member.organizationId);
  if (!policy.enabled) return null;
  const targets = (policy.rules[member.tier] ?? policy.rules.STANDARD)[priority];
  return [
    businessDeadline(startedAt, targets.response, policy.week, policy.holidays),
    businessDeadline(startedAt, targets.resolution, policy.week, policy.holidays),
  ];
}
