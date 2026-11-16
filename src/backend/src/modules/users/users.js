import { z } from 'zod';
import { AppError } from '../../shared/errors.js';
export const roles = ['USER', 'TECHNICIAN', 'ADMIN'];
const fields = {
  fullName: z.string().trim().min(1).max(150),
  email: z.email().max(254).transform(email => email.toLowerCase()),
  role: z.enum(roles)
};
export const userInput = z.object(fields).strict();
export const userUpdate = z.union([
  z.object({ ...fields, isActive: z.boolean() }).strict(),
  z.object({ isActive: z.boolean() }).strict(),
]);
export const users = [
  { id: 1, fullName: 'Người gửi mẫu', email: 'user@example.test', role: 'USER', isActive: true },
  { id: 2, fullName: 'Kỹ thuật viên mẫu', email: 'tech@example.test', role: 'TECHNICIAN', isActive: true },
  { id: 3, fullName: 'Quản trị mẫu', email: 'admin@example.test', role: 'ADMIN', isActive: true }
];
function checkEmail(email, id) {
  if (users.some(user => user.email === email && user.id !== id)) {
    throw new AppError(409, 'CONFLICT', 'Email đã tồn tại');
  }
}
export function createUser(input) {
  checkEmail(input.email);
  const user = { ...input, id: users.length + 1, isActive: true };
  users.push(user);
  return user;
}
export function updateUser(user, input) {
  const next = { ...user, ...input };
  checkEmail(next.email, user.id);
  if (user.role === 'ADMIN' && user.isActive && (next.role !== 'ADMIN' || !next.isActive) &&
      !users.some(other => other.id !== user.id && other.isActive && other.role === 'ADMIN')) {
    throw new AppError(409, 'LAST_ADMIN', 'Cần giữ ít nhất một quản trị viên hoạt động');
  }
  return Object.assign(user, input);
}
