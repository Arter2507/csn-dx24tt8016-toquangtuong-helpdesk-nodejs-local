import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { ticketsMysql } from './mysql.repository.js';
import { notify } from '../accounts/accounts.routes.js';

async function visibleTicket(req) {
  const result = z.object({ ticketId: z.coerce.number().int().positive().safe() }).safeParse(req.params);
  if (!result.success) throw new AppError(422, 'VALIDATION_ERROR', 'Mã yêu cầu không hợp lệ');
  const { ticketId } = result.data;
  const ticket = await ticketsMysql.find(ticketId, req.account);
  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu');
  return ticket;
}

const commentSelect = `SELECT c.id, u.full_name AS authorName, c.body, c.created_at AS createdAt
  FROM ticket_comments c JOIN users u ON u.id = c.author_id`;
const mapComment = row => ({ ...row, id: Number(row.id) });

export const ticketComments = {
  async list(req, res) {
    const ticket = await visibleTicket(req);
    const [rows] = await pool.execute(
      commentSelect + ' WHERE c.ticket_id = ? ORDER BY c.id DESC LIMIT 100', [ticket.id],
    );
    res.json({ success: true, data: rows.reverse().map(mapComment), meta: null });
  },
  async create(req, res) {
    const ticket = await visibleTicket(req);
    const input = z.object({ body: z.string().trim().min(1).max(5000) }).strict().safeParse(req.body);
    if (!input.success) throw new AppError(422, 'VALIDATION_ERROR', 'Nội dung trao đổi không hợp lệ');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [current] = await conn.execute('SELECT status, version FROM tickets WHERE id = ? AND archived_at IS NULL FOR UPDATE', [ticket.id]);
      if (!current[0] || Number(current[0].version) !== ticket.version || current[0].status === 'CLOSED') {
        throw new AppError(409, 'CONFLICT', 'Yêu cầu đã thay đổi hoặc đã đóng');
      }
      const [result] = await conn.execute(
        'INSERT INTO ticket_comments (ticket_id, author_id, body, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3))',
        [ticket.id, req.account.id, input.data.body],
      );
      const recipients = new Set([ticket.requesterId, ticket.assigneeId]);
      for (const userId of recipients) {
        if (!userId || userId === req.account.id) continue;
        await notify(conn, { userId, ticketId: ticket.id, type: 'COMMENT_ADDED', title: ticket.title, status: ticket.status });
      }
      const [rows] = await conn.execute(commentSelect + ' WHERE c.id = ?', [result.insertId]);
      await conn.commit();
      res.status(201).json({ success: true, data: mapComment(rows[0]), meta: null });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
