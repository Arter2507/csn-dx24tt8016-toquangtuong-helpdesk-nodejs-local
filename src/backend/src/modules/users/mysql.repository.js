import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';

const roleRank = { ADMIN: 3, TECHNICIAN: 2, USER: 1 };

function mapUser(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    fullName: row.fullName,
    email: row.email,
    role: row.role || 'USER',
    isActive: Boolean(row.isActive),
  };
}

const userSelect = `
  SELECT
    u.id,
    u.full_name AS fullName,
    u.email,
    u.is_active AS isActive,
    COALESCE(
      MAX(CASE WHEN r.code = 'ADMIN' THEN 'ADMIN' END),
      MAX(CASE WHEN r.code = 'TECHNICIAN' THEN 'TECHNICIAN' END),
      MAX(CASE WHEN r.code = 'USER' THEN 'USER' END),
      'USER'
    ) AS role
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
`;

async function roleIdByCode(code) {
  const [rows] = await pool.execute('SELECT id FROM roles WHERE code = ?', [code]);
  if (!rows[0]) throw new AppError(500, 'ROLE_MISSING', 'Thiếu vai trò trong CSDL');
  return rows[0].id;
}

export const usersMysql = {
  async list(q) {
    const conditions = [];
    const values = [];
    if (q.search) {
      conditions.push('(LOCATE(?, u.full_name) > 0 OR LOCATE(?, u.email) > 0)');
      values.push(q.search, q.search);
    }
    if (q.filter) {
      conditions.push(`EXISTS (
        SELECT 1 FROM user_roles ur2
        JOIN roles r2 ON r2.id = ur2.role_id
        WHERE ur2.user_id = u.id AND r2.code = ?
      )`);
      values.push(q.filter);
    }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const [countRows] = await pool.execute(
      `SELECT COUNT(DISTINCT u.id) AS total FROM users u${where}`,
      values,
    );
    const sortMap = { id: 'u.id', fullName: 'u.full_name', email: 'u.email' };
    const sortCol = sortMap[q.sortBy] || 'u.id';
    const [rows] = await pool.execute(
      `${userSelect}${where}
       GROUP BY u.id, u.full_name, u.email, u.is_active
       ORDER BY ${sortCol} ${q.sortOrder.toUpperCase()}, u.id ASC
       LIMIT ? OFFSET ?`,
      [...values, q.pageSize, (q.page - 1) * q.pageSize],
    );
    return { items: rows.map(mapUser), total: Number(countRows[0].total) };
  },

  async find(id) {
    const [rows] = await pool.execute(
      `${userSelect} WHERE u.id = ? GROUP BY u.id, u.full_name, u.email, u.is_active`,
      [id],
    );
    return mapUser(rows[0]);
  },

  async create(input) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [dup] = await conn.execute('SELECT id FROM users WHERE email = ?', [input.email]);
      if (dup[0]) throw new AppError(409, 'CONFLICT', 'Email đã tồn tại');
      const [result] = await conn.execute(
        `INSERT INTO users (email, password_hash, full_name, phone, is_active, created_at, updated_at)
         VALUES (?, ?, ?, NULL, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [
          input.email,
          '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          input.fullName,
        ],
      );
      const roleId = await roleIdByCode(input.role);
      await conn.execute(
        'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))',
        [result.insertId, roleId],
      );
      if (input.role === 'USER' || input.role === 'TECHNICIAN' || input.role === 'ADMIN') {
        const userRoleId = await roleIdByCode('USER');
        if (Number(userRoleId) !== Number(roleId)) {
          await conn.execute(
            'INSERT IGNORE INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))',
            [result.insertId, userRoleId],
          );
        }
      }
      await conn.commit();
      return this.find(result.insertId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async update(id, input) {
    const current = await this.find(id);
    if (!current) return null;

    const nextRole = input.role ?? current.role;
    const nextActive = input.isActive ?? current.isActive;
    if (
      current.role === 'ADMIN' &&
      current.isActive &&
      (nextRole !== 'ADMIN' || !nextActive)
    ) {
      const [admins] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE r.code = 'ADMIN' AND u.is_active = 1 AND u.id <> ?`,
        [id],
      );
      if (Number(admins[0].total) === 0) {
        throw new AppError(409, 'LAST_ADMIN', 'Cần giữ ít nhất một quản trị viên hoạt động');
      }
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      if (input.email !== undefined || input.fullName !== undefined || input.isActive !== undefined) {
        if (input.email) {
          const [dup] = await conn.execute('SELECT id FROM users WHERE email = ? AND id <> ?', [
            input.email,
            id,
          ]);
          if (dup[0]) throw new AppError(409, 'CONFLICT', 'Email đã tồn tại');
        }
        await conn.execute(
          `UPDATE users SET
             email = COALESCE(?, email),
             full_name = COALESCE(?, full_name),
             is_active = COALESCE(?, is_active),
             updated_at = UTC_TIMESTAMP(3)
           WHERE id = ?`,
          [
            input.email ?? null,
            input.fullName ?? null,
            input.isActive === undefined ? null : input.isActive,
            id,
          ],
        );
      }
      if (input.role) {
        await conn.execute('DELETE FROM user_roles WHERE user_id = ?', [id]);
        const userRoleId = await roleIdByCode('USER');
        const mainRoleId = await roleIdByCode(input.role);
        await conn.execute(
          'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))',
          [id, userRoleId],
        );
        if (Number(mainRoleId) !== Number(userRoleId)) {
          await conn.execute(
            'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))',
            [id, mainRoleId],
          );
        }
      }
      await conn.commit();
      return this.find(id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};

void roleRank;
