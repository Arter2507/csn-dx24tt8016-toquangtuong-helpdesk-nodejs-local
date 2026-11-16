import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { AppError } from './errors.js';

const schema = z.object({ ids: z.array(z.number().int().positive().safe()).min(1).max(100) }).strict();

export function archiveRows(rows, ids) {
  const selected = new Set(ids);
  const matching = rows.filter(row => selected.has(row.id));
  if (matching.length !== selected.size) throw new AppError(404, 'RECORD_MISSING');
  const pending = matching.filter(row => !row.archivedAt);
  const now = new Date().toISOString();
  for (const row of pending) row.archivedAt = now;
  return pending.length;
}

export function archiveRoute(router, archive) {
  router.post('/archive', validate(schema, 'body'), async (req, res) => {
    const count = await archive(req.validated.body.ids);
    res.json({ success: true, data: { count }, meta: null });
  });
}
