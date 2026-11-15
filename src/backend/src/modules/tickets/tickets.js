import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { demoRepository } from '../categories/demo.repository.js';
import { users } from '../users/users.js';
import { discardAttachments, prepareAttachments } from './attachments.js';
export const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
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
  removeAttachments: z.array(z.string().regex(/^[a-f0-9]{32}$/)).max(5).optional()
}).strict();
export const tickets = [];
const transitions = { NEW: ['IN_PROGRESS'], IN_PROGRESS: ['RESOLVED'], RESOLVED: ['CLOSED', 'IN_PROGRESS'], CLOSED: [] };
async function checkCategory(id) {
  if (!(await demoRepository.find(id))?.isActive) throw new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hoạt động');
}
export async function createTicket(input, files = []) {
  await checkCategory(input.categoryId);
  if (!users.some(user => user.id === input.requesterId && user.isActive)) {
    throw new AppError(422, 'INVALID_REQUESTER', 'Người gửi không hoạt động');
  }
  const attachments = await prepareAttachments([], files);
  const id = tickets.length + 1;
  const now = new Date().toISOString();
  const ticket = {
    ...input, id, code: 'HD-' + String(id).padStart(3, '0'), status: 'NEW',
    assigneeId: null, version: 1, createdAt: now, updatedAt: now, attachments,
    history: [{ status: 'NEW', at: now }]
  };
  tickets.push(ticket);
  return ticket;
}
export async function updateTicket(ticket, input, files = []) {
  const { version, removeAttachments = [], ...changes } = input;
  await checkCategory(input.categoryId);
  const attachments = await prepareAttachments(ticket.attachments ?? [], files, removeAttachments);
  if (ticket.version !== version || ticket.status === 'CLOSED' ||
      (ticket.status !== input.status && !transitions[ticket.status].includes(input.status))) {
    throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
  }
  if ((input.assigneeId !== null && !users.some(user => user.id === input.assigneeId && user.isActive && user.role === 'TECHNICIAN')) ||
      (input.status !== 'NEW' && input.assigneeId === null)) {
    throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
  }
  const now = new Date().toISOString();
  const history = ticket.history ?? [{ status: 'NEW', at: ticket.createdAt }];
  const updated = { ...ticket, ...changes, attachments, version: version + 1, updatedAt: now,
    history: ticket.status === input.status ? history : [...history, { status: input.status, at: now }] };
  Object.assign(ticket, updated);
  await discardAttachments(removeAttachments);
  return updated;
}
