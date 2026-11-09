import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
import { demoRepository } from '../categories/demo.repository.js';
import { users } from '../users/users.js';
export const statuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const fields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  categoryId: z.number().int().positive()
};
export const ticketInput = z.object({ ...fields, requesterId: z.number().int().positive() }).strict();
export const ticketUpdate = z.object({
  ...fields,
  assigneeId: z.number().int().positive().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.enum(statuses),
  version: z.number().int().positive()
}).strict();
export const tickets = [];
const transitions = { NEW: ['IN_PROGRESS'], IN_PROGRESS: ['RESOLVED'], RESOLVED: ['CLOSED', 'IN_PROGRESS'], CLOSED: [] };
async function checkCategory(id) {
  if (!(await demoRepository.find(id))?.isActive) throw new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hoạt động');
}
export async function createTicket(input) {
  await checkCategory(input.categoryId);
  if (!users.some(user => user.id === input.requesterId && user.isActive)) {
    throw new AppError(422, 'INVALID_REQUESTER', 'Người gửi không hoạt động');
  }
  const ticket = { ...input, id: tickets.length + 1, status: 'NEW', priority: 'MEDIUM', assigneeId: null, version: 1 };
  tickets.push(ticket);
  return ticket;
}
export async function updateTicket(ticket, input) {
  const { version, ...changes } = input;
  await checkCategory(input.categoryId);
  if (ticket.version !== version || ticket.status === 'CLOSED' ||
      (ticket.status !== input.status && !transitions[ticket.status].includes(input.status))) {
    throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
  }
  if ((input.assigneeId !== null && !users.some(user => user.id === input.assigneeId && user.isActive && user.role === 'TECHNICIAN')) ||
      (input.status !== 'NEW' && input.assigneeId === null)) {
    throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
  }
  return Object.assign(ticket, changes, { version: version + 1 });
}
