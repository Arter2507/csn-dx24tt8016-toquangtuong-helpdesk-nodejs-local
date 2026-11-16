import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middlewares/validate.js';
import { archiveRoute } from './archive.js';
import { AppError } from './errors.js';
import { idSchema, listSchema } from '../modules/categories/category.validator.js';

export function asyncResourceRoutes({
  repository,
  input,
  updateInput,
  searchable,
  filters,
  archive = false,
  queryFields = {},
  receive = (req, res, next) => next(),
}) {
  const router = Router();
  const querySchema = listSchema
    .extend({
      sortBy: z.enum(['id', ...searchable]).default('id'),
      filter: z.enum(filters.values).optional(),
    })
    .omit({ isActive: true })
    .extend(queryFields);

  if (archive) archiveRoute(router, (ids) => repository.archive(ids));

  router.get('/', validate(querySchema, 'query'), async (req, res, next) => {
    try {
      const query = req.validated.query;
      const { items, total } = await repository.list({
        ...query,
        filter: query.filter,
      });
      res.json({
        success: true,
        data: items,
        meta: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems: total,
          totalPages: Math.ceil(total / query.pageSize),
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', validate(idSchema, 'params'), async (req, res, next) => {
    try {
      const data = await repository.find(req.validated.params.id);
      if (!data) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
      res.json({ success: true, data, meta: null });
    } catch (error) {
      next(error);
    }
  });

  router.post('/', receive, validate(input, 'body'), async (req, res, next) => {
    try {
      const data = await repository.create(req.validated.body, req.files);
      res.location(req.baseUrl + '/' + data.id).status(201).json({ success: true, data, meta: null });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', validate(idSchema, 'params'), receive, validate(updateInput, 'body'), async (req, res, next) => {
    try {
      const data = await repository.update(req.validated.params.id, req.validated.body, req.files);
      if (!data) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu');
      res.json({ success: true, data, meta: null });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
