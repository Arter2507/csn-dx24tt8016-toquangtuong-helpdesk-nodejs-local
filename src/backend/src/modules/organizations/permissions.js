import { AppError } from '../../shared/errors.js';

export const memberRoles = ['OWNER', 'ADMIN', 'TECHNICIAN', 'USER'];
const rank = new Map(memberRoles.map((role, index) => [role, index]));

export const isOwner = account => account?.role === 'OWNER';
export const isAdmin = account => isOwner(account) || account?.role === 'ADMIN';
export const isTechnician = account => account?.role === 'TECHNICIAN';
export const forbidden = () => new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');

export function requireMember(req, res, next) {
  if (req.account.status !== 'ACTIVE' || !req.account.organizationId) {
    return next(new AppError(403, 'ORGANIZATION_REQUIRED', 'Tài khoản chưa thuộc tổ chức'));
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!isAdmin(req.account)) return next(forbidden());
  next();
}

export function requireOwner(req, res, next) {
  if (!isOwner(req.account)) return next(forbidden());
  next();
}

export function canManage(actor, targetRole) {
  return isAdmin(actor) && rank.has(targetRole) && rank.get(actor.role) < rank.get(targetRole);
}
