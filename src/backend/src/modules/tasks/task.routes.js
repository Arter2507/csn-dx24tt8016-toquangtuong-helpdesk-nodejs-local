import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { users } from '../users/users.js';
import { idSchema } from '../categories/category.validator.js';

export const demoTasks = [];
const id = z.number().int().positive().safe();
const task = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(3000),
  status: z.enum(['TODO', 'DOING', 'DONE']),
  assigneeId: id.nullable(),
  dueDate: z.iso.date().nullable(),
}).strict();

const select = `SELECT id, title, description, status, assignee_id AS assigneeId,
  DATE_FORMAT(due_date, '%Y-%m-%d') AS dueDate, created_by AS createdBy, version FROM task_items`;
const forbidden = () => new AppError(403, 'FORBIDDEN');
const missing = () => new AppError(404, 'NOT_FOUND');
const conflict = () => new AppError(409, 'CONFLICT', 'Nhiệm vụ vừa được cập nhật');

function staff(req, res, next) {
  if (req.account && !req.account.roleCodes.some(role => role === 'ADMIN' || role === 'TECHNICIAN')) return next(forbidden());
  next();
}

async function members(req) {
  if (!req.account) return users.filter(user => user.isActive && ['ADMIN', 'TECHNICIAN'].includes(user.role))
    .map(({ id, fullName }) => ({ id, fullName }));
  const [rows] = await pool.query(
    `SELECT DISTINCT u.id, u.full_name AS fullName FROM users u
      JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id
      WHERE u.is_active = 1 AND r.code IN ('ADMIN', 'TECHNICIAN') ORDER BY u.full_name`,
  );
  return rows;
}

async function find(req, taskId) {
  if (!req.account) return demoTasks.find(item => item.id === taskId);
  const [rows] = await pool.execute(select + ' WHERE id = ?', [taskId]);
  return rows[0];
}
const canEdit = (req, row) => !req.account || req.account.roleCodes.includes('ADMIN') ||
  req.account.id === row.createdBy || req.account.id === row.assigneeId;
const taskView = (req, row) => ({ ...row, canEdit: canEdit(req, row) });

async function validateAssignee(req, assigneeId) {
  if (assigneeId !== null && !(await members(req)).some(member => member.id === assigneeId)) {
    throw new AppError(422, 'INVALID_ASSIGNEE');
  }
}

export const taskRoutes = Router();
taskRoutes.use(staff);
taskRoutes.get('/', async (req, res) => {
  const rows = req.account ? (await pool.query(select + ' ORDER BY id DESC'))[0] : [...demoTasks].reverse();
  res.json({ success: true, data: { tasks: rows.map(row => taskView(req, row)), members: await members(req) }, meta: null });
});
taskRoutes.post('/', validate(task, 'body'), async (req, res) => {
  const fields = req.validated.body;
  await validateAssignee(req, fields.assigneeId);
  const { title, description, status, dueDate, assigneeId } = fields;
  let row;
  if (req.account) {
    const [result] = await pool.execute(
      'INSERT INTO task_items (title, description, status, due_date, assignee_id, created_by, version) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [title, description, status, dueDate, assigneeId, req.account.id],
    );
    row = await find(req, result.insertId);
  } else {
    row = { ...fields, id: demoTasks.reduce((max, item) => Math.max(max, item.id), 0) + 1, version: 1, createdBy: 3 };
    demoTasks.push(row);
  }
  res.status(201).json({ success: true, data: taskView(req, row), meta: null });
});
taskRoutes.patch('/:id', validate(idSchema, 'params'), validate(
  task.partial().extend({ version: id }).strict(), 'body',
), async (req, res) => {
  const { id: taskId } = req.validated.params;
  const { version, ...changes } = req.validated.body;
  const previous = await find(req, taskId);
  if (!previous) throw missing();
  if (!canEdit(req, previous)) throw forbidden();
  if (version !== previous.version) throw conflict();
  const next = { ...previous, ...changes, version: version + 1 };
  if (next.assigneeId !== previous.assigneeId) await validateAssignee(req, next.assigneeId);
  if (req.account) {
    const [result] = await pool.execute(
      'UPDATE task_items SET title=?, description=?, status=?, due_date=?, assignee_id=?, version=version+1 WHERE id=? AND version=?',
      [next.title, next.description, next.status, next.dueDate, next.assigneeId, taskId, version],
    );
    if (!result.affectedRows) throw conflict();
  } else {
    if (previous.version !== version) throw conflict();
    Object.assign(previous, next);
  }
  res.json({ success: true, data: taskView(req, next), meta: null });
});
