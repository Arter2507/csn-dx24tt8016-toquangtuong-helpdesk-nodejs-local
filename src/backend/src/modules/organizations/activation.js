import { createHash, randomBytes } from 'node:crypto';
import { AppError } from '../../shared/errors.js';

export const activationHash = token => createHash('sha256').update(token).digest('hex');
export const invalidActivation = () => new AppError(422, 'INVITATION_INVALID', 'Liên kết kích hoạt đã hết hạn hoặc đã được dùng');

export async function issueInvitation(connection, memberId) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 86_400_000);
  const [result] = await connection.execute(
    'UPDATE users SET activation_token_hash = ?, activation_expires_at = ? WHERE id = ? AND is_active = 1 AND password_hash IS NULL',
    [activationHash(token), expiresAt, memberId],
  );
  if (!result.affectedRows) throw invalidActivation();
  return { path: '/activate#token=' + token, expiresAt };
}
