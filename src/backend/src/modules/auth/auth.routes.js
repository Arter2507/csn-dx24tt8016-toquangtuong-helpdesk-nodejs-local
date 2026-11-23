import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { config } from '../../configs/env.js';
import { authRepository } from './auth.repository.js';

const accessCookie = 'tram_meo_access';
const refreshCookie = 'tram_meo_refresh';
const accessSeconds = 15 * 60;
const secret = new TextEncoder().encode(config.auth.secret);
const claims = { issuer: 'tram-meo', audience: 'tram-meo-web', algorithms: ['HS256'] };
const attempts = new Map();
if (config.dataSource === 'mysql' && (secret.length < 32 || !Number.isSafeInteger(config.auth.refreshDays)
  || config.auth.refreshDays < 1 || config.auth.refreshDays > 30)) {
  throw new Error('MySQL cần JWT_SECRET ít nhất 32 byte và REFRESH_TOKEN_DAYS từ 1 đến 30');
}
const password = z.string().min(1).refine(value => Buffer.byteLength(value) <= 72);
export const newPassword = password.refine(value => value.length >= 12);
const digest = value => createHash('sha256').update(value).digest('hex');
const refreshToken = () => randomBytes(32).toString('hex');
const unauthorized = () => new AppError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập');
const forbidden = () => new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');

const cookies = { httpOnly: true, secure: config.auth.secureCookies, sameSite: 'strict' };
const accessOptions = { ...cookies, path: '/api/v1' };
const refreshOptions = { ...cookies, path: '/api/v1/auth' };

function cookie(req, name) {
  return req.get('Cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(name + '='))?.slice(name.length + 1);
}

function readRefresh(req) {
  const token = cookie(req, refreshCookie);
  return token && /^[a-f0-9]{64}$/.test(token) ? digest(token) : null;
}

async function readAccess(req) {
  const token = cookie(req, accessCookie);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret, claims);
    if (/^\d+$/.test(payload.sid) && /^\d+$/.test(payload.sub)) {
      return { id: payload.sid, userId: payload.sub };
    }
  } catch {
    // A missing or expired session is handled by the refresh endpoint.
  }
  return null;
}

async function issue(res, sessionId, account, token) {
  const access = await new SignJWT({ sid: String(sessionId) })
    .setProtectedHeader({ alg: 'HS256' }).setIssuer(claims.issuer).setAudience(claims.audience)
    .setSubject(String(account.id)).setIssuedAt().setExpirationTime('15m').sign(secret);
  res.cookie(accessCookie, access, { ...accessOptions, maxAge: accessSeconds * 1000 });
  res.cookie(refreshCookie, token, { ...refreshOptions, maxAge: config.auth.refreshDays * 86400000 });
  res.json({ success: true, data: account, meta: null });
}

function clearCookies(res) {
  res.clearCookie(accessCookie, accessOptions);
  res.clearCookie(refreshCookie, refreshOptions);
}

export function sameOrigin(req, res, next) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin') !== config.auth.origin) {
    return next(forbidden());
  }
  next();
}

export async function requireAccount(req, res, next) {
  const session = await readAccess(req);
  if (!session) throw unauthorized();
  const user = await authRepository.session(session.id, session.userId);
  if (!user) throw unauthorized();
  req.account = user;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.account.roleCodes.includes('ADMIN')) return next(forbidden());
  next();
}

export const authRoutes = Router();
authRoutes.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

authRoutes.post('/login', validate(z.object({ email: z.email().max(254), password }).strict(), 'body'), async (req, res) => {
  const now = Date.now();
  for (const [address, attempt] of attempts) if (attempt.until <= now) attempts.delete(address);
  const address = req.ip;
  const attempt = attempts.get(address) ?? { count: 0, until: now + accessSeconds * 1000 };
  if (attempt.count >= 30) {
    res.set('Retry-After', String(Math.ceil((attempt.until - now) / 1000)));
    throw new AppError(429, 'LOGIN_LIMIT', 'Bạn đã thử đăng nhập quá nhiều lần');
  }
  attempt.count++;
  attempts.set(address, attempt);
  const { email, password: supplied } = req.validated.body;
  const credentials = await authRepository.credentials(email.toLowerCase());
  const matches = await compare(supplied, credentials?.passwordHash ?? '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');
  const account = matches && credentials ? await authRepository.account(credentials.id) : null;
  if (!account) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu chưa đúng');
  const refresh = refreshToken();
  const session = await authRepository.create(account.id, credentials.passwordHash, digest(refresh), config.auth.refreshDays);
  if (!session) throw unauthorized();
  attempt.count--;
  await issue(res, session, account, refresh);
});

authRoutes.post('/refresh', async (req, res) => {
  const current = readRefresh(req);
  if (!current) throw unauthorized();
  const refresh = refreshToken();
  const session = await authRepository.rotate(current, digest(refresh));
  if (!session) throw unauthorized();
  const account = await authRepository.session(session.id, session.userId);
  if (!account) throw unauthorized();
  await issue(res, session.id, account, refresh);
});

authRoutes.post('/logout', async (req, res) => {
  await authRepository.revoke(readRefresh(req), await readAccess(req));
  clearCookies(res);
  res.status(204).end();
});

authRoutes.get('/me', requireAccount, (req, res) => {
  res.json({ success: true, data: req.account, meta: null });
});

authRoutes.patch('/me', requireAccount, validate(z.object({
  fullName: z.string().trim().min(1).max(150),
  email: z.email().max(254).transform(value => value.toLowerCase()),
}).strict(), 'body'), async (req, res) => {
  if (req.validated.body.email !== req.account.email) throw forbidden();
  const account = await authRepository.updateProfile(req.account.id, req.validated.body);
  if (!account) throw unauthorized();
  res.json({ success: true, data: account, meta: null });
});

authRoutes.patch('/me/password', requireAccount, validate(z.object({
  currentPassword: password,
  newPassword,
}).strict(), 'body'), async (req, res) => {
  const { currentPassword, newPassword: nextPassword } = req.validated.body;
  const credentials = await authRepository.credentials(req.account.email);
  if (!credentials || !await compare(currentPassword, credentials.passwordHash)) {
    throw new AppError(422, 'INVALID_CREDENTIALS', 'Mật khẩu hiện tại chưa đúng');
  }
  if (!await authRepository.changePassword(req.account.id, credentials.passwordHash, await hash(nextPassword, 12))) {
    throw new AppError(409, 'CONFLICT', 'Thông tin tài khoản đã thay đổi');
  }
  clearCookies(res);
  res.status(204).end();
});
