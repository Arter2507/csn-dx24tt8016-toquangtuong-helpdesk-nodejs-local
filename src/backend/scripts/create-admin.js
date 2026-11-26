import { z } from 'zod';
import { hash } from 'bcryptjs';
import { pool } from '../src/database/pool.js';
import { newPassword } from '../src/modules/auth/auth.routes.js';

const { email, fullName, password } = z.object({
  email: z.email().max(254),
  fullName: z.string().trim().min(1).max(150),
  password: newPassword,
}).parse({
  email: process.env.APP_ADMIN_EMAIL?.trim().toLowerCase(),
  fullName: process.env.APP_ADMIN_NAME,
  password: process.env.APP_ADMIN_PASSWORD,
});

const connection = await pool.getConnection();
try {
  const passwordHash = await hash(password, 12);
  await connection.beginTransaction();
  const [[organization]] = await connection.execute('SELECT owner_id AS ownerId FROM organizations WHERE id = 1 FOR UPDATE');
  if (!organization || organization.ownerId) throw new Error('Tổ chức chưa được khởi tạo hoặc đã có Chủ sở hữu.');
  const [{ insertId }] = await connection.execute(
    'INSERT INTO users (email, full_name, password_hash, created_at, updated_at) VALUES (?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))',
    [email, fullName, passwordHash],
  );
  await connection.execute("INSERT INTO organization_members (user_id, organization_id, role, joined_at) VALUES (?, 1, 'OWNER', UTC_TIMESTAMP(3))", [insertId]);
  await connection.execute('UPDATE organizations SET owner_id = ? WHERE id = 1', [insertId]);
  await connection.commit();
  console.log('Đã tạo Chủ sở hữu.');
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await pool.end();
}
