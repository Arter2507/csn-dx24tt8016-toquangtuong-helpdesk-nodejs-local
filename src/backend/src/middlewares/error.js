import { AppError } from '../shared/errors.js';
export function errorHandler(err, req, res, next) {
  const malformed = err instanceof SyntaxError && err.status === 400;
  const known = err instanceof AppError;
  res.status(malformed ? 400 : known ? err.status : 500).json({ success: false, error: {
    code: malformed ? 'BAD_REQUEST' : known ? err.code : 'INTERNAL_ERROR',
    message: malformed ? 'JSON không hợp lệ' : known ? err.message : 'Lỗi hệ thống',
    details: known ? err.details : []
  }, requestId: req.id });
}
