import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { asyncResourceRoutes } from '../../shared/async-resource.routes.js';
import { idSchema } from '../categories/category.validator.js';
import { avatarImage, receiveAvatar, saveAvatar } from '../accounts/profile.routes.js';
import { manageableMember, manageOrganization, members } from './members.repository.js';
import { forbidden, isOwner, memberRoles, requireAdmin, requireOwner } from './permissions.js';

const text = max => z.string().trim().max(max);
const email = z.email().max(254).transform(value => value.toLowerCase());
const employee = z.object({
  fullName: text(150).min(1),
  email,
  phone: text(30),
  employeeCode: text(40).transform(code => code.toUpperCase()),
  department: text(100),
  position: text(100),
  role: z.enum(['ADMIN', 'TECHNICIAN', 'USER']),
}).strict();
const memberStatus = z.enum(['ACTIVE', 'PENDING_ACTIVATION', 'DISABLED']);
const organizationInput = z.object({
  name: text(150).min(1),
  code: text(30).toUpperCase().regex(/^[A-Z0-9_-]+$/),
  description: text(1000),
}).strict();

async function organizationInfo(id, connection = pool) {
  const [[row]] = await connection.execute(
    `SELECT o.id, o.name, o.code, o.description, u.full_name AS ownerName, o.created_at AS createdAt
     FROM organizations o LEFT JOIN users u ON u.id = o.owner_id WHERE o.id = ?`,
    [id],
  );
  return row;
}

export const organizationRoutes = Router();
organizationRoutes.use(requireAdmin);
organizationRoutes.get('/', async (req, res) => {
  res.json({ success: true, data: await organizationInfo(req.account.organizationId), meta: null });
});
organizationRoutes.put('/', requireOwner, validate(organizationInput, 'body'), async (req, res) => {
  const { name, code, description } = req.validated.body;
  const data = await manageOrganization(req.account, async (connection, actor, organization) => {
    if (!isOwner(actor)) throw forbidden();
    await connection.execute('UPDATE organizations SET name = ?, code = ?, description = ? WHERE id = ?', [name, code, description, organization.id]);
    return organizationInfo(organization.id, connection);
  });
  res.json({ success: true, data, meta: null });
});

export const memberRoutes = Router();
memberRoutes.use(requireAdmin);
memberRoutes.post('/:id/invitation', validate(idSchema, 'params'), async (req, res) => {
  const data = await members.invite(req.validated.params.id, req.account);
  res.json({ success: true, data, meta: null });
});
memberRoutes.get('/:id/avatar', validate(idSchema, 'params'), async (req, res) => {
  const [[avatar]] = await pool.execute(
    `SELECT p.avatar, p.avatar_mime AS mime FROM user_profiles p
     JOIN organization_members m ON m.user_id = p.user_id WHERE p.user_id = ? AND m.organization_id = ?`,
    [req.validated.params.id, req.account.organizationId],
  );
  if (!avatar?.avatar) throw new AppError(404, 'NOT_FOUND', 'Chưa có ảnh đại diện');
  res.set('X-Content-Type-Options', 'nosniff').type(avatar.mime).send(avatar.avatar);
});
memberRoutes.post('/:id/avatar', validate(idSchema, 'params'), receiveAvatar, async (req, res) => {
  const { id } = req.validated.params;
  const { image, mime } = avatarImage(req.file);
  await manageOrganization(req.account, async (connection, actor, organization) => {
    await manageableMember(connection, actor, id, organization.id);
    await saveAvatar(connection, id, image, mime);
  });
  res.status(204).end();
});

memberRoutes.use(asyncResourceRoutes({
  repository: members,
  input: employee.extend({
    phone: employee.shape.phone.default(''),
    employeeCode: employee.shape.employeeCode.default(''),
    department: employee.shape.department.default(''),
    position: employee.shape.position.default(''),
  }),
  updateInput: employee.partial().extend({ isActive: z.boolean().optional() }),
  searchable: ['fullName', 'email'],
  filters: { values: memberRoles },
  queryFields: { status: memberStatus.optional() },
}));
