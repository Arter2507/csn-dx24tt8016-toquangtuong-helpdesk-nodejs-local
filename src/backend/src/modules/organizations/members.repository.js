import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { issueInvitation } from './activation.js';
import { canManage, forbidden, isAdmin } from './permissions.js';

const statusSql = `CASE
  WHEN u.is_active = 0 THEN 'DISABLED'
  WHEN u.password_hash IS NULL THEN 'PENDING_ACTIVATION'
  ELSE 'ACTIVE'
END`;
const memberFrom = 'FROM organization_members m JOIN users u ON u.id = m.user_id';
const memberSelect = `SELECT u.id, u.email, u.full_name AS fullName, COALESCE(u.phone,'') AS phone,
  m.employee_code AS employeeCode, m.department, m.position, m.role, m.joined_at AS joinedAt,
  ${statusSql} AS status, u.activation_expires_at AS invitationExpiresAt,
  EXISTS(SELECT 1 FROM user_profiles p WHERE p.user_id = u.id AND p.avatar IS NOT NULL) AS hasAvatar
  ${memberFrom}`;

function view(row) {
  return { ...row, id: Number(row.id), isActive: row.status === 'ACTIVE', hasAvatar: Boolean(row.hasAvatar) };
}

async function findMember(connection, id, organizationId) {
  const [[member]] = await connection.execute(memberSelect + ' WHERE u.id = ? AND m.organization_id = ?', [id, organizationId]);
  return member ? view(member) : null;
}

// Serialize staff mutations and recheck the actor under the same lock as the target.
export async function manageOrganization(account, action) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[organization]] = await conn.execute('SELECT id, owner_id AS ownerId FROM organizations WHERE id = ? FOR UPDATE', [account.organizationId]);
    if (!organization) throw forbidden();
    const actor = await findMember(conn, account.id, organization.id);
    if (actor?.status !== 'ACTIVE' || !isAdmin(actor)) throw forbidden();
    const result = await action(conn, actor, organization);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'MEMBER_DUPLICATE', 'Email hoặc mã nhân viên đã được sử dụng');
    throw error;
  } finally {
    conn.release();
  }
}

export async function manageableMember(connection, actor, id, organizationId) {
  const member = await findMember(connection, id, organizationId);
  if (!member) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy nhân sự');
  if (!canManage(actor, member.role)) throw forbidden();
  return member;
}

async function revokeSessions(connection, id) {
  await connection.execute(
    'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3) WHERE user_id = ? AND revoked_at IS NULL',
    [id],
  );
}

export const members = {
  async list(query, account) {
    const clauses = ['m.organization_id = ?'];
    const args = [account.organizationId];
    if (query.search) {
      clauses.push('(LOCATE(?, u.full_name) OR LOCATE(?, u.email) OR LOCATE(?, m.employee_code))');
      args.push(query.search, query.search, query.search);
    }
    if (query.filter) {
      clauses.push('m.role = ?');
      args.push(query.filter);
    }
    if (query.status) {
      clauses.push(statusSql + ' = ?');
      args.push(query.status);
    }
    const where = ' WHERE ' + clauses.join(' AND ');
    const sort = { id: 'u.id', fullName: 'u.full_name', email: 'u.email' }[query.sortBy] ?? 'u.id';
    const direction = query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const [[count]] = await pool.execute('SELECT COUNT(*) AS total ' + memberFrom + where, args);
    const [rows] = await pool.execute(
      memberSelect + where + ` ORDER BY ${sort} ${direction}, u.id LIMIT ? OFFSET ?`,
      [...args, query.pageSize, (query.page - 1) * query.pageSize],
    );
    return { items: rows.map(view), total: Number(count.total) };
  },
  find(id, account) {
    return findMember(pool, id, account.organizationId);
  },
  create(data, files, account) {
    return manageOrganization(account, async (conn, actor, organization) => {
      if (!canManage(actor, data.role)) throw forbidden();
      const [[existing]] = await conn.execute('SELECT id, is_active AS isActive, password_hash IS NOT NULL AS activated FROM users WHERE email = ? FOR UPDATE', [data.email]);
      let id = existing?.id;
      if (existing) {
        if (await findMember(conn, id, organization.id) || !existing.isActive || !existing.activated) {
          throw new AppError(409, 'MEMBER_DUPLICATE', 'Email đã được dùng trong tổ chức');
        }
        await conn.execute('UPDATE users SET full_name = ?, phone = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ?', [data.fullName, data.phone || null, id]);
        await revokeSessions(conn, id);
      } else {
        const [result] = await conn.execute(
          `INSERT INTO users (email, full_name, phone, is_active, created_at, updated_at)
           VALUES (?, ?, ?, 1, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
          [data.email, data.fullName, data.phone || null],
        );
        id = result.insertId;
      }
      await conn.execute(
        `INSERT INTO organization_members (organization_id, user_id, employee_code, department, position, role, joined_at)
         VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
        [organization.id, id, data.employeeCode || null, data.department, data.position, data.role],
      );
      const invitation = existing ? null : await issueInvitation(conn, id);
      return { ...(await findMember(conn, id, organization.id)), invitation };
    });
  },
  update(id, changes, files, account) {
    return manageOrganization(account, async (conn, actor, organization) => {
      const member = await manageableMember(conn, actor, id, organization.id);
      const next = { ...member, ...changes };
      if (!canManage(actor, next.role)) throw forbidden();
      const enabled = changes.isActive ?? (member.status !== 'DISABLED');
      const emailChanged = next.email !== member.email;
      const revokeInvitation = emailChanged || !enabled;
      await conn.execute(
        `UPDATE users SET email = ?, full_name = ?, phone = ?, is_active = ?,
          activation_token_hash = IF(?, NULL, activation_token_hash),
          activation_expires_at = IF(?, NULL, activation_expires_at), updated_at = UTC_TIMESTAMP(3)
         WHERE id = ?`,
        [next.email, next.fullName, next.phone || null, enabled, revokeInvitation, revokeInvitation, id],
      );
      await conn.execute(
        'UPDATE organization_members SET employee_code = ?, department = ?, position = ?, role = ? WHERE user_id = ? AND organization_id = ?',
        [next.employeeCode || null, next.department, next.position, next.role, id, organization.id],
      );
      if (emailChanged || !enabled || next.role !== member.role) await revokeSessions(conn, id);
      return findMember(conn, id, organization.id);
    });
  },
  invite(id, account) {
    return manageOrganization(account, async (conn, actor, organization) => {
      const member = await manageableMember(conn, actor, id, organization.id);
      if (member.status !== 'PENDING_ACTIVATION') throw new AppError(409, 'INVITATION_UNAVAILABLE', 'Nhân sự không ở trạng thái chờ kích hoạt');
      return issueInvitation(conn, id);
    });
  },
};
