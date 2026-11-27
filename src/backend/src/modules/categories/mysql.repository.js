import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { assertCategoryTree } from './hierarchy.js';
const columns = { id: 'id', code: 'code', name: 'name' };
const select = 'SELECT id, code, name, parent_id AS parentId, is_active AS isActive FROM categories';
const normalize = row => row && ({
  ...row, id: Number(row.id), parentId: row.parentId == null ? null : Number(row.parentId), isActive: Boolean(row.isActive),
});
async function changeCatalog(change) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(select + ' ORDER BY id FOR UPDATE');
    const result = await change(connection, rows.map(normalize));
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
export const mysqlRepository = {
  batchState(ids, isActive) {
    return changeCatalog(async (connection, rows) => {
      const selected = new Set(ids);
      if (rows.filter(row => selected.has(row.id)).length !== ids.length) throw new AppError(404, 'RECORD_MISSING');
      assertCategoryTree(rows.map(row => selected.has(row.id) ? { ...row, isActive } : row));
      const placeholders = ids.map(() => '?').join(',');
      await connection.execute(
        `UPDATE categories SET is_active = ?, updated_at = UTC_TIMESTAMP(3)
         WHERE id IN (${placeholders}) AND is_active <> ?`, [isActive, ...ids, isActive],
      );
      return ids.length;
    });
  },
  async list(q) {
    const conditions = []; const values = [];
    if (q.search) { conditions.push('(LOCATE(?, code) > 0 OR LOCATE(?, name) > 0)'); values.push(q.search, q.search); }
    if (q.isActive !== undefined) { conditions.push('is_active = ?'); values.push(q.isActive === 'true'); }
    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const [count] = await pool.execute('SELECT COUNT(*) AS total FROM categories' + where, values);
    const [rows] = await pool.execute(select + where + ' ORDER BY ' + columns[q.sortBy] + ' ' + q.sortOrder.toUpperCase() + ', id ASC LIMIT ? OFFSET ?', [...values, q.pageSize, (q.page - 1) * q.pageSize]);
    return { items: rows.map(normalize), total: count[0].total };
  },
  async find(id) { const [rows] = await pool.execute(select + ' WHERE id = ?', [id]); return normalize(rows[0]); },
  create(data) {
    return changeCatalog(async (connection, rows) => {
      const row = { code: data.code, name: data.name, parentId: data.parentId ?? null, isActive: true };
      assertCategoryTree([...rows, { ...row, id: -1 }]);
      const [result] = await connection.execute(
        'INSERT INTO categories (code, name, parent_id, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))',
        [row.code, row.name, row.parentId],
      );
      return { ...row, id: Number(result.insertId) };
    });
  },
  update(id, data) {
    return changeCatalog(async (connection, rows) => {
      const row = rows.find(item => item.id === id);
      if (!row) return null;
      Object.assign(row, data);
      assertCategoryTree(rows);
      await connection.execute(
        'UPDATE categories SET name = ?, parent_id = ?, is_active = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?',
        [row.name, row.parentId, row.isActive, id],
      );
      return row;
    });
  },
};
