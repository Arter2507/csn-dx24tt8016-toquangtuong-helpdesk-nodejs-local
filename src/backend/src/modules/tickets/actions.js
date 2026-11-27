import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { validate } from '../../middlewares/validate.js';
import { idSchema } from '../categories/category.validator.js';
import { requireAdmin } from '../auth/auth.routes.js';
import { ticketsMysql } from './mysql.repository.js';
import { statuses } from './tickets.js';

const id = z.number().int().positive().safe();
const version = { version: id };
const note = z.string().trim().max(2000).optional();

async function visibleTicket(req) {
  const ticket = await ticketsMysql.find(req.validated.params.id, req.account);
  if (!ticket) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu');
  return ticket;
}

function update(schema, toChanges) {
  return [
    validate(idSchema, 'params'),
    validate(schema.strict(), 'body'),
    async (req, res) => {
      const current = await visibleTicket(req);
      const { title, description, priority, categoryId, assigneeId, status } = current;
      const requested = toChanges(req.validated.body);
      const data = await ticketsMysql.update(current.id, {
        title, description, priority, categoryId, assigneeId, status, ...requested,
      }, [], req.account);
      if (!data) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy yêu cầu');
      res.json({ success: true, data, meta: null });
    },
  ];
}

export function registerTicketActions(app) {
  app.get('/api/v1/tickets/technicians', requireAdmin,
    validate(z.object({ categoryId: z.coerce.number().int().positive().safe() }), 'query'),
    async (req, res) => {
      const data = await ticketsMysql.technicians(req.validated.query.categoryId);
      res.json({ success: true, data, meta: null });
    });
  const selection = z.array(z.object({ id, ...version }).strict()).min(2).max(100)
    .refine(rows => new Set(rows.map(row => row.id)).size === rows.length);
  app.post('/api/v1/tickets/batch', requireAdmin, validate(z.object({
    selection,
    update: z.union([z.object({ assigneeId: id }).strict(), z.object({ targetId: id }).strict()]),
  }).strict(), 'body'), async (req, res) => {
    const { selection, update } = req.validated.body;
    const data = await ticketsMysql.batch(selection, update, req.account);
    res.json({ success: true, data, meta: null });
  });
  const route = '/api/v1/tickets/:id/';
  app.put(route + 'assignee', requireAdmin,
    ...update(z.object({ ...version, assigneeId: id.nullable() }), body => body));
  app.put(route + 'classification', requireAdmin,
    ...update(z.object({ ...version, categoryId: id, assigneeId: id }), body => body));
  app.post(route + 'transitions',
    ...update(z.object({ ...version, toStatus: z.enum(statuses), note }), ({ toStatus, ...body }) => ({ ...body, status: toStatus })));
  app.get(route + 'history', validate(idSchema, 'params'), async (req, res) => {
    const ticket = await visibleTicket(req);
    const [rows] = await pool.execute(
      `SELECT e.id, e.event_type AS type, e.old_value AS oldValue, e.new_value AS newValue,
         e.note, e.created_at AS createdAt, u.full_name AS actorName
       FROM ticket_events e JOIN users u ON u.id = e.actor_id
       WHERE e.ticket_id = ? ORDER BY e.created_at DESC, e.id DESC LIMIT 100`, [ticket.id],
    );
    res.json({ success: true, data: rows.reverse().map(row => ({ ...row, id: Number(row.id) })), meta: null });
  });
}
