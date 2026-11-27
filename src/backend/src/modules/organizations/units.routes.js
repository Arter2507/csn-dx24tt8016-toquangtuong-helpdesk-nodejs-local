import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { AppError } from '../../shared/errors.js';
import { idSchema } from '../categories/category.validator.js';
import { manageOrganization } from './members.repository.js';
import { forbidden, isOwner, requireOwner } from './permissions.js';

const unitInput = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,30}$/),
  parentId: z.number().int().positive().safe().nullable(),
  isActive: z.boolean(),
}).strict();

async function listUnits(connection, organizationId, includeDeleted = false) {
  const [rows] = await connection.execute(
    'SELECT id, parent_id AS parentId, code, name, is_active AS isActive, deleted_at AS deletedAt FROM organization_units WHERE organization_id = ?' +
      (includeDeleted ? '' : ' AND deleted_at IS NULL') + ' ORDER BY name, id',
    [organizationId],
  );
  return rows.map(row => ({
    ...row, id: Number(row.id), parentId: row.parentId == null ? null : Number(row.parentId),
    isActive: Boolean(row.isActive),
  }));
}

async function saveUnit(req, res) {
  const id = req.validated.params?.id;
  const { name, code, parentId, isActive } = req.validated.body;
  const data = await manageOrganization(req.account, async (conn, actor, organization) => {
    if (!isOwner(actor)) throw forbidden();
    const units = new Map((await listUnits(conn, organization.id, true)).map(unit => [unit.id, unit]));
    if (id && (!units.has(id) || units.get(id).deletedAt)) throw new AppError(404, 'NOT_FOUND');
    if ([...units.values()].some(unit => unit.id !== id && unit.code === code)) {
      throw new AppError(409, 'UNIT_CODE_DUPLICATE');
    }
    if (parentId !== null && (!units.has(parentId) || units.get(parentId).deletedAt)) throw new AppError(422, 'UNIT_UNAVAILABLE');
    if (parentId !== null && parentId !== units.get(id)?.parentId && !units.get(parentId).isActive) {
      throw new AppError(422, 'UNIT_UNAVAILABLE');
    }
    for (let ancestor = units.get(parentId); ancestor; ancestor = units.get(ancestor.parentId)) {
      if (ancestor.id === id) throw new AppError(422, 'UNIT_CYCLE');
    }
    if (id) {
      await conn.execute(
        'UPDATE organization_units SET name = ?, code = ?, parent_id = ?, is_active = ? WHERE id = ? AND organization_id = ?',
        [name, code, parentId, isActive, id, organization.id],
      );
      return { id, name, code, parentId, isActive };
    }
    const [result] = await conn.execute(
      'INSERT INTO organization_units (organization_id, name, code, parent_id, is_active) VALUES (?, ?, ?, ?, ?)',
      [organization.id, name, code, parentId, isActive],
    );
    return { id: Number(result.insertId), name, code, parentId, isActive };
  });
  res.status(id ? 200 : 201).json({ success: true, data, meta: null });
}

export const unitRoutes = Router();
unitRoutes.get('/', async (req, res) => {
  res.json({ success: true, data: await listUnits(pool, req.account.organizationId), meta: null });
});
unitRoutes.post('/', requireOwner, validate(unitInput, 'body'), saveUnit);
unitRoutes.put('/:id', requireOwner, validate(idSchema, 'params'), validate(unitInput, 'body'), saveUnit);
unitRoutes.delete('/:id', requireOwner, validate(idSchema, 'params'), async (req, res) => {
  const { id } = req.validated.params;
  await manageOrganization(req.account, async (conn, actor, organization) => {
    if (!isOwner(actor)) throw forbidden();
    const [[usage]] = await conn.execute(
      `SELECT
        EXISTS(SELECT 1 FROM organization_members WHERE organization_id = ? AND unit_id = ?) AS members,
        EXISTS(SELECT 1 FROM organization_units WHERE organization_id = ? AND parent_id = ? AND deleted_at IS NULL) AS children`,
      [organization.id, id, organization.id, id],
    );
    if (usage.members || usage.children) throw new AppError(409, 'UNIT_IN_USE');
    const [result] = await conn.execute(
      'UPDATE organization_units SET is_active = 0, deleted_at = UTC_TIMESTAMP(3) WHERE organization_id = ? AND id = ? AND deleted_at IS NULL',
      [organization.id, id],
    );
    if (!result.affectedRows) throw new AppError(404, 'NOT_FOUND');
  });
  res.status(204).end();
});
