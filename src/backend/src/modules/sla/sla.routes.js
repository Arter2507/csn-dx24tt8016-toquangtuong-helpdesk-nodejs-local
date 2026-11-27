import { Router } from 'express';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { manageOrganization } from '../organizations/members.repository.js';
import { policySchema, readPolicy } from './policy.js';

export const slaRoutes = Router();
slaRoutes.get('/', async (req, res) => {
  const data = await readPolicy(pool, req.account.organizationId);
  res.json({ success: true, data, meta: null });
});
slaRoutes.put('/', validate(policySchema, 'body'), async (req, res) => {
  const policy = req.validated.body;
  await manageOrganization(req.account, async (conn, actor, org) => {
    await conn.execute(
      'INSERT INTO sla_settings (organization_id, policy) VALUES (?, ?) ON DUPLICATE KEY UPDATE policy = ?',
      [org.id, JSON.stringify(policy), JSON.stringify(policy)],
    );
  });
  res.json({ success: true, data: policy, meta: null });
});
