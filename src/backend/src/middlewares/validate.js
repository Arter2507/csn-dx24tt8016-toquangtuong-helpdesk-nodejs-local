import { AppError } from '../shared/errors.js';
export const validate = (schema, source) => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) return next(new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message }))));
  req.validated ??= {}; req.validated[source] = result.data; next();
};
