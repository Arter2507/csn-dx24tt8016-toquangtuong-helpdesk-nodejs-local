import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { idSchema, listSchema, createSchema, updateSchema } from './category.validator.js';
import { categoryService } from './category.service.js';
import { categoryController } from './category.controller.js';
export function categoryRoutes(repository, demo) {
  const router = Router(); const controller = categoryController(categoryService(repository));
  // Do not expose real data until authentication and authorization are implemented.
  router.use((req, res, next) => demo ? next() : next(new AppError(503, 'AUTH_NOT_IMPLEMENTED', 'Chưa hỗ trợ truy cập MySQL trước khi hoàn thành xác thực và phân quyền')));
  router.get('/', validate(listSchema, 'query'), controller.list);
  router.get('/:id', validate(idSchema, 'params'), controller.find);
  router.post('/', validate(createSchema, 'body'), controller.create);
  router.patch('/:id', validate(idSchema, 'params'), validate(updateSchema, 'body'), controller.update);
  return router;
}
