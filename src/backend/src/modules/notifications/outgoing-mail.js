import nodemailer from 'nodemailer';
import { readFileSync } from 'node:fs';
import { config } from '../../configs/env.js';
import { pool } from '../../database/pool.js';

const { smtpHost, smtpPort, smtpUser, smtpPassword, mailFrom, mailLanguage } = config.notifications;
const templates = JSON.parse(readFileSync(new URL('./mail-templates.json', import.meta.url), 'utf8'));
const transporter = smtpHost && mailFrom ? nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: config.auth.secureCookies && smtpPort !== 465,
  auth: smtpUser ? { user: smtpUser, pass: smtpPassword } : undefined,
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 12000,
  disableFileAccess: true,
  disableUrlAccess: true,
}) : null;

export const passwordResetMailEnabled = Boolean(transporter);

export async function sendPasswordReset(email, token) {
  const url = new URL('/reset-password', config.auth.origin);
  url.hash = new URLSearchParams({ token }).toString();
  const template = (templates[mailLanguage] ?? templates.vi).passwordReset;
  await transporter.sendMail({
    from: mailFrom,
    to: email,
    subject: template.subject,
    text: template.body.replace('{url}', url.href),
    headers: { 'Auto-Submitted': 'auto-generated' },
  });
}

export async function queueStatusMail(conn, { id, code, requesterId }, status) {
  if (!transporter) return;
  await conn.execute(
    'INSERT INTO ticket_status_mail (ticket_id, ticket_code, user_id, ticket_status, available_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3))',
    [id, code, requesterId, status],
  );
}

async function claimMail() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      'UPDATE ticket_status_mail SET failed_at = UTC_TIMESTAMP(3) WHERE attempts >= 5 AND sent_at IS NULL AND failed_at IS NULL AND available_at <= UTC_TIMESTAMP(3)',
    );
    const [[job]] = await conn.query(
      `SELECT id, ticket_id AS ticketId, ticket_code AS code, user_id AS userId, ticket_status AS status, attempts
       FROM ticket_status_mail
       WHERE sent_at IS NULL AND failed_at IS NULL AND available_at <= UTC_TIMESTAMP(3)
       ORDER BY available_at, id LIMIT 1 FOR UPDATE SKIP LOCKED`,
    );
    if (job) {
      await conn.execute(
        'UPDATE ticket_status_mail SET attempts = attempts + 1, available_at = UTC_TIMESTAMP(3) + INTERVAL 2 MINUTE WHERE id = ?',
        [job.id],
      );
    }
    await conn.commit();
    return job;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deliverStatusMail() {
  if (!transporter) return;
  for (let count = 0; count < 10; count++) {
    const job = await claimMail();
    if (!job) return;
    const [[recipient]] = await pool.execute(
      `SELECT u.email, t.title FROM tickets t JOIN users u ON u.id = t.requester_id
       JOIN organization_members m ON m.user_id = u.id
       WHERE t.id = ? AND t.display_code = ? AND u.id = ? AND t.archived_at IS NULL
         AND u.is_active = 1 AND u.password_hash IS NOT NULL`,
      [job.ticketId, job.code, job.userId],
    );
    if (!recipient?.email) {
      await pool.execute('UPDATE ticket_status_mail SET failed_at = UTC_TIMESTAMP(3) WHERE id = ? AND attempts = ?', [job.id, job.attempts + 1]);
      continue;
    }
    const template = templates[mailLanguage] ?? templates.vi;
    const url = new URL('/help-center/tickets/' + job.ticketId + '/view', config.auth.origin);
    const fields = { ...job, title: recipient.title, status: template.statuses[job.status] ?? job.status, url };
    const render = text => text.replace(/\{(\w+)\}/g, (_, key) => String(fields[key] ?? ''));
    try {
      await transporter.sendMail({
        from: mailFrom,
        to: recipient.email,
        subject: render(template.subject),
        text: render(template.body),
        messageId: '<ticket-status-' + job.id + '@' + url.hostname + '>',
        headers: { 'Auto-Submitted': 'auto-generated' },
      });
      await pool.execute('UPDATE ticket_status_mail SET sent_at = UTC_TIMESTAMP(3) WHERE id = ? AND attempts = ?', [job.id, job.attempts + 1]);
    } catch (error) {
      const delay = Math.min(30 * 2 ** job.attempts, 1800);
      await pool.execute(
        'UPDATE ticket_status_mail SET available_at = TIMESTAMPADD(SECOND, ?, UTC_TIMESTAMP(3)) WHERE id = ? AND attempts = ?',
        [delay, job.id, job.attempts + 1],
      );
      console.warn('Không gửi được email trạng thái phiếu', job.id, error.code ?? 'MAIL_ERROR');
    }
  }
}
