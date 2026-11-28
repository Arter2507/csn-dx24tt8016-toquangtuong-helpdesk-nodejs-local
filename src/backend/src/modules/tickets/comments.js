import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { insertEvent, ticketsMysql } from './mysql.repository.js';
import { canHandle, isAdmin, isTechnician } from './ticket-access.js';
import { discardNotifications, notify, publishNotifications, publishTickets } from '../notifications/inbox.js';
import { queueStatusMail } from '../notifications/outgoing-mail.js';
import { chatExpiresAt } from './chat-session.js';

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
    const { chatExpiresAt, status, version, firstResponseAt, resolvedAt } = ticket;
    res.json({ success: true, data: rows.reverse().map(mapComment), meta: { chatExpiresAt, status, version, firstResponseAt, resolvedAt } });
  },
  async create(req, res) {
    const ticket = await visibleTicket(req);
    const input = z.object({
      body: z.string().trim().min(1).max(5000),
      internal: z.boolean().default(false),
    }).strict().safeParse(req.body);
    if (!input.success) throw new AppError(422, 'VALIDATION_ERROR', 'Nội dung trao đổi không hợp lệ');
    const { body, internal } = input.data;
    if (!canHandle(req.account, ticket) && (internal || ticket.requesterId !== req.account.id)) {
      throw new AppError(403, 'FORBIDDEN');
    }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [current] = await conn.execute('SELECT status, version, first_response_at AS firstResponseAt, resolved_at AS resolvedAt, closed_at AS closedAt FROM tickets WHERE id = ? AND archived_at IS NULL FOR UPDATE', [ticket.id]);
      if (!current[0] || Number(current[0].version) !== ticket.version) {
        throw new AppError(409, 'CONFLICT', 'Yêu cầu đã thay đổi hoặc đã đóng');
      }
      const expiresAt = chatExpiresAt(current[0]);
      if (expiresAt && expiresAt.getTime() <= Date.now()) throw new AppError(409, 'CHAT_EXPIRED');
      const links = [...new Set(Array.from(body.matchAll(/(?:^|\s)\/knowledge\/(\d+)(?=\s|$)/g), match => match[1]))];
      if (!internal && links.length) {
        const [privateLinks] = await conn.execute(
          `SELECT 1 FROM knowledge_articles WHERE visibility = 'INTERNAL' AND id IN (${links.map(() => '?').join(',')}) LIMIT 1`, links,
        );
        if (privateLinks.length) throw new AppError(422, 'KB_INTERNAL_LINK');
      }
      const [result] = await conn.execute(
        'INSERT INTO ticket_comments (ticket_id, author_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))',
        [ticket.id, req.account.id, body, internal],
      );
      const firstResponse = !internal && !current[0].firstResponseAt && req.account.id !== ticket.requesterId && canHandle(req.account, ticket);
      if (firstResponse) {
        await conn.execute(
          'UPDATE tickets SET first_response_at = (SELECT created_at FROM ticket_comments WHERE id = ?) WHERE id = ?',
          [result.insertId, ticket.id],
        );
      }
      const resumed = !internal && ticket.status === 'PENDING_CUSTOMER' && req.account.id === ticket.requesterId;
      const status = resumed ? 'IN_PROGRESS' : ticket.status;
      if (resumed) {
        await conn.execute(
          'UPDATE tickets SET status = ?, version = version + 1, updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
          [status, ticket.id],
        );
        await insertEvent(conn, ticket.id, req.account.id, 'STATUS_CHANGED', { status: ticket.status }, { status });
        await queueStatusMail(conn, ticket, status);
      }
      const recipients = new Set(internal ? [ticket.assigneeId] : [ticket.requesterId, ticket.assigneeId]);
      for (const userId of recipients) {
        if (!userId || userId === req.account.id || (internal && userId === ticket.requesterId)) continue;
        await notify(conn, { userId, ticketId: ticket.id, type: 'COMMENT_ADDED', title: ticket.title, status });
      }
      const [rows] = await conn.execute(commentSelect + ' WHERE c.id = ?', [result.insertId]);
      await conn.commit();
      publishNotifications(conn);
      if (resumed) publishTickets();
      const data = mapComment(rows[0]);
      if (firstResponse) data.firstResponseAt = data.createdAt;
      if (resumed) data.ticketUpdate = { status, version: ticket.version + 1, at: data.createdAt };
      res.status(201).json({ success: true, data, meta: null });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      discardNotifications(conn);
      conn.release();
    }
  },
};
