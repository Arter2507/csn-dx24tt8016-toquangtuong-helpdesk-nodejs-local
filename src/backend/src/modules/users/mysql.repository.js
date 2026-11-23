import { hash } from 'bcryptjs';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';

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

async function roleIdByCode(code, conn) {
  const [rows] = await conn.execute('SELECT id FROM roles WHERE code = ?', [code]);
  if (!rows[0]) throw new AppError(500, 'ROLE_MISSING', 'Thiếu vai trò trong CSDL');
  return rows[0].id;
}

async function findUser(id, executor) {
  const [rows] = await executor.execute(
    `${userSelect} WHERE u.id = ? GROUP BY u.id, u.full_name, u.email, u.is_active`,
    [id],
  );
  return mapUser(rows[0]);
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

  find(id) {
    return findUser(id, pool);
  },

  async create(input) {
    const passwordHash = await hash(input.password, 12);
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
          passwordHash,
          input.fullName,
        ],
      );
      const roleId = await roleIdByCode(input.role, conn);
      await conn.execute(
        'INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, UTC_TIMESTAMP(3))',
        [result.insertId, roleId],
      );
      if (input.role === 'USER' || input.role === 'TECHNICIAN' || input.role === 'ADMIN') {
        const userRoleId = await roleIdByCode('USER', conn);
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

  async update(id, input, files, account) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Serialize changes that could remove the last active administrator.
      await conn.execute("SELECT id FROM roles WHERE code = 'ADMIN' FOR UPDATE");
      const current = await findUser(id, conn);
      if (!current) {
        await conn.rollback();
        return null;
      }
      if (account?.id === id && input.email !== undefined && input.email !== current.email) {
        throw new AppError(403, 'FORBIDDEN', 'Không thể tự đổi email quản trị');
      }
      if (current.role === 'ADMIN' && current.isActive &&
        ((input.role && input.role !== 'ADMIN') || input.isActive === false)) {
        const [admins] = await conn.execute(
          `SELECT u.id FROM users u
           JOIN user_roles ur ON ur.user_id = u.id
           JOIN roles r ON r.id = ur.role_id
           WHERE r.code = 'ADMIN' AND u.is_active = 1 AND u.id <> ? LIMIT 1`,
          [id],
        );
        if (!admins[0]) throw new AppError(409, 'LAST_ADMIN', 'Cần giữ ít nhất một quản trị viên hoạt động');
      }
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
        const userRoleId = await roleIdByCode('USER', conn);
        const mainRoleId = await roleIdByCode(input.role, conn);
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
      if (input.isActive === false) {
        await conn.execute(
          'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL',
          [id],
        );
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
