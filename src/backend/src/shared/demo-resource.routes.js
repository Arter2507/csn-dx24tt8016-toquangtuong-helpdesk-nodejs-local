import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { archiveRoute, archiveRows } from './archive.js';
import { AppError } from './errors.js';
import { idSchema, listSchema } from '../modules/categories/category.validator.js';

export function demoResourceRoutes({
  rows, input, updateInput, create, update, searchable, filters, archive = false, queryFields = {}, receive = (req, res, next) => next()
}) {
  const router = Router();
  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  const querySchema = listSchema.extend({
    sortBy: z.enum(['id', ...searchable]).default('id'),
    filter: z.enum(filters.values).optional()
  }).omit({ isActive: true }).extend(queryFields);
  function find(id) {
    const row = rows.find(item => item.id === id && !item.archivedAt);
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
    return row;
  }
  if (archive) archiveRoute(router, ids => archiveRows(rows, ids));
  router.get('/', validate(querySchema, 'query'), (req, res) => {
    const { search, page, pageSize, sortBy, sortOrder, filter, createdOn, assigneeId, ...criteria } = req.validated.query;
    const keyword = search.toLocaleLowerCase();
    const matches = rows.filter(row => !row.archivedAt && (!filter || String(row[filters.field]) === filter) &&
      (assigneeId === undefined || (row.assigneeId ?? 0) === assigneeId) &&
      (!createdOn || (row.createdAt && day.format(new Date(row.createdAt)) === createdOn)) &&
      Object.entries(criteria).every(([field, value]) => value === undefined || row[field] === value) &&
      (row.code?.toLowerCase().includes(keyword) ||
        searchable.some(field => row[field].toLocaleLowerCase().includes(keyword))));
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
  router.post('/', receive, validate(input, 'body'), async (req, res) => {
    const data = await create(req.validated.body, req.files);
    res.location(req.baseUrl + '/' + data.id).status(201).json({ success: true, data, meta: null });
  });
  router.patch('/:id', validate(idSchema, 'params'), receive, validate(updateInput, 'body'), async (req, res) => {
    const data = await update(find(req.validated.params.id), req.validated.body, req.files);
    res.json({ success: true, data, meta: null });
  });
  return router;
}
