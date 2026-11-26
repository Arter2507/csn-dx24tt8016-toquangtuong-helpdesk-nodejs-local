import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { estimatePriority } from './priority.js';
import { prepareAttachments } from './attachments.js';
import { authorizeUpdate, isAdmin, isTechnician } from './ticket-access.js';
import { notify } from '../accounts/accounts.routes.js';
import { allocateMysqlCode } from './numbering.js';
import { canUpdateStatus } from './ticket-status.js';

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAttachment(row) {
  return {
    id: row.storageKey,
    name: row.originalName,
    type: row.mimeType,
    size: Number(row.sizeBytes),
  };
}

function mapStatusEvent(row) {
  const value = typeof row.newValue === 'string' ? JSON.parse(row.newValue) : row.newValue;
  return { status: value?.status ?? 'NEW', at: toIso(row.createdAt), note: row.note };
}

function mapTicket(row, attachments, history) {
  return {
    id: Number(row.id),
    code: row.code,
    title: row.title,
    description: row.description,
    categoryId: Number(row.categoryId),
    requesterId: Number(row.requesterId),
    assigneeId: row.assigneeId == null ? null : Number(row.assigneeId),
    priority: row.priority,
    status: row.status,
    version: Number(row.version),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    archivedAt: row.archivedAt ? toIso(row.archivedAt) : null,
    attachments,
    history,
  };
}

async function mapTickets(rows) {
  if (!rows.length) return [];
  const ids = rows.map(row => row.id);
  const placeholders = ids.map(() => '?').join(',');
  const [[attachments], [history]] = await Promise.all([
    pool.execute(
      `SELECT ticket_id AS ticketId, storage_key AS storageKey, original_name AS originalName,
              mime_type AS mimeType, size_bytes AS sizeBytes
       FROM ticket_attachments WHERE ticket_id IN (${placeholders}) AND archived_at IS NULL ORDER BY id`,
      ids,
    ),
    pool.execute(
      `SELECT ticket_id AS ticketId, new_value AS newValue, note, created_at AS createdAt
       FROM ticket_events WHERE ticket_id IN (${placeholders}) AND event_type IN ('CREATED', 'STATUS_CHANGED')
       ORDER BY created_at, id`,
      ids,
    ),
  ]);
  const filesByTicket = Map.groupBy(attachments, row => Number(row.ticketId));
  const historyByTicket = Map.groupBy(history, row => Number(row.ticketId));
  return rows.map(row => mapTicket(
    row,
    (filesByTicket.get(Number(row.id)) ?? []).map(mapAttachment),
    (historyByTicket.get(Number(row.id)) ?? []).map(mapStatusEvent),
  ));
}

const selectBase = `
  SELECT
    id, display_code AS code, title, description, category_id AS categoryId, requester_id AS requesterId,
    assignee_id AS assigneeId, priority, status, version,
    created_at AS createdAt, updated_at AS updatedAt, archived_at AS archivedAt
  FROM tickets
`;

async function assertActiveCategory(categoryId) {
  const [rows] = await pool.execute(
    'SELECT id FROM categories WHERE id = ? AND is_active = 1',
    [categoryId],
  );
  if (!rows[0]) throw new AppError(422, 'INVALID_CATEGORY', 'Danh mục không hoạt động');
}

async function assertActiveRequester(requesterId) {
  const [rows] = await pool.execute(
    'SELECT u.id FROM users u JOIN organization_members m ON m.user_id = u.id WHERE u.id = ? AND u.is_active = 1 AND u.password_hash IS NOT NULL',
    [requesterId],
  );
  if (!rows[0]) throw new AppError(422, 'INVALID_REQUESTER', 'Người gửi không hoạt động');
}

const activeTechnicians = `SELECT u.id, u.full_name AS fullName
     FROM users u
     JOIN organization_members m ON m.user_id = u.id
     JOIN technician_categories tc ON tc.user_id = u.id
     WHERE u.is_active = 1 AND u.password_hash IS NOT NULL AND m.role = 'TECHNICIAN' AND tc.category_id = ?`;

async function assertActiveTechnician(assigneeId, categoryId, connection = pool) {
  const [rows] = await connection.execute(
    activeTechnicians + ' AND u.id = ?', [categoryId, assigneeId],
  );
  if (!rows[0]) throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
}

