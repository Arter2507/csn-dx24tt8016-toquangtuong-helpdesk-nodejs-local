import { AppError } from '../../shared/errors.js';

export function isAdmin(account) {
  return account.roleCodes.includes('ADMIN');
}

export function isTechnician(account) {
  return account.roleCodes.includes('TECHNICIAN');
}

export function authorizeUpdate(account, ticket, changes) {
  const admin = isAdmin(account);
  const owner = account.id === ticket.requesterId;
  const assigned = isTechnician(account) && account.id === ticket.assigneeId;
  const deny = () => new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
  if (!admin && (['title', 'description', 'categoryId', 'assigneeId']
    .some(key => changes[key] !== ticket[key]) || changes.removeAttachments?.length ||
    (!assigned && changes.priority !== ticket.priority))) {
    throw deny();
  }
  if (ticket.status === changes.status) return;
  const handling = changes.status === 'RESOLVED' || (ticket.status === 'NEW' && changes.status === 'IN_PROGRESS');
  if (handling ? !admin && !assigned : !owner) throw deny();
  if ((changes.status === 'RESOLVED' || (ticket.status === 'RESOLVED' && changes.status === 'IN_PROGRESS'))
      && !changes.note) {
    throw new AppError(422, 'NOTE_REQUIRED', 'Vui lòng nhập nội dung phản hồi');
  }
}
