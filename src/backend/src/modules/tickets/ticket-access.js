import { AppError } from '../../shared/errors.js';
import { needsTransitionNote } from './ticket-status.js';
import { isAdmin, isTechnician } from '../organizations/permissions.js';

export { isAdmin, isTechnician };

export function canHandle(account, ticket) {
  return isAdmin(account) || (isTechnician(account) && account.id === ticket.assigneeId);
}

export function assertContentEditable(account, ticket) {
  if (account.id !== ticket.requesterId) throw new AppError(403, 'FORBIDDEN');
  if (Date.now() >= Date.parse(ticket.createdAt) + 600_000) {
    throw new AppError(403, 'TICKET_EDIT_EXPIRED');
  }
}

export function authorizeUpdate(account, ticket, changes) {
  const admin = isAdmin(account);
  const owner = account.id === ticket.requesterId;
  const assigned = isTechnician(account) && account.id === ticket.assigneeId;
  const deny = () => new AppError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này');
  if (!admin && (changes.categoryId !== ticket.categoryId || changes.priority !== ticket.priority)) throw deny();
  if (changes.assigneeId !== ticket.assigneeId && !admin &&
    (!assigned || changes.assigneeId === null || ['RESOLVED', 'CLOSED'].includes(ticket.status))) throw deny();
  if (ticket.status === changes.status) return;
  const needsOwner = ticket.status === 'RESOLVED';
  if (needsOwner ? !owner : !canHandle(account, ticket)) throw deny();
  if (needsTransitionNote(ticket.status, changes.status) && !changes.note) {
    throw new AppError(422, 'NOTE_REQUIRED', 'Vui lòng nhập nội dung phản hồi');
  }
}
