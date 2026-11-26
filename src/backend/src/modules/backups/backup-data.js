import { demoTasks } from '../tasks/task.routes.js';
import { demoProfiles } from '../accounts/profile.routes.js';
import { pool } from '../../database/pool.js';
import { config } from '../../configs/env.js';
import { demoRepository } from '../categories/demo.repository.js';
import { getAttachmentPath } from '../tickets/attachments.js';
import { tickets } from '../tickets/tickets.js';
import { demoNumberRules } from '../tickets/numbering.js';
import { users } from '../users/users.js';

const selects = {
  users: 'SELECT u.id, u.email, u.full_name, u.phone, u.is_active, u.created_at, u.updated_at FROM users u JOIN organization_members m ON m.user_id = u.id ORDER BY u.id',
  organizations: 'SELECT * FROM organizations ORDER BY id',
  organization_members: 'SELECT * FROM organization_members ORDER BY user_id',
  roles: 'SELECT * FROM roles ORDER BY id',
  user_roles: 'SELECT * FROM user_roles ORDER BY user_id, role_id',
  categories: 'SELECT * FROM categories ORDER BY id',
  technician_categories: 'SELECT * FROM technician_categories ORDER BY user_id, category_id',
  tickets: 'SELECT * FROM tickets ORDER BY id',
  ticket_number_rules: 'SELECT * FROM ticket_number_rules ORDER BY category_id',
  ticket_comments: 'SELECT * FROM ticket_comments ORDER BY id',
  ticket_events: 'SELECT * FROM ticket_events ORDER BY id',
  ticket_attachments: 'SELECT * FROM ticket_attachments ORDER BY id',
  notifications: 'SELECT * FROM notifications ORDER BY id',
  user_profiles: 'SELECT p.user_id, p.details, TO_BASE64(p.avatar) AS avatar, p.avatar_mime FROM user_profiles p JOIN organization_members m ON m.user_id = p.user_id ORDER BY p.user_id',
  task_items: "SELECT id, title, description, status, DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date, assignee_id, created_by, version FROM task_items ORDER BY id",
};

async function mysqlSnapshot() {
  const connection = await pool.getConnection();
  try {
    await connection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await connection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    const data = {};
    for (const [table, sql] of Object.entries(selects)) [data[table]] = await connection.query(sql);
    await connection.commit();
    return data;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function collectBackupData() {
  const demo = config.dataSource === 'demo';
  const data = demo
    ? structuredClone({ users, tickets, ticketNumberRules: demoNumberRules(), categories: demoRepository.snapshot(), tasks: demoTasks, profiles: [...demoProfiles] })
    : await mysqlSnapshot();
  const keys = demo
    ? data.tickets.flatMap(ticket => [...(ticket.attachments ?? []), ...(ticket.archivedAttachments ?? [])].map(file => file.id))
    : data.ticket_attachments.map(file => file.storage_key);

  return {
    snapshot: { version: 2, mode: config.dataSource, createdAt: new Date().toISOString(), data },
    files: [...new Set(keys)].map(key => ({ name: 'attachments/' + key, path: getAttachmentPath(key) })),
  };
}
