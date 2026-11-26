import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { insertEvent, ticketsMysql } from './mysql.repository.js';
import { canHandle, isAdmin, isTechnician } from './ticket-access.js';
import { notify } from '../accounts/accounts.routes.js';

async function visibleTicket(req) {
  const result = z.object({ ticketId: z.coerce.number().int().positive().safe() }).safeParse(req.params);
  if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Mã yêu cầu không hợp lệ');
  const { ticketId } = result.data;
  const ticket = await ticketsMysql.find(ticketId, req.account);
  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu');
  return ticket;
}

const commentSelect = `SELECT c.id, u.full_name AS authorName, c.body, c.is_internal AS internal, c.created_at AS createdAt
  FROM ticket_comments c JOIN users u ON u.id = c.author_id`;
const mapComment = row => ({ ...row, id: Number(row.id), internal: Boolean(row.internal) });

export const ticketComments = {
  async list(req, res) {
    const ticket = await visibleTicket(req);
    const { account } = req;
    const [rows] = await pool.execute(
      commentSelect + ` JOIN tickets t ON t.id = c.ticket_id
       WHERE c.ticket_id = ? AND (t.archived_at IS NULL OR ? = 1)
         AND (? = 1 OR (? = 1 AND t.assignee_id = ?) OR (t.requester_id = ? AND c.is_internal = FALSE))
       ORDER BY c.id DESC LIMIT 100`,
      [ticket.id, !!ticket.mergedInto, isAdmin(account), isTechnician(account), account.id, account.id],
    );
    res.json({ success: true, data: rows.reverse().map(mapComment), meta: null });
  },
  async create(req, res) {
    const ticket = await visibleTicket(req);
    const input = z.object({
      body: z.string().trim().min(1).max(5000),
      internal: z.boolean().default(false),
    }).strict().safeParse(req.body);
    if (!input.success) throw new AppError(422, 'VALIDATION_ERROR', 'Nội dung trao đổi không hợp lệ');
    const { body, internal } = input.data;
    if (internal && !canHandle(req.account, ticket)) throw new AppError(403, 'FORBIDDEN');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [current] = await conn.execute('SELECT status, version FROM tickets WHERE id = ? AND archived_at IS NULL FOR UPDATE', [ticket.id]);
      if (!current[0] || Number(current[0].version) !== ticket.version || current[0].status === 'CLOSED') {
        throw new AppError(409, 'CONFLICT', 'Yêu cầu đã thay đổi hoặc đã đóng');
      }
      const [result] = await conn.execute(
        'INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))',
        [ticket.id, req.account.id, body, internal],
      );
      const resumed = !internal && ticket.status === 'PENDING_CUSTOMER' && req.account.id === ticket.requesterId;
      const status = resumed ? 'IN_PROGRESS' : ticket.status;
      if (resumed) {
        await conn.execute(
          'UPDATE tickets SET status = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
          [status, ticket.id],
        );
        await insertEvent(conn, ticket.id, req.account.id, 'STATUS_CHANGED', { status: ticket.status }, { status });
      }
      const recipients = new Set(internal ? [ticket.assigneeId] : [ticket.requesterId, ticket.assigneeId]);
      for (const userId of recipients) {
        if (!userId || userId === req.account.id || (internal && userId === ticket.requesterId)) continue;
        await notify(conn, { userId, ticketId: ticket.id, type: 'COMMENT_ADDED', title: ticket.title, status });
      }
      const [rows] = await conn.execute(commentSelect + ' WHERE c.id = ?', [result.insertId]);
      await conn.commit();
      const data = mapComment(rows[0]);
      if (resumed) data.ticketUpdate = { status, version: ticket.version + 1, at: data.createdAt };
      res.status(201).json({ success: true, data, meta: null });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
