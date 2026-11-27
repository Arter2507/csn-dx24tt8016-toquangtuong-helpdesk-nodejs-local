import { createHash, timingSafeEqual } from 'node:crypto';
import express from 'express';
import { simpleParser } from 'mailparser';
import { z } from 'zod';
import { config } from '../../configs/env.js';
import { pool } from '../../database/pool.js';
import { AppError } from '../../shared/errors.js';
import { ticketsMysql } from '../tickets/mysql.repository.js';

const { inboundToken, inboundCategoryId } = config.notifications;
const digest = text => createHash('sha256').update(text).digest();
const senderSchema = z.email().max(254);

function authorizeRelay(req, res, next) {
  if (inboundToken.length < 32 || !Number.isSafeInteger(inboundCategoryId) || inboundCategoryId <= 0) {
    return next(new AppError(404, 'NOT_FOUND'));
  }
  if (!timingSafeEqual(digest(req.get('Authorization') ?? ''), digest('Bearer ' + inboundToken))) {
    return next(new AppError(401, 'UNAUTHENTICATED'));
  }
  next();
}

export const inboundTicketMail = [
  authorizeRelay,
  express.raw({ type: 'message/rfc822', limit: '256kb', inflate: false }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || !req.body.length) throw new AppError(422, 'VALIDATION_ERROR');
    const verified = senderSchema.safeParse(req.get('X-Verified-Sender')?.trim().toLowerCase());
    if (!verified.success) throw new AppError(422, 'MAIL_SENDER_UNVERIFIED');
    const mail = await simpleParser(req.body, {
      skipTextToHtml: true, skipImageLinks: true, maxHtmlLengthToParse: 100000,
    }).catch(() => { throw new AppError(422, 'VALIDATION_ERROR'); });
    const from = mail.from?.value ?? [];
    if (from.length !== 1 || from[0].address?.toLowerCase() !== verified.data) {
      throw new AppError(422, 'MAIL_SENDER_UNVERIFIED');
    }
    if (String(mail.headers.get('auto-submitted') ?? 'no').toLowerCase() !== 'no') {
      return res.status(204).end();
    }
    const [[requester]] = await pool.execute(
      `SELECT u.id FROM users u JOIN organization_members m ON m.user_id = u.id
       WHERE u.email = ? AND u.is_active = 1 AND u.password_hash IS NOT NULL`,
      [verified.data],
    );
    if (!requester) throw new AppError(422, 'MAIL_SENDER_UNVERIFIED');
    const title = mail.subject?.trim().slice(0, 200);
    const description = mail.text?.trim().slice(0, 10000);
    if (!title || !description) throw new AppError(422, 'VALIDATION_ERROR');
    const fingerprint = digest(verified.data + '\n' + (mail.messageId || digest(req.body).toString('hex'))).toString('hex');
    const result = await ticketsMysql.create({
      requesterId: Number(requester.id), categoryId: inboundCategoryId, title, description, mailFingerprint: fingerprint,
    });
    res.status(202).json({ success: true, data: { code: result?.code ?? null }, meta: null });
  },
];
