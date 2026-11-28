import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { users } from '../users/users.js';
import { fileType } from '../tickets/attachments.js';
import { usernameInput } from '../auth/username.js';

export const demoProfiles = new Map();
const text = max => z.string().trim().max(max);
const details = z.object({
  fullName: text(150).min(1),
  username: z.union([z.literal(''), usernameInput]).optional(),
  phone: text(30),
  department: text(100),
  jobTitle: text(100),
  location: text(200),
  birthDate: z.union([z.literal(''), z.iso.date().refine(date => date <= new Date().toISOString().slice(0, 10))]),
  bio: text(1000),
}).strict();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2_000_000, files: 1, fields: 0 } }).single('avatar');
const missing = () => new AppError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ');

export function receiveAvatar(req, res, next) {
  upload(req, res, error => {
    if (error) return next(new AppError(422, 'AVATAR_INVALID', 'Chọn ảnh PNG, JPEG hoặc WebP tối đa 2 MB'));
    next();
  });
}

export function avatarImage(file) {
  const image = file?.buffer;
  const mime = image && fileType(image);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime) || mime !== file.mimetype) {
    throw new AppError(422, 'AVATAR_INVALID', 'Chọn ảnh PNG, JPEG hoặc WebP tối đa 2 MB');
  }
  return { image, mime };
}

export function saveAvatar(connection, id, image, mime) {
  return connection.execute(
    'INSERT INTO user_profiles (user_id, details, avatar, avatar_mime) VALUES (?, JSON_OBJECT(), ?, ?) ON DUPLICATE KEY UPDATE avatar = ?, avatar_mime = ?',
    [id, image, mime, image, mime],
  );
}

async function find(req) {
  const demo = !req.account;
  const id = demo ? Number(req.query.account ?? 1) : req.account.id;
  if (demo) {
    const user = users.find(row => row.id === id && row.isActive);
    if (!user) throw missing();
    return { account: { ...user, roleCodes: [...new Set(['USER', user.role])] }, profile: demoProfiles.get(id) ?? {} };
  }
  const [rows] = await pool.execute(
    'SELECT u.phone, p.details, p.avatar_mime AS avatarMime FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.id = ?',
    [id],
  );
  if (!rows[0]) throw missing();
  return { account: { ...req.account, phone: rows[0].phone }, profile: rows[0] };
}

function response({ account, profile }) {
  return {
    ...account, phone: account.phone ?? '',
    details: profile.details ?? {}, avatarMime: profile.avatarMime ?? null,
  };
}

export const profileRoutes = Router();
profileRoutes.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
profileRoutes.get('/', async (req, res) => {
  res.json({ success: true, data: response(await find(req)), meta: null });
});
profileRoutes.patch('/', validate(details, 'body'), async (req, res) => {
  const current = await find(req);
  const { fullName, phone, username, ...fields } = req.validated.body;
  const id = current.account.id;
  if (req.account) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('UPDATE users SET full_name = ?, phone = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND is_active = 1', [fullName, phone || null, id]);
      if (username !== undefined) {
        await connection.execute('UPDATE users SET username = ? WHERE id = ? AND is_active = 1', [username || null, id]);
      }
      await connection.execute(
        'INSERT INTO user_profiles (user_id, details) VALUES (?, ?) ON DUPLICATE KEY UPDATE details = ?',
        [id, JSON.stringify(fields), JSON.stringify(fields)],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') throw new AppError(409, 'USERNAME_TAKEN');
      throw error;
    } finally { connection.release(); }
  } else {
    Object.assign(users.find(row => row.id === id), { fullName, phone });
    demoProfiles.set(id, { ...current.profile, details: fields });
  }
  res.json({ success: true, data: response({
    account: { ...current.account, fullName, phone, ...(req.account && username !== undefined ? { username: username || null } : {}) },
    profile: { ...current.profile, details: fields },
  }), meta: null });
});
profileRoutes.post('/avatar', receiveAvatar, async (req, res) => {
  const current = await find(req);
  const { image, mime } = avatarImage(req.file);
  if (req.account) {
    await saveAvatar(pool, current.account.id, image, mime);
  } else {
    demoProfiles.set(current.account.id, { ...current.profile, avatar: image.toString('base64'), avatarMime: mime });
  }
  res.status(204).end();
});
profileRoutes.get('/avatar', async (req, res) => {
  const current = await find(req);
  let image = current.profile.avatar && Buffer.from(current.profile.avatar, 'base64');
  if (req.account) {
    const [rows] = await pool.execute('SELECT avatar, avatar_mime AS avatarMime FROM user_profiles WHERE user_id = ?', [current.account.id]);
    image = rows[0]?.avatar;
    current.profile.avatarMime = rows[0]?.avatarMime;
  }
  if (!image) throw missing();
  const type = current.profile.avatarMime;
  const extension = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
  if (req.query.download === '1') res.attachment('avatar.' + extension);
  res.set('X-Content-Type-Options', 'nosniff').type(type).send(image);
});
