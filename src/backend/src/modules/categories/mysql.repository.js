import { pool } from '../../database/pool.js';
const columns = { id: 'id', code: 'code', name: 'name' };
const select = 'SELECT id, code, name, is_active AS isActive FROM categories';
const normalize = row => row && ({ ...row, isActive: Boolean(row.isActive) });
export const mysqlRepository = {
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
  async create(data) { const [result] = await pool.execute('INSERT INTO categories (code, name, is_active, created_at, updated_at) VALUES (?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))', [data.code, data.name]); return this.find(result.insertId); },
  async update(id, data) { const fields = []; const values = []; if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); } if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive); } await pool.execute('UPDATE categories SET ' + fields.join(', ') + ', updated_at = UTC_TIMESTAMP(3) WHERE id = ?', [...values, id]); return this.find(id); }
};
