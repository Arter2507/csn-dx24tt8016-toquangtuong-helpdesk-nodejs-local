import { AppError } from '../../shared/errors.js';
import { pool } from '../../database/pool.js';

const accountColumns = 'u.id, u.email, u.full_name AS fullName, u.is_active AS isActive';

async function account(where, values) {
  const [rows] = await pool.execute(
    `SELECT ${accountColumns}, r.code AS role
     FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
     WHERE ${where} AND u.is_active = 1 ORDER BY r.code`,
    values,
  );
  if (!rows.length) return null;
  const { id, email, fullName } = rows[0];
  return { id: Number(id), email, fullName, roleCodes: rows.map(row => row.role), isActive: true };
}

export const authRepository = {
  async credentials(email) {
    const [rows] = await pool.execute('SELECT id, password_hash AS passwordHash FROM users WHERE email = ? AND is_active = 1', [email]);
    return rows[0];
  },
  account(id) {
    return account('u.id = ?', [id]);
  },
  session(id, userId) {
    return account(`u.id = ? AND EXISTS (
      SELECT 1 FROM auth_sessions s WHERE s.id = ? AND s.user_id = u.id
        AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(3)
    )`, [userId, id]);
  },
  async create(userId, passwordHash, hash, days) {
    const [result] = await pool.execute(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, expires_at, created_at, updated_at)
       SELECT id, ?, TIMESTAMPADD(DAY, ?, UTC_TIMESTAMP(3)), UTC_TIMESTAMP(3), UTC_TIMESTAMP(3)
       FROM users WHERE id = ? AND is_active = 1 AND password_hash = ?`, [hash, days, userId, passwordHash],
    );
    return result.affectedRows ? String(result.insertId) : null;
  },
  async rotate(previous, replacement) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT s.id, s.user_id AS userId FROM auth_sessions s JOIN users u ON u.id = s.user_id
         WHERE s.refresh_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(3)
           AND u.is_active = 1 FOR UPDATE`, [previous],
      );
      if (rows[0]) {
        await conn.execute('UPDATE auth_sessions SET refresh_token_hash = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?', [replacement, rows[0].id]);
      }
      await conn.commit();
      return rows[0];
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
  async revoke(hash, session) {
    if (!hash && !session) return;
    await pool.execute(
      `UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE revoked_at IS NULL AND (refresh_token_hash = ? OR (id = ? AND user_id = ?))`,
      [hash ?? null, session?.id ?? null, session?.userId ?? null],
    );
  },
  async updateProfile(id, input) {
    try {
      await pool.execute('UPDATE users SET full_name = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND is_active = 1', [input.fullName, id]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'CONFLICT', 'Email đã tồn tại');
      throw error;
    }
    return this.account(id);
  },
  async changePassword(id, currentHash, newHash) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        'UPDATE users SET password_hash = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND is_active = 1 AND password_hash = ?',
        [newHash, id, currentHash],
      );
      if (result.affectedRows) {
        await conn.execute(
          'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL',
          [id],
        );
      }
      await conn.commit();
      return Boolean(result.affectedRows);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
