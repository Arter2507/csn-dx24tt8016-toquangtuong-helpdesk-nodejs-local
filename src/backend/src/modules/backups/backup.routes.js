import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middlewares/validate.js';
import { backups } from './backup.service.js';

const schedule = z.object({
  enabled: z.boolean(),
  intervalMinutes: z.literal([30, 60, 180, 360, 1440]),
}).strict();
const jobId = z.object({ id: z.uuid() });
const accountId = req => req.account?.id ?? 0;

export const backupRoutes = Router();
backupRoutes.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

backupRoutes.get('/', async (req, res) => {
  res.json({ success: true, data: await backups.index(accountId(req)), meta: null });
});
backupRoutes.post('/', async (req, res) => {
  res.status(202).json({ success: true, data: await backups.manual(), meta: null });
});
backupRoutes.put('/schedule', validate(schedule, 'body'), async (req, res) => {
  const data = await backups.saveSchedule(accountId(req), req.validated.body);
  res.json({ success: true, data, meta: null });
});
backupRoutes.post('/schedule/check', async (req, res) => {
  const data = await backups.checkSchedule(accountId(req));
  if (data) return res.status(202).json({ success: true, data, meta: null });
  res.status(204).end();
});
backupRoutes.get('/:id/download', validate(jobId, 'params'), async (req, res) => {
  const file = await backups.download(req.validated.params.id);
  res.download(file.path, file.filename);
});

backupRoutes.post('/:id/restore', validate(jobId, 'params'), validate(
  z.object({ confirmed: z.literal(true) }).strict(), 'body',
), async (req, res) => {
  res.json({ success: true, data: await backups.restore(req.validated.params.id), meta: null });
});
