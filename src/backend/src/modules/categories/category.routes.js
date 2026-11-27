import { Router } from 'express';
import { validate } from '../../middlewares/validate.js';
import { idSchema, listSchema, createSchema, updateSchema } from './category.validator.js';
import { categoryService } from './category.service.js';
import { categoryController } from './category.controller.js';
import { batchStateSchema } from '../../shared/batch-state.js';

export function categoryRoutes(repository, authorizeWrite = (req, res, next) => next()) {
  const router = Router();
  const controller = categoryController(categoryService(repository));
  router.get('/', validate(listSchema, 'query'), controller.list);
  router.patch('/batch-state', authorizeWrite, validate(batchStateSchema, 'body'), async (req, res) => {
    const { ids, isActive } = req.validated.body;
    const count = await repository.batchState(ids, isActive);
    res.json({ success: true, data: { count }, meta: null });
  });
  router.get('/:id', validate(idSchema, 'params'), controller.find);
  router.post('/', authorizeWrite, validate(createSchema, 'body'), controller.create);
  router.patch('/:id', authorizeWrite, validate(idSchema, 'params'), validate(updateSchema, 'body'), controller.update);
  return router;
}
