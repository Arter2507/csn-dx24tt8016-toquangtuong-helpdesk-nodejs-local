import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { prepareAttachments } from './attachments.js';

const transitions = {
  NEW: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

function ticketCode(id) {
  return 'HD-' + String(id).padStart(3, '0');
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAttachment(row) {
  return {
    id: row.storageKey,
    originalName: row.originalName,
    mimeType: row.mimeType,
    size: Number(row.sizeBytes),
  };
}

async function loadAttachments(ticketId) {
  const [rows] = await pool.execute(
    `SELECT storage_key AS storageKey, original_name AS originalName,
            mime_type AS mimeType, size_bytes AS sizeBytes
     FROM ticket_attachments WHERE ticket_id = ? ORDER BY id ASC`,
    [ticketId],
  );
  return rows.map(mapAttachment);
}

async function loadHistory(ticketId) {
  const [rows] = await pool.execute(
    `SELECT event_type AS eventType, new_value AS newValue, created_at AS createdAt
     FROM ticket_events
     WHERE ticket_id = ? AND event_type IN ('CREATED', 'STATUS_CHANGED')
     ORDER BY created_at ASC, id ASC`,
    [ticketId],
  );
  return rows.map((row) => {
    let status = 'NEW';
    if (row.eventType === 'STATUS_CHANGED' && row.newValue) {
      const value = typeof row.newValue === 'string' ? JSON.parse(row.newValue) : row.newValue;
      status = value.status || status;
    }
    return { status, at: toIso(row.createdAt) };
  });
}

async function mapTicket(row) {
  if (!row) return null;
  const id = Number(row.id);
  return {
    id,
    code: ticketCode(id),
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
    attachments: await loadAttachments(id),
    history: await loadHistory(id),
  };
}

const selectBase = `
  SELECT
    id, title, description, category_id AS categoryId, requester_id AS requesterId,
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
    'SELECT id FROM users WHERE id = ? AND is_active = 1',
    [requesterId],
  );
  if (!rows[0]) throw new AppError(422, 'INVALID_REQUESTER', 'Người gửi không hoạt động');
}

async function assertActiveTechnician(assigneeId) {
  const [rows] = await pool.execute(
    `SELECT u.id
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ? AND u.is_active = 1 AND r.code = 'TECHNICIAN'`,
    [assigneeId],
  );
  if (!rows[0]) throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
}

async function insertEvent(conn, ticketId, actorId, eventType, oldValue, newValue, note = null) {
  await conn.execute(
    `INSERT INTO ticket_events
      (ticket_id, actor_id, event_type, old_value, new_value, note, created_at)
     VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, UTC_TIMESTAMP(3))`,
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

async function saveAttachmentRows(conn, ticketId, uploaderId, attachments) {
  await conn.execute('DELETE FROM ticket_attachments WHERE ticket_id = ?', [ticketId]);
  for (const file of attachments) {
    await conn.execute(
      `INSERT INTO ticket_attachments
        (ticket_id, uploader_id, original_name, storage_key, mime_type, size_bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))`,
      [ticketId, uploaderId, file.originalName, file.id, file.mimeType, file.size],
    );
  }
}

export const ticketsMysql = {
  async list(q) {
    const conditions = ['archived_at IS NULL'];
    const values = [];
    const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });

    if (q.search) {
      conditions.push('(LOCATE(?, title) > 0 OR LOCATE(?, description) > 0)');
      values.push(q.search, q.search);
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

    // createdOn already filtered in SQL; day kept for parity with demo path
    void day;
    const items = [];
    for (const row of rows) items.push(await mapTicket(row));
    return { items, total: Number(countRows[0].total) };
  },

  async find(id) {
    const [rows] = await pool.execute(`${selectBase} WHERE id = ? AND archived_at IS NULL`, [id]);
    return mapTicket(rows[0]);
  },

  async create(input, files = []) {
    await assertActiveCategory(input.categoryId);
    await assertActiveRequester(input.requesterId);
    const attachments = await prepareAttachments([], files);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO tickets
          (requester_id, assignee_id, category_id, title, description, priority, status, version,
           resolved_at, closed_at, archived_at, created_at, updated_at)
         VALUES (?, NULL, ?, ?, ?, ?, 'NEW', 1, NULL, NULL, NULL, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))`,
        [input.requesterId, input.categoryId, input.title, input.description, input.priority],
      );
      const ticketId = result.insertId;
      await insertEvent(conn, ticketId, input.requesterId, 'CREATED', null, { status: 'NEW' });
      await saveAttachmentRows(conn, ticketId, input.requesterId, attachments);
      await conn.commit();
      return this.find(ticketId);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async update(id, input, files = []) {
    const current = await this.find(id);
    if (!current) return null;

    const { version, removeAttachments = [], ...changes } = input;
    if (
      current.version !== version ||
      current.status === 'CLOSED' ||
      (current.status !== input.status && !transitions[current.status].includes(input.status))
    ) {
      throw new AppError(409, 'CONFLICT', 'Phiên bản hoặc chuyển trạng thái không hợp lệ');
    }
    if (input.categoryId !== current.categoryId) await assertActiveCategory(input.categoryId);
    if (input.status !== 'NEW' && input.assigneeId === null) {
      throw new AppError(422, 'INVALID_ASSIGNEE', 'Chọn kỹ thuật viên đang hoạt động');
    }
    if (input.assigneeId !== null && input.assigneeId !== current.assigneeId) {
      await assertActiveTechnician(input.assigneeId);
    }

    const attachments = await prepareAttachments(current.attachments ?? [], files, removeAttachments);
    const actorId = input.assigneeId || current.requesterId;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `UPDATE tickets SET
           title = ?, description = ?, category_id = ?, assignee_id = ?, priority = ?, status = ?,
           version = version + 1,
           resolved_at = CASE
             WHEN ? = 'RESOLVED' THEN UTC_TIMESTAMP(3)
             WHEN ? = 'IN_PROGRESS' AND status = 'RESOLVED' THEN NULL
             ELSE resolved_at
           END,
           closed_at = CASE WHEN ? = 'CLOSED' THEN UTC_TIMESTAMP(3) ELSE closed_at END,
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
        );
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

      await saveAttachmentRows(conn, id, actorId, attachments);
      await conn.commit();
      return this.find(id);
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },

  async archive(ids) {
    if (!ids.length) return 0;
    const placeholders = ids.map(() => '?').join(',');
    const [existing] = await pool.execute(
      `SELECT id FROM tickets WHERE id IN (${placeholders}) AND archived_at IS NULL`,
      ids,
    );
    if (existing.length !== ids.length) throw new AppError(404, 'RECORD_MISSING');
    const [result] = await pool.execute(
      `UPDATE tickets SET archived_at = UTC_TIMESTAMP(3), updated_at = UTC_TIMESTAMP(3)
       WHERE id IN (${placeholders}) AND archived_at IS NULL`,
      ids,
    );
    return result.affectedRows;
  },
};