export async function insertEvent(conn, ticketId, actorId, eventType, oldValue, newValue, note = null) {
  await conn.execute(
    `INSERT INTO ticket_events
      (ticket_id, actor_id, event_type, old_value, new_value, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
    [
      ticketId,
      actorId,
      eventType,
      oldValue == null ? null : JSON.stringify(oldValue),
      newValue == null ? null : JSON.stringify(newValue),
      note,
    ],
  );
}

async function saveAttachmentRows(conn, ticketId, uploaderId, attachments, removed = []) {
  for (const id of removed) {
    await conn.execute('UPDATE ticket_attachments SET archived_at = UTC_TIMESTAMP(3) WHERE ticket_id = ? AND storage_key = ?', [ticketId, id]);
  }
  for (const file of attachments) {
    await conn.execute(
      `INSERT INTO ticket_attachments
        (ticket_id, uploader_id, original_name, storage_key, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [ticketId, uploaderId, file.name, file.id, file.type, file.size],
    );
  }
}

export const ticketsMysql = {
  async technicians(categoryId) {
    const [rows] = await pool.execute(activeTechnicians + ' ORDER BY u.full_name, u.id', [categoryId]);
    return rows.map(row => ({ ...row, id: Number(row.id) }));
  },
  async list(q, account) {
    const conditions = ['archived_at IS NULL'];
    const values = [];
    if (account && !isAdmin(account)) {
      conditions.push('(requester_id = ? OR (? = 1 AND assignee_id = ?))');
      values.push(account.id, isTechnician(account), account.id);
    }

    if (q.search) {
      const byCode = q.search.startsWith('#');
      const text = byCode ? q.search.slice(1) : q.search;
      const pattern = '%' + text.replace(/[!%_]/g, character => '!' + character) + '%';
      const matches = "COLLATE utf8mb4_0900_ai_ci LIKE ? ESCAPE '!'";
      if (byCode) {
        conditions.push(`display_code ${matches}`);
        values.push(pattern);
      } else {
        conditions.push(`(display_code ${matches} OR title ${matches} OR description ${matches}
          OR EXISTS (SELECT 1 FROM categories c WHERE c.id = tickets.category_id
            AND (c.name ${matches} OR c.code ${matches})))`);
        values.push(pattern, pattern, pattern, pattern, pattern);
      }
    }
    if (q.filter) {
      conditions.push('status = ?');
      values.push(q.filter);
    }
    if (q.priority) {
      conditions.push('priority = ?');
      values.push(q.priority);
    }
    if (q.categoryId) {
      conditions.push('category_id = ?');
      values.push(q.categoryId);
    }
    if (q.requesterId) {
      conditions.push('requester_id = ?');
      values.push(q.requesterId);
    }
    if (q.assigneeId !== undefined) {
      if (Number(q.assigneeId) === 0) conditions.push('assignee_id IS NULL');
      else {
        conditions.push('assignee_id = ?');
        values.push(q.assigneeId);
      }
    }
    if (q.createdOn) {
      conditions.push(`DATE(CONVERT_TZ(created_at, '+00:00', '+07:00')) = ?`);
      values.push(q.createdOn);
    }

    const where = ` WHERE ${conditions.join(' AND ')}`;
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM tickets${where}`,
      values,
    );
    const sortMap = {
      id: 'id',
      title: 'title',
      description: 'description',
    };
    const sortCol = sortMap[q.sortBy] || 'id';
    const [rows] = await pool.execute(
      `${selectBase}${where}
       ORDER BY ${sortCol} ${q.sortOrder.toUpperCase()}, id ASC
       LIMIT ? OFFSET ?`,
      [...values, q.pageSize, (q.page - 1) * q.pageSize],
    );

    return { items: await mapTickets(rows), total: Number(countRows[0].total) };
  },

  async find(id, account) {
    const [rows] = await pool.execute(`${selectBase} WHERE id = ? AND (archived_at IS NULL OR EXISTS (
      SELECT 1 FROM ticket_events e WHERE e.ticket_id = tickets.id AND e.event_type = 'MERGED_INTO'))`, [id]);
    const row = rows[0];
    if (!row) return null;
    const canSeeMerge = !account || isAdmin(account) || Number(row.requesterId) === account.id;
    if (!canSeeMerge && (row.archivedAt || !isTechnician(account) || Number(row.assigneeId) !== account.id)) return null;
    const [ticket] = await mapTickets(rows);
    if (!canSeeMerge) return ticket;
    const [links] = await pool.execute(
      "SELECT event_type AS type, new_value AS link FROM ticket_events WHERE ticket_id = ? AND event_type IN ('MERGED_INTO', 'MERGED_TICKET') ORDER BY id",
      [id],
    );
    for (const { type, link } of links) {
      const reference = typeof link === 'string' ? JSON.parse(link) : link;
      if (type === 'MERGED_INTO') ticket.mergedInto = reference;
      else (ticket.mergedTickets ??= []).push(reference);
    }
    return ticket;
  },

  async create(input, files = []) {
    await assertActiveCategory(input.categoryId);
    await assertActiveRequester(input.requesterId);
    const attachments = await prepareAttachments([], files);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const code = await allocateMysqlCode(conn, input.categoryId);
      const [result] = await conn.execute(
        `INSERT INTO tickets
          (display_code, requester_id, assignee_id, category_id, title, description, priority, status, version,
           resolved_at, closed_at, archived_at, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, 'NEW', 1, NULL, NULL, NULL, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [code, input.requesterId, input.categoryId, input.title, input.description, estimatePriority(input)],
      );
      const ticketId = result.insertId;
      await insertEvent(conn, ticketId, input.requesterId, 'CREATED', null, { status: 'NEW' });
      await saveAttachmentRows(conn, ticketId, input.requesterId, attachments);
      await conn.commit();
      for (const file of files) file.committed = true;
      return this.find(ticketId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async update(id, patch, files = [], account) {
    const current = await this.find(id, account);
    if (!current || current.archivedAt) return null;

    const { title, description, categoryId, assigneeId, priority, status } = current;
    const input = { title, description, categoryId, assigneeId, priority, status, ...patch };
    const { version, note, removeAttachments = [], ...changes } = input;
    if (
      current.version !== version ||
      !canUpdateStatus(current.status, input.status)
    ) {
      throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
    }
    authorizeUpdate(account, current, input);
    if (input.categoryId !== current.categoryId) await assertActiveCategory(input.categoryId);
    if (input.status !== 'NEW' && input.assigneeId === null) {
      throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
    }
    if (input.assigneeId !== null && (input.assigneeId !== current.assigneeId || input.categoryId !== current.categoryId)) {
      await assertActiveTechnician(input.assigneeId, input.categoryId);
    }

    const attachments = await prepareAttachments(current.attachments ?? [], files, removeAttachments);
    const actorId = account.id;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `UPDATE tickets SET
           title = ?, description = ?, category_id = ?, assignee_id = ?, priority = ?,
           version = version + 1,
           resolved_at = CASE
             WHEN ? = 'RESOLVED' AND status <> 'RESOLVED' THEN UTC_TIMESTAMP(3)
             WHEN ? = 'IN_PROGRESS' AND status = 'RESOLVED' THEN NULL
             ELSE resolved_at
           END,
           closed_at = CASE WHEN ? = 'CLOSED' THEN UTC_TIMESTAMP(3) ELSE closed_at END,
           status = ?,
           updated_at = UTC_TIMESTAMP(3)
         WHERE id = ? AND version = ? AND archived_at IS NULL`,
        [
          changes.title,
          changes.description,
          changes.categoryId,
          changes.assigneeId,
          changes.priority,
          changes.status,
          changes.status,
          changes.status,
          changes.status,
          id,
          version,
        ],
      );
      if (result.affectedRows === 0) {
        throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
      }

      if (current.status !== input.status) {
        await insertEvent(
          conn,
          id,
          actorId,
          'STATUS_CHANGED',
          { status: current.status },
          { status: input.status },
          note,
        );
        const recipients = new Set([current.requesterId, input.assigneeId]);
        for (const userId of recipients) {
          if (userId && userId !== actorId) {
            await notify(conn, { userId, ticketId: id, type: 'STATUS_CHANGED', title: input.title, status: input.status });
          }
        }
      }
      if (current.assigneeId !== input.assigneeId) {
        await insertEvent(
          conn,
          id,
          actorId,
          'ASSIGNEE_CHANGED',
          { assigneeId: current.assigneeId },
          { assigneeId: input.assigneeId },
        );
        if (input.assigneeId && input.assigneeId !== actorId) {
          await notify(conn, { userId: input.assigneeId, ticketId: id, type: 'ASSIGNEE_CHANGED', title: input.title, status: input.status });
        }
      }
      if (current.categoryId !== input.categoryId) {
        await insertEvent(
          conn,
          id,
          actorId,
          'CATEGORY_CHANGED',
          { categoryId: current.categoryId },
          { categoryId: input.categoryId },
        );
      }
      if (current.priority !== input.priority) {
        await insertEvent(
          conn,
          id,
          actorId,
          'PRIORITY_CHANGED',
          { priority: current.priority },
          { priority: input.priority },
        );
      }

      await saveAttachmentRows(conn, id, actorId, attachments.filter(file => files.some(upload => upload.filename === file.id)), removeAttachments);
      await conn.commit();
      for (const file of files) file.committed = true;
      return this.find(id, account);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async batch(selection, update, account) {
    const ids = selection.map(item => item.id);
    const placeholders = ids.map(() => '?').join(',');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `${selectBase} WHERE id IN (${placeholders}) AND archived_at IS NULL ORDER BY id FOR UPDATE`, ids,
      );
      const versions = new Map(selection.map(item => [item.id, item.version]));
      if (rows.length !== ids.length || rows.some(row => versions.get(Number(row.id)) !== Number(row.version))) {
        throw new AppError(409, 'CONFLICT', 'Một hoặc nhiều phiếu đã thay đổi');
      }
      const categoryId = rows[0].categoryId;
      if (rows.some(row => row.categoryId !== categoryId)) throw new AppError(422, 'BATCH_CATEGORY');
      if ('targetId' in update) {
        const target = rows.find(row => Number(row.id) === update.targetId);
        if (!target || target.status === 'CLOSED') throw new AppError(422, 'BATCH_TARGET');
        if (rows.some(row => row.requesterId !== target.requesterId)) throw new AppError(422, 'BATCH_REQUESTER');
        for (const source of rows.filter(row => row !== target)) {
          await conn.execute(
            'UPDATE tickets SET archived_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3), version = version + 1 WHERE id = ?',
            [source.id],
          );
          await insertEvent(conn, source.id, account.id, 'MERGED_INTO', null, { id: Number(target.id), code: target.code });
          await insertEvent(conn, target.id, account.id, 'MERGED_TICKET', null, { id: Number(source.id), code: source.code });
        }
        await conn.execute('UPDATE tickets SET updated_at = UTC_TIMESTAMP(3), version = version + 1 WHERE id = ?', [target.id]);
      } else {
        if (rows.some(row => row.status === 'CLOSED')) throw new AppError(422, 'BATCH_CLOSED');
        const { assigneeId } = update;
        await assertActiveTechnician(assigneeId, categoryId, conn);
        for (const row of rows.filter(row => Number(row.assigneeId) !== assigneeId)) {
          await conn.execute(
            'UPDATE tickets SET assignee_id = ?, updated_at = UTC_TIMESTAMP(3), version = version + 1 WHERE id = ?',
            [assigneeId, row.id],
          );
          await insertEvent(conn, row.id, account.id, 'ASSIGNEE_CHANGED',
            { assigneeId: row.assigneeId == null ? null : Number(row.assigneeId) }, { assigneeId });
          if (assigneeId !== account.id) {
            await notify(conn, { userId: assigneeId, ticketId: row.id, type: 'ASSIGNEE_CHANGED', title: row.title, status: row.status });
          }
        }
      }
      await conn.commit();
      return { count: 'targetId' in update ? rows.length - 1 : rows.length };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async archive(ids) {
    const selected = [...new Set(ids)];
    const placeholders = selected.map(() => '?').join(',');
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [existing] = await conn.execute(
        `SELECT id FROM tickets WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`, selected,
      );
      if (existing.length !== selected.length) throw new AppError(404, 'RECORD_MISSING');
      const [result] = await conn.execute(
        `UPDATE tickets SET archived_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
         WHERE id IN (${placeholders}) AND archived_at IS NULL`, selected,
      );
      await conn.commit();
      return result.affectedRows;
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
