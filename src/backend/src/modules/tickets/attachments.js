import { mkdtempSync, rmSync } from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import multer from 'multer';
import { AppError } from '../../shared/errors.js';

const maxFiles = 5;
const maxBytes = 50_000_000;
let directory;

const receive = multer({
  storage: multer.diskStorage({
    destination(req, file, done) {
      try {
        if (!directory) {
          directory = mkdtempSync(join(tmpdir(), 'helpdesk-demo-'));
          process.once('exit', () => rmSync(directory, { recursive: true, force: true }));
        }
        done(null, directory);
      } catch (error) { done(error); }
    }
  }),
  preservePath: false,
  defParamCharset: 'utf8',
  limits: { files: maxFiles, fileSize: maxBytes + 1, fields: 1, fieldSize: 100_000, fieldNestingDepth: 0 }
}).array('attachments', maxFiles);

export async function discardAttachments(ids) {
  if (!directory) return;
  await Promise.allSettled(ids.map(id => unlink(join(directory, id))));
}

export function receiveTicket(req, res, next) {
  if (!req.is('multipart/form-data')) return next();
  if (Number(req.get('Content-Length')) > maxBytes + 200_000) {
    return next(new AppError(413, 'ATTACHMENT_SIZE', 'Tổng dung lượng đính kèm tối đa 50 MB.'));
  }
  receive(req, res, async error => {
    if (error instanceof multer.MulterError) {
      const tooLarge = error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_FIELD_VALUE';
      return next(new AppError(tooLarge ? 413 : 422, 'INVALID_UPLOAD',
        tooLarge ? 'Dung lượng đính kèm vượt giới hạn.' : 'Yêu cầu tải lên không hợp lệ hoặc có hơn 5 tệp.'));
    }
    if (error) return next(error.code ? error : new AppError(400, 'INVALID_UPLOAD', 'Không thể đọc dữ liệu tải lên.'));
    try {
      req.body = JSON.parse(req.body.ticket);
    } catch {
      await discardAttachments(req.files.map(file => file.filename));
      return next(new AppError(422, 'VALIDATION_ERROR', 'Thiếu thông tin yêu cầu hợp lệ.'));
    }
    next();
  });
}

export async function discardFailedUpload(error, req, res, next) {
  await discardAttachments((req.files ?? []).map(file => file.filename));
  next(error);
}

function fileType(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(bytes.toString('ascii', 0, 6))) return 'image/gif';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

export async function prepareAttachments(existing, files, removed = []) {
  if (removed.some(id => !existing.some(file => file.id === id))) {
    throw new AppError(422, 'INVALID_UPLOAD', 'Tệp cần gỡ không thuộc yêu cầu này.');
  }
  const kept = existing.filter(file => !removed.includes(file.id));
  if (kept.length + files.length > maxFiles) {
    throw new AppError(422, 'ATTACHMENT_COUNT', 'Mỗi yêu cầu chỉ được đính kèm tối đa 5 tệp.');
  }
  if ([...kept, ...files].reduce((total, file) => total + file.size, 0) > maxBytes) {
    throw new AppError(413, 'ATTACHMENT_SIZE', 'Tổng dung lượng đính kèm tối đa 50 MB.');
  }
  const added = [];
  for (const file of files) {
    const handle = await open(file.path, 'r');
    const header = Buffer.alloc(12);
    try { await handle.read(header, 0, header.length, 0); }
    finally { await handle.close(); }
    const type = fileType(header);
    if (!type || type !== file.mimetype) {
      throw new AppError(422, 'INVALID_FILE_TYPE', 'Chỉ hỗ trợ ảnh PNG, JPEG, GIF, WebP và tệp PDF hợp lệ.');
    }
    const name = file.originalname.replace(/[\p{Cc}]/gu, '').slice(0, 180) || 'tep-dinh-kem';
    added.push({ id: file.filename, name, size: file.size, type });
  }
  return [...kept, ...added];
}

export function sendAttachment(tickets, req, res, next) {
  const ticket = tickets.find(item => item.id === Number(req.params.ticketId) && !item.archivedAt);
  const file = ticket?.attachments?.find(item => item.id === req.params.attachmentId);
  if (!file || !directory) return next(new AppError(404, 'NOT_FOUND', 'Không tìm thấy tệp đính kèm.'));
  res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Type': file.type });
  res.download(join(directory, file.id), file.name, error => {
    if (error) next(error.status === 404 ? new AppError(404, 'NOT_FOUND', 'Không tìm thấy tệp đính kèm.') : error);
  });
}
