import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { AppError } from './errors.js';
import { idSchema, listSchema } from '../modules/categories/category.validator.js';

export function demoResourceRoutes({ rows, input, updateInput, create, update, searchable, filters }) {
  const router = Router();
  const querySchema = listSchema.extend({
    sortBy: z.enum(['id', ...searchable]).default('id'),
    filter: z.enum(filters.values).optional()
  }).omit({ isActive: true });
  function find(id) {
    const row = rows.find(item => item.id === id);
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
    return row;
  }
  router.get('/', validate(querySchema, 'query'), (req, res) => {
    const { search, page, pageSize, sortBy, sortOrder, filter } = req.validated.query;
    const keyword = search.toLocaleLowerCase();
    const matches = rows.filter(row => (!filter || String(row[filters.field]) === filter) &&
      searchable.some(field => row[field].toLocaleLowerCase().includes(keyword)));
    matches.sort((a, b) => {
      const order = sortBy === 'id' ? a.id - b.id : a[sortBy].localeCompare(b[sortBy]);
      return order * (sortOrder === 'asc' ? 1 : -1) || a.id - b.id;
    });
    res.json({
      success: true,
      data: matches.slice((page - 1) * pageSize, page * pageSize),
      meta: { page, pageSize, totalItems: matches.length, totalPages: Math.ceil(matches.length / pageSize) }
    });
  });
  router.get('/:id', validate(idSchema, 'params'), (req, res) => {
    res.json({ success: true, data: find(req.validated.params.id), meta: null });
  });
  router.post('/', validate(input, 'body'), async (req, res) => {
    const data = await create(req.validated.body);
    res.location(req.baseUrl + '/' + data.id).status(201).json({ success: true, data, meta: null });
  });
  router.patch('/:id', validate(idSchema, 'params'), validate(updateInput, 'body'), async (req, res) => {
    const data = await update(find(req.validated.params.id), req.validated.body);
    res.json({ success: true, data, meta: null });
  });
  return router;
}
