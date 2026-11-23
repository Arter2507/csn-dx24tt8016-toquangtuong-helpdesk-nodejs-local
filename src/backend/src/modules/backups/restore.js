import { createWriteStream } from 'node:fs';
import { access, link, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';
import { pool } from '../../database/pool.js';
import { config } from '../../configs/env.js';
import { AppError } from '../../shared/errors.js';
import { demoRepository } from '../categories/demo.repository.js';
import { demoProfiles } from '../accounts/profile.routes.js';
import { demoTasks } from '../tasks/task.routes.js';
import { ensureAttachmentDirectory, getAttachmentPath } from '../tickets/attachments.js';
import { tickets } from '../tickets/tickets.js';
import { users } from '../users/users.js';

const invalid = () => new AppError(422, 'RESTORE_INVALID', 'Bản sao thiếu dữ liệu, hỏng hoặc khác chế độ');
const tables = ['categories', 'technician_categories', 'tickets', 'ticket_comments', 'ticket_events',
  'ticket_attachments', 'notifications', 'user_profiles', 'task_items'];
const optional = new Set(['user_profiles', 'task_items']);
const versionedTables = new Set(['tickets', 'task_items']);
const jsonColumns = new Set(['details', 'old_value', 'new_value']);

function value(column, input) {
  if (jsonColumns.has(column) && input !== null) return JSON.stringify(input);
  if (column === 'avatar' && input !== null) return Buffer.from(input, 'base64');
  if (column.endsWith('_at') && input !== null) return new Date(input);
  return input;
}

function refreshVersions(previous, restored) {
  const versions = new Map(previous.map(row => [String(row.id), Number(row.version)]));
  for (const row of restored) {
    row.version = Math.max(Number(row.version), versions.get(String(row.id)) ?? 0) + 1;
  }
}

function replaceRows(target, source) {
  target.length = 0;
  for (const row of source) target.push(row);
}

async function mysqlRestore(data) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [accounts] = await conn.query('SELECT id FROM users FOR UPDATE');
    const ids = new Set(accounts.map(account => Number(account.id)));
    if (!data.users.every(user => ids.has(Number(user.id)))) {
      throw new AppError(409, 'RESTORE_ACCOUNTS', 'Bản sao có tài khoản chưa tồn tại trong hệ thống');
    }
    for (const user of data.users) {
      await conn.execute('UPDATE users SET full_name = ?, phone = ? WHERE id = ?', [user.full_name, user.phone, user.id]);
    }
    const included = tables.filter(table => Array.isArray(data[table]));
    for (const table of included.filter(table => versionedTables.has(table))) {
      const [current] = await conn.query('SELECT id, version FROM ' + table);
      refreshVersions(current, data[table]);
    }
    for (const table of [...included].reverse()) await conn.query('DELETE FROM ' + table);
    for (const table of included) {
      const [columns] = await conn.query('SHOW COLUMNS FROM ' + table);
      const available = columns.map(column => column.Field);
      for (const row of data[table]) {
        const selected = available.filter(column => Object.hasOwn(row, column));
        if (!selected.length) throw invalid();
        await conn.execute(
          'INSERT INTO ' + table + ' (' + selected.map(column => '\x60' + column + '\x60').join(',') +
            ') VALUES (' + selected.map(() => '?').join(',') + ')',
          selected.map(column => value(column, row[column])),
        );
      }
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function restoreArchive(archive) {
  const zip = await yauzl.openPromise(archive, { autoClose: false }).catch(() => { throw invalid(); });
  let snapshot;
  const staged = new Map();
  const added = [];
  try {
    for await (const entry of zip.eachEntry()) {
      if (entry.fileName === 'data.json' && !snapshot && entry.uncompressedSize <= 128_000_000) {
        try {
          snapshot = JSON.parse(await buffer(await zip.openReadStreamPromise(entry)));
        } catch { throw invalid(); }
      } else {
        const match = /^attachments\/([a-f0-9]{32})$/.exec(entry.fileName);
        if (!match || staged.has(match[1]) || entry.uncompressedSize > 50_000_000) throw invalid();
        ensureAttachmentDirectory();
        const target = getAttachmentPath(match[1]);
        const pending = target + '.restore-' + randomUUID();
        staged.set(match[1], { target, pending });
        await pipeline(await zip.openReadStreamPromise(entry), createWriteStream(pending, { flags: 'wx', mode: 0o600 }));
      }
    }
    if (snapshot?.version !== 2 || snapshot.mode !== config.dataSource || !snapshot.data) throw invalid();
    const { data } = snapshot;
    const demo = snapshot.mode === 'demo';
    const required = ['users', ...(demo ? ['categories', 'tickets'] : tables.filter(table => !optional.has(table)))];
    if (required.some(key => !Array.isArray(data[key]))) throw invalid();
    const keys = demo
      ? data.tickets.flatMap(ticket => [...(ticket.attachments ?? []), ...(ticket.archivedAttachments ?? [])].map(file => file.id))
      : data.ticket_attachments.map(file => file.storage_key);
    const expected = new Set(keys);
    if (expected.size !== staged.size || [...expected].some(key => !staged.has(key))) throw invalid();
    for (const { target, pending } of staged.values()) {
      const exists = await access(target).then(() => true, error => {
        if (error.code !== 'ENOENT') throw error;
        return false;
      });
      if (!exists) {
        await link(pending, target);
        added.push(target);
      }
    }
    if (demo) {
      demoRepository.replace(data.categories);
      replaceRows(users, data.users);
      refreshVersions(tickets, data.tickets);
      replaceRows(tickets, data.tickets);
      if (Array.isArray(data.tasks)) {
        refreshVersions(demoTasks, data.tasks);
        replaceRows(demoTasks, data.tasks);
      }
      if (Array.isArray(data.profiles)) {
        demoProfiles.clear();
        for (const [id, profile] of data.profiles) demoProfiles.set(id, profile);
      }
    } else {
      await mysqlRestore(data);
    }
    return { restoredAt: new Date().toISOString() };
  } catch (error) {
    await Promise.allSettled(added.map(path => unlink(path)));
    throw error;
  } finally {
    zip.close();
    await Promise.allSettled([...staged.values()].map(file => unlink(file.pending)));
  }
}
