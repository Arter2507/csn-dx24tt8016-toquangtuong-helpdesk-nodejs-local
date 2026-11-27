import { pool } from '../../database/pool.js';
import { discardNotifications, notify, publishNotifications } from './inbox.js';

export const warningMinutes = 30;
const upcoming = (due, warning) => `(${due} > UTC_TIMESTAMP(3)
  AND ${due} <= UTC_TIMESTAMP(3) + INTERVAL ${warningMinutes} MINUTE
  AND NOT (${warning} <=> ${due}))`;
const response = `first_response_at IS NULL AND ${upcoming('response_due_at', 'response_warning_due_at')}`;
const resolution = `resolved_at IS NULL AND ${upcoming('resolution_due_at', 'resolution_warning_due_at')}`;

export async function warnUpcomingSla() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, title, assignee_id AS assigneeId, requester_id AS requesterId,
        (${response}) AS responseSoon, (${resolution}) AS resolutionSoon
       FROM tickets WHERE archived_at IS NULL AND status NOT IN ('RESOLVED', 'CLOSED')
         AND ((${response}) OR (${resolution}))
       ORDER BY id LIMIT 50 FOR UPDATE SKIP LOCKED`,
    );
    for (const ticket of rows) {
      const [recipients] = await conn.execute(
        `SELECT u.id FROM organization_members m JOIN users u ON u.id = m.user_id
         WHERE m.organization_id = (SELECT organization_id FROM organization_members WHERE user_id = ?)
           AND u.is_active = 1 AND u.password_hash IS NOT NULL
           AND (u.id = ? OR m.role IN ('ADMIN', 'OWNER'))`,
        [ticket.requesterId, ticket.assigneeId],
      );
      const assignee = recipients.find(recipient => Number(recipient.id) === Number(ticket.assigneeId));
      for (const user of assignee ? [assignee] : recipients) {
        const item = { ticketId: ticket.id, title: ticket.title, userId: user.id };
        if (ticket.responseSoon) await notify(conn, { ...item, type: 'SLA_RESPONSE_DUE' });
        if (ticket.resolutionSoon) await notify(conn, { ...item, type: 'SLA_RESOLUTION_DUE' });
      }
      await conn.execute(
        `UPDATE tickets SET response_warning_due_at = IF(?, response_due_at, response_warning_due_at),
         resolution_warning_due_at = IF(?, resolution_due_at, resolution_warning_due_at) WHERE id = ?`,
        [Boolean(ticket.responseSoon), Boolean(ticket.resolutionSoon), ticket.id],
      );
    }
    await conn.commit();
    publishNotifications(conn);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    discardNotifications(conn);
    conn.release();
  }
}
