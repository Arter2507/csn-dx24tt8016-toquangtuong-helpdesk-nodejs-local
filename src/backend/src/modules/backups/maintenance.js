import { AppError } from '../../shared/errors.js';

let paused = false;
const writes = new Set();
const busy = () => new AppError(409, 'RESTORE_BUSY', 'Đang khôi phục dữ liệu');

export function guardWrites(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
    (req.method === 'POST' && /^\/backups\/[^/]+\/restore\/?$/i.test(req.path))) return next();
  if (paused) return next(busy());
  let finish;
  const active = new Promise(resolve => { finish = resolve; });
  writes.add(active);
  const release = () => { writes.delete(active); finish(); };
  res.once('finish', release);
  res.once('close', release);
  next();
}

export async function duringRestore(operation) {
  if (paused) throw busy();
  paused = true;
  try {
    await Promise.all(writes);
    return await operation();
  } finally {
    paused = false;
  }
}
