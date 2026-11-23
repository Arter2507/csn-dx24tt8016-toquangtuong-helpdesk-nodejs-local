import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { idSchema, listSchema, createSchema, updateSchema } from './category.validator.js';
import { categoryService } from './category.service.js';
import { categoryController } from './category.controller.js';

export function categoryRoutes(repository, authorizeWrite = (req, res, next) => next()) {
  const router = Router();
  const controller = categoryController(categoryService(repository));
  router.get('/', validate(listSchema, 'query'), controller.list);
  router.get('/:id', validate(idSchema, 'params'), controller.find);
  router.post('/', authorizeWrite, validate(createSchema, 'body'), controller.create);
  router.patch('/:id', authorizeWrite, validate(idSchema, 'params'), validate(updateSchema, 'body'), controller.update);
  return router;
}
