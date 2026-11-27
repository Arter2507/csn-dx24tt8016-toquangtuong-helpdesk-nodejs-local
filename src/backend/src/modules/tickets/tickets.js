import { z } from 'zod';
import { estimatePriority } from './priority.js';
import { AppError } from '../../shared/errors.js';
import { demoRepository } from '../categories/demo.repository.js';
import { users } from '../users/users.js';
import { prepareAttachments } from './attachments.js';
import { allocateDemoCode } from './numbering.js';
import { canUpdateStatus, needsTransitionNote, statuses } from './ticket-status.js';
export { statuses } from './ticket-status.js';
const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  categoryId: z.number().int().positive()
};
export const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const ticketListFields = {
  priority: z.enum(priorities).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  createdOn: z.iso.date().optional(),
  requesterId: z.coerce.number().int().positive().optional(),
  assigneeId: z.coerce.number().int().nonnegative().optional()
};
export const ticketInput = z.object({
  ...fields,
  requesterId: z.number().int().positive(),
  priority: z.enum(priorities).default('MEDIUM')
}).strict();
export const ticketUpdate = z.object({
  ...fields,
  assigneeId: z.number().int().positive().nullable(),
  priority: z.enum(priorities),
  status: z.enum(statuses),
  version: z.number().int().positive(),
  note: z.string().trim().max(2000).optional(),
  removeAttachments: z.array(z.string().regex(/^[a-f0-9]{32}$/)).max(5).optional()
}).strict();
export const ticketEdit = ticketUpdate.pick({
  title: true, description: true, priority: true, version: true, removeAttachments: true,
}).partial().required({ version: true });
export const tickets = [];
function checkCategory(id) {
  if (!demoRepository.isActive(id)) throw new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hoạt động');
}
export async function createTicket(input, files = []) {
  const attachments = await prepareAttachments([], files);
  checkCategory(input.categoryId);
  if (!users.some(user => user.id === input.requesterId && user.isActive)) {
    throw new AppError(422, 'INVALID_REQUESTER', 'Người gửi không hoạt động');
  }
  const id = tickets.reduce((maximum, ticket) => Math.max(maximum, ticket.id), 0) + 1;
  const now = new Date().toISOString();
  const ticket = {
    ...input, priority: estimatePriority(input), id, code: allocateDemoCode(tickets, input.categoryId), status: 'NEW',
    assigneeId: null, version: 1, createdAt: now, updatedAt: now, attachments,
    history: [{ status: 'NEW', at: now }]
  };
  tickets.push(ticket);
  return ticket;
}
export async function updateTicket(ticket, input, files = []) {
  const { version, note, removeAttachments = [], ...changes } = input;
  const attachments = await prepareAttachments(ticket.attachments ?? [], files, removeAttachments);
  if (input.categoryId !== ticket.categoryId) checkCategory(input.categoryId);
  if (ticket.archivedAt || ticket.version !== version || !canUpdateStatus(ticket.status, input.status)) {
    throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
  }
  if (input.status === 'PENDING_CUSTOMER' && needsTransitionNote(ticket.status, input.status) && !note) {
    throw new AppError(422, 'NOTE_REQUIRED', 'Vui lòng nhập nội dung phản hồi');
  }
  if ((input.assigneeId !== null && input.assigneeId !== ticket.assigneeId && !users.some(user => user.id === input.assigneeId && user.isActive && user.role === 'TECHNICIAN')) ||
      (input.status !== 'NEW' && input.assigneeId === null)) {
    throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
  }
  const now = new Date().toISOString();
  const history = ticket.history ?? [{ status: 'NEW', at: ticket.createdAt }];
  const archivedAttachments = (ticket.attachments ?? [])
    .filter(file => removeAttachments.includes(file.id)).map(file => ({ ...file, archivedAt: now }));
  const updated = { ...ticket, ...changes, attachments,
    archivedAttachments: [...(ticket.archivedAttachments ?? []), ...archivedAttachments],
    version: version + 1, updatedAt: now,
    history: ticket.status === input.status ? history : [...history, { status: input.status, at: now, note }] };
  Object.assign(ticket, updated);
  return updated;
}
