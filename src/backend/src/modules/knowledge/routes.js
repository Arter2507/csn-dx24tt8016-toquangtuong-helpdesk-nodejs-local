import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { currentAccount, requireAccount, sameOrigin } from '../auth/auth.routes.js';
import { isAdmin, isTechnician, requireAdmin, requireMember } from '../organizations/permissions.js';
import { idSchema } from '../categories/category.validator.js';

const input = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(12000),
  categoryId: z.number().int().positive().safe(),
  visibility: z.enum(['PUBLIC', 'INTERNAL']),
}).strict();
const select = `SELECT a.id, a.title, a.category_id AS categoryId, c.name AS category,
  a.visibility, a.updated_at AS updatedAt`;
const source = ' FROM knowledge_articles a LEFT JOIN categories c ON c.id = a.category_id';
const send = (res, data, status = 200) => res.status(status).json({ success: true, data, meta: null });
const missing = () => new AppError(404, 'NOT_FOUND');
const scoped = account => account?.status === 'ACTIVE' && account.organizationId && (isAdmin(account) || isTechnician(account));
const dto = row => ({ ...row, id: Number(row.id), categoryId: row.categoryId == null ? null : Number(row.categoryId) });

export const knowledgeRoutes = Router();
knowledgeRoutes.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
knowledgeRoutes.get('/', validate(z.object({
  q: z.string().trim().max(200).default(''),
  categoryId: z.coerce.number().int().positive().safe().optional(),
  publicOnly: z.enum(['true']).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(20),
  before: z.coerce.number().int().positive().safe().optional(),
}), 'query'), async (req, res) => {
  const { q, categoryId, publicOnly, limit, before } = req.validated.query;
  const filters = ['a.archived_at IS NULL'];
  const params = [];
  if (publicOnly || !scoped(await currentAccount(req))) filters.push("a.visibility = 'PUBLIC'");
  if (categoryId) { filters.push('a.category_id = ?'); params.push(categoryId); }
  if (before) { filters.push('a.id < ?'); params.push(before); }
  const tokens = q.match(/[\p{L}\p{N}]+/gu)?.slice(0, 8) ?? [];
  if (tokens.length) {
    const fulltext = 'MATCH(a.title,a.body) AGAINST (? IN NATURAL LANGUAGE MODE)';
    const fallback = tokens.map(() => "(LOCATE(?, a.title) > 0 OR LOCATE(?, a.body) > 0)").join(' AND ');
    filters.push('(' + fulltext + ' > 0 OR (' + fallback + '))');
    params.push(tokens.join(' '), ...tokens.flatMap(token => [token, token]));
  }
  const [rows] = await pool.execute(select + ', LEFT(a.body, 220) AS excerpt' + source +
    ' WHERE ' + filters.join(' AND ') + ' ORDER BY a.id DESC LIMIT ?', [...params, limit]);
  send(res, rows.map(dto));
});

knowledgeRoutes.get('/categories', async (req, res) => {
  const [rows] = await pool.execute('SELECT id, name FROM categories WHERE is_active = 1 ORDER BY name');
  send(res, rows.map(row => ({ id: Number(row.id), name: row.name })));
});

knowledgeRoutes.get('/:id', validate(idSchema, 'params'),
  validate(z.object({ publicOnly: z.enum(['true']).optional() }), 'query'), async (req, res) => {
  const [[row]] = await pool.execute(select + ', a.body' + source + ' WHERE a.id = ? AND a.archived_at IS NULL', [req.validated.params.id]);
  if (!row || (row.visibility === 'INTERNAL' &&
    (req.validated.query.publicOnly || !scoped(await currentAccount(req))))) throw missing();
  send(res, dto(row));
});

knowledgeRoutes.use(sameOrigin, requireAccount, requireMember, requireAdmin);
async function checkCategory(id) {
  const [[row]] = await pool.execute('SELECT id FROM categories WHERE id = ? AND is_active = 1', [id]);
  if (!row) throw new AppError(422, 'INVALID_CATEGORY');
}
knowledgeRoutes.post('/', validate(input, 'body'), async (req, res) => {
  const { title, body, visibility, categoryId } = req.validated.body;
  await checkCategory(categoryId);
  const [result] = await pool.execute('INSERT INTO knowledge_articles (title, body, visibility, category_id) VALUES (?, ?, ?, ?)', [title, body, visibility, categoryId]);
  send(res, { id: Number(result.insertId) }, 201);
});
knowledgeRoutes.put('/:id', validate(idSchema, 'params'), validate(input, 'body'), async (req, res) => {
  const { title, body, visibility, categoryId } = req.validated.body;
  await checkCategory(categoryId);
  const [result] = await pool.execute(
    'UPDATE knowledge_articles SET title = ?, body = ?, visibility = ?, category_id = ?, updated_at = UTC_TIMESTAMP(3) WHERE id = ? AND archived_at IS NULL',
    [title, body, visibility, categoryId, req.validated.params.id],
  );
  if (!result.affectedRows) throw missing();
  send(res, { id: req.validated.params.id });
});
knowledgeRoutes.delete('/:id', validate(idSchema, 'params'), async (req, res) => {
  const [result] = await pool.execute('UPDATE knowledge_articles SET archived_at = UTC_TIMESTAMP(3) WHERE id = ? AND archived_at IS NULL', [req.validated.params.id]);
  if (!result.affectedRows) throw missing();
  res.status(204).end();
});
