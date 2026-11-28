import { EventEmitter } from 'node:events';
import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../../database/pool.js';
import { validate } from '../../middlewares/validate.js';
import { currentAccount } from '../auth/auth.routes.js';

const changes = new EventEmitter();
changes.setMaxListeners(0);
const pending = new WeakMap();

export async function notify(conn, { userId, ticketId, type, title, status = '' }) {
  await conn.execute(
    `INSERT INTO notifications (user_id, ticket_id, type, title, body, created_at)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`, [userId, ticketId, type, title, status],
  );
  if (!pending.has(conn)) pending.set(conn, new Set());
  pending.get(conn).add(Number(userId));
}

export function publishNotifications(conn) {
  for (const userId of pending.get(conn) ?? []) changes.emit(String(userId));
  pending.delete(conn);
}

export function discardNotifications(conn) {
  pending.delete(conn);
}

export function publishTickets() {
  changes.emit('tickets');
}

const streams = new Map();
export const notificationRoutes = Router();
notificationRoutes.get('/stream', (req, res) => {
  const key = String(req.account.id);
  const open = streams.get(key) ?? 0;
  if (open >= 8) return res.status(429).end();
  streams.set(key, open + 1);
  res.set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store, no-transform',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\nevent: inbox\ndata: refresh\n\n');

  let checking = false;
  const sendTickets = () => {
    if (!res.writableEnded) res.write('event: tickets\ndata: refresh\n\n');
  };
  const send = async () => {
    if (checking || res.writableEnded) return;
    checking = true;
    try {
      const account = await currentAccount(req);
      if (account?.status !== 'ACTIVE' || account.organizationId !== req.account.organizationId) {
        res.end();
      } else if (!res.writableEnded && !res.write('event: inbox\ndata: refresh\n\n')) {
        res.end();
      }
    } catch {
      res.end();
    } finally {
      checking = false;
    }
  };
  const heartbeat = setInterval(send, 25000);
  changes.on(key, send);
  changes.on('tickets', sendTickets);
  res.on('close', () => {
    changes.off(key, send);
    changes.off('tickets', sendTickets);
    clearInterval(heartbeat);
    const count = streams.get(key) - 1;
    if (count) streams.set(key, count);
    else streams.delete(key);
  });
});

notificationRoutes.get('/', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, ticket_id AS ticketId, type, title, body AS status, read_at AS readAt, created_at AS createdAt
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`, [req.account.id],
  );
  res.json({ success: true, data: rows.map(row => ({ ...row, id: Number(row.id), ticketId: Number(row.ticketId) || null })), meta: null });
});
notificationRoutes.patch('/read', validate(z.object({
  ids: z.array(z.number().int().positive().safe()).min(1).max(100),
}).strict(), 'body'), async (req, res) => {
  const { ids } = req.validated.body;
  await pool.execute(
    `UPDATE notifications SET read_at = UTC_TIMESTAMP(3)
     WHERE user_id = ? AND read_at IS NULL AND id IN (${ids.map(() => '?').join(',')})`,
    [req.account.id, ...ids],
  );
  changes.emit(String(req.account.id));
  res.status(204).end();
});
