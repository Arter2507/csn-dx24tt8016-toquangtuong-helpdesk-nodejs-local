import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';

export async function accountsDirectory(req, res) {
  const { id, roleCodes } = req.account;
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, u.is_active AS isActive,
       COALESCE(MAX(CASE WHEN r.code = 'TECHNICIAN' THEN r.code END), 'USER') AS role
     FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ? OR EXISTS (
       SELECT 1 FROM tickets t WHERE t.archived_at IS NULL AND (u.id = t.requester_id OR u.id = t.assignee_id)
         AND (t.requester_id = ? OR (? = 1 AND t.assignee_id = ?))
     ) GROUP BY u.id, u.full_name, u.is_active ORDER BY u.id`,
    [id, id, roleCodes.includes('TECHNICIAN'), id],
  );
  res.json({ success: true, data: rows.map(row => ({ ...row, id: Number(row.id), isActive: Boolean(row.isActive) })), meta: null });
}

export const notificationRoutes = Router();
notificationRoutes.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, ticket_id AS ticketId, type, title, body AS status, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`, [req.account.id],
  );
  res.json({ success: true, data: rows.map(row => ({ ...row, id: Number(row.id), ticketId: Number(row.ticketId) || null })), meta: null });
});
notificationRoutes.patch('/read', validate(z.object({
  ids: z.array(z.number().int().positive().safe()).min(1).max(100),
}).strict(), 'body'), async (req, res) => {
  const { ids } = req.validated.body;
  await pool.execute(
    `UPDATE notifications SET read_at = UTC_TIMESTAMP(3)
     WHERE user_id = ? AND read_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
    [req.account.id, ...ids],
  );
  res.status(204).end();
});

export async function notify(conn, { userId, ticketId, type, title, status = '' }) {
  await conn.execute(
    `INSERT INTO notifications (user_id, ticket_id, type, title, body, created_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`, [userId, ticketId, type, title, status],
  );
}

export const technicianCategories = {
  async list(req, res) {
    const [rows] = await pool.execute(
      'SELECT category_id AS id FROM technician_categories WHERE user_id = ? ORDER BY category_id',
      [req.validated.params.id],
    );
    res.json({ success: true, data: rows.map(row => Number(row.id)), meta: null });
  },
  async update(req, res) {
    const { id } = req.validated.params;
    const ids = [...new Set(req.validated.body.categoryIds)];
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [users] = await conn.execute(
        `SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id WHERE u.id = ? AND r.code = 'TECHNICIAN' FOR UPDATE`,
        [id],
      );
      if (!users[0]) throw new AppError(422, 'INVALID_ASSIGNEE', 'Tài khoản cần có vai trò chuyên viên kỹ thuật');
      if (ids.length) {
        const [categories] = await conn.execute(
          `SELECT id FROM categories WHERE id IN (${ids.map(() => '?').join(',')})`, ids,
        );
        if (categories.length !== ids.length) throw new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hợp lệ');
      }
      await conn.execute('DELETE FROM technician_categories WHERE user_id = ?', [id]);
      for (const categoryId of ids) {
        await conn.execute(
          'INSERT INTO technician_categories (user_id, category_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))', [id, categoryId],
        );
      }
      await conn.commit();
      res.json({ success: true, data: ids, meta: null });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
