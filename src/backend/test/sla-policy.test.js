import assert from 'node:assert/strict';
import test from 'node:test';
import { businessDeadline, policySchema, readPolicy } from '../src/modules/sla/policy.js';

test('SLA uses Vietnam working hours, breaks, weekends and holidays', async () => {
  const policy = await readPolicy({ execute: async () => [[]] }, 1);
  const { week } = policy;
  assert.equal(businessDeadline(new Date('2026-11-26T04:30:00Z'), 60, week, []).toISOString(), '2026-11-26T06:30:00.000Z');
  const holidays = [{ date: '2026-11-30', name: 'Holiday' }];
  assert.equal(businessDeadline(new Date('2026-11-27T09:30:00Z'), 60, week, holidays).toISOString(), '2026-12-01T01:30:00.000Z');
  assert.equal(businessDeadline(new Date('2026-11-27T10:00:00Z'), 30, week, []).toISOString(), '2026-11-30T01:30:00.000Z');
  assert.equal(policySchema.safeParse({ ...policy, enabled: true, week: week.map(() => []) }).success, false);
  assert.equal(policySchema.safeParse({ ...policy, holidays: [...holidays, ...holidays] }).success, false);
  week[0].push({ start: '09:00', end: '11:00' });
  assert.equal(policySchema.safeParse(policy).success, false);
});
