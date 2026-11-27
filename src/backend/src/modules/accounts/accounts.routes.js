import { AppError } from '../../shared/errors.js';
import { pool } from '../../database/pool.js';
import { isTechnician } from '../organizations/permissions.js';
import { manageableMember, manageOrganization, members } from '../organizations/members.repository.js';

export async function accountsDirectory(req, res) {
  const { id, organizationId } = req.account;
  const [rows] = await pool.execute(
    `SELECT u.id, u.full_name AS fullName, u.is_active AS isActive, m.role, COALESCE(unit.name, m.department) AS department, m.position
     FROM users u JOIN organization_members m ON m.user_id = u.id
     LEFT JOIN organization_units unit ON unit.organization_id = m.organization_id AND unit.id = m.unit_id
     WHERE m.organization_id = ? AND (u.id = ? OR EXISTS (
       SELECT 1 FROM tickets t WHERE t.archived_at IS NULL AND (u.id = t.requester_id OR u.id = t.assignee_id)
         AND (t.requester_id = ? OR (? = 1 AND t.assignee_id = ?))
     )) ORDER BY u.id`,
    [organizationId, id, id, isTechnician(req.account), id],
  );
  res.json({ success: true, data: rows.map(row => ({ ...row, id: Number(row.id), isActive: Boolean(row.isActive) })), meta: null });
}

export const technicianCategories = {
  async list(req, res) {
    if (!await members.find(req.validated.params.id, req.account)) throw new AppError(404, 'NOT_FOUND');
    const [rows] = await pool.execute(
      'SELECT category_id AS id FROM technician_categories WHERE user_id = ? ORDER BY category_id',
      [req.validated.params.id],
    );
    res.json({ success: true, data: rows.map(row => Number(row.id)), meta: null });
  },
  async update(req, res) {
    const { id } = req.validated.params;
    const ids = [...new Set(req.validated.body.categoryIds)];
    await manageOrganization(req.account, async (conn, actor, organization) => {
      const member = await manageableMember(conn, actor, id, organization.id);
      if (member.role !== 'TECHNICIAN') throw new AppError(422, 'INVALID_ASSIGNEE', 'Tài khoản cần có vai trò chuyên viên kỹ thuật');
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
    });
    res.json({ success: true, data: ids, meta: null });
  },
};
