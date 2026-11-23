import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import mysql from 'mysql2/promise';

test('MySQL protects sessions and ticket workflows, stores files and persists notifications', {
  skip: process.env.HELPDESK_TEST_MYSQL !== '1',
  timeout: 60_000,
}, async () => {
  const database = 'tram_meo_test_' + randomBytes(8).toString('hex');
  const uploadDir = await mkdtemp(join(tmpdir(), 'tram-meo-test-'));
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });
  let server;
  let pool;
  try {
    await connection.query('CREATE DATABASE ' + database);
    await connection.changeUser({ database });
    const migrations = new URL('../prisma/migrations/', import.meta.url);
    for (const folder of (await readdir(migrations, { withFileTypes: true })).filter(file => file.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      await connection.query(await readFile(new URL(folder.name + '/migration.sql', migrations), 'utf8'));
    }
    await connection.query(await readFile(new URL('../sql/helpdesk-sample-data.sql', import.meta.url), 'utf8'));
    const origin = 'http://127.0.0.1:4200';
    Object.assign(process.env, {
      DATA_SOURCE: 'mysql', DB_NAME: database, UPLOAD_DIR: uploadDir, CORS_ORIGIN: origin,
      BACKUP_DIR: join(uploadDir, 'backups'), NODE_ENV: 'test', JWT_SECRET: randomBytes(32).toString('hex'),
    });
    ({ pool } = await import('../src/database/pool.js'));
    const { app } = await import('../src/app.js');
    server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port + '/api/v1';

    function client() {
      const cookies = new Map();
      const cookieHeader = () => [...cookies].map(([name, value]) => name + '=' + value).join('; ');
      return {
        cookieHeader,
        async request(path, method = 'GET', body, options = {}) {
          const form = body instanceof FormData;
          const response = await fetch(base + path, {
            method,
            headers: {
              Origin: origin,
              Cookie: cookieHeader(),
              ...(!form && body !== undefined ? { 'Content-Type': 'application/json' } : {}),
              ...options,
            },
            body: form || body === undefined ? body : JSON.stringify(body),
          });
          for (const header of response.headers.getSetCookie()) {
            const pair = header.split(';')[0];
            const cut = pair.indexOf('=');
            cookies.set(pair.slice(0, cut), pair.slice(cut + 1));
          }
          return response;
        },
      };
    }
    async function expectStatus(promise, status) {
      const response = await promise;
      if (response.status !== status) assert.fail('Expected ' + status + ', got ' + response.status + ': ' + await response.text());
      return response;
    }
    async function data(promise, status = 200) {
      return (await (await expectStatus(promise, status)).json()).data;
    }
    async function login(client, prefix, password = 'password') {
      const response = await expectStatus(client.request('/auth/login', 'POST', { email: prefix + '@example.test', password }), 200);
      assert.ok(response.headers.getSetCookie().every(cookie => cookie.includes('HttpOnly') && cookie.includes('SameSite=Strict')));
      return (await response.json()).data;
    }

    const user = client();
    const tech = client();
    const admin = client();
    assert.equal(await data(user.request('/auth/mode')), 'mysql');
    await expectStatus(user.request('/tickets'), 401);
    await expectStatus(user.request('/auth/login', 'POST', { email: 'user@example.test', password: 'wrong' }), 401);
    assert.deepEqual((await login(user, 'user')).roleCodes, ['USER']);
    const oldCookies = user.cookieHeader();
    await expectStatus(user.request('/auth/refresh', 'POST', {}), 200);
    await expectStatus(client().request('/auth/refresh', 'POST', {}, { Cookie: oldCookies }), 401);
    assert.deepEqual((await login(tech, 'tech')).roleCodes, ['TECHNICIAN', 'USER']);
    await login(admin, 'admin');
    assert.equal((await data(admin.request('/users/2'))).role, 'TECHNICIAN');
    await expectStatus(user.request('/users'), 403);
    await expectStatus(user.request('/backups/snapshot'), 403);
    const specialties = await data(admin.request('/users/2/categories'));
    assert.ok(specialties.includes(2));
    await expectStatus(user.request('/users/2/categories'), 403);
    assert.deepEqual(await data(admin.request('/users/2/categories', 'PUT', { categoryIds: specialties })), specialties);
    await expectStatus(user.request('/tickets/2'), 404);
    await expectStatus(user.request('/tickets/2/comments'), 404);
    await expectStatus(user.request('/tickets?requesterId=4'), 200);
    assert.deepEqual(await data(user.request('/tickets?requesterId=4')), []);
    await expectStatus(user.request('/tickets', 'POST', {}, { Origin: 'http://127.0.0.1:4300' }), 403);

    const pdf = Buffer.from('%PDF-1.7\nTram Meo upload test');
    const form = new FormData();
    form.append('ticket', JSON.stringify({ title: 'Lỗi in', description: 'Máy chủ sập toàn hệ thống', categoryId: 2, requesterId: 4, priority: 'LOW' }));
    form.append('attachments', new Blob([pdf], { type: 'application/pdf' }), 'minh-chung.pdf');
    const created = await data(user.request('/tickets', 'POST', form), 201);
    assert.equal(created.requesterId, 1);
    assert.equal(created.priority, 'URGENT');
    const attachment = created.attachments[0];
    assert.equal(attachment.name, 'minh-chung.pdf');
    assert.deepEqual(await readFile(join(uploadDir, attachment.id)), pdf);
    await expectStatus(tech.request('/tickets/' + created.id + '/attachments/' + attachment.id), 404);
    const path = '/tickets/' + created.id;
    await expectStatus(user.request(path, 'PATCH', { title: 'Không được sửa', version: created.version }), 403);
    const payload = ({ title, description, priority, categoryId, assigneeId, status, version }) =>
      ({ title, description, priority, categoryId, assigneeId, status, version });

    await expectStatus(user.request(path, 'PATCH', { ...payload(created), assigneeId: 2 }), 403);
    await expectStatus(admin.request(path, 'PATCH', { ...payload(created), assigneeId: 5 }), 422);
    const assigned = await data(admin.request(path + '/assignee', 'PUT', { version: created.version, assigneeId: 2 }));
    const attachmentResponse = await expectStatus(tech.request(path + '/attachments/' + attachment.id), 200);
    assert.deepEqual(Buffer.from(await attachmentResponse.arrayBuffer()), pdf);
    await expectStatus(user.request(path, 'PATCH', { version: assigned.version, priority: 'LOW' }), 403);
    const priorityEdit = await data(tech.request(path, 'PATCH', { version: assigned.version, priority: 'HIGH' }));
    assert.equal(priorityEdit.priority, 'HIGH');
    const progress = await data(tech.request(path + '/transitions', 'POST', { version: priorityEdit.version, toStatus: 'IN_PROGRESS' }));
    await expectStatus(tech.request(path, 'PATCH', { ...payload(progress), status: 'RESOLVED' }), 422);
    const comment = await data(tech.request(path + '/comments', 'POST', { body: 'Đã thử in lại.' }), 201);
    assert.equal((await data(user.request(path + '/comments')))[0].id, comment.id);
    const firstResolution = await data(tech.request(path, 'PATCH', { ...payload(progress), status: 'RESOLVED', note: 'Đã sửa lần đầu.' }));
    const reopened = await data(user.request(path + '/transitions', 'POST', { version: firstResolution.version, toStatus: 'IN_PROGRESS', note: 'Cần thử thêm.' }));
    const [[timestamps]] = await connection.execute('SELECT resolved_at FROM tickets WHERE id = ?', [created.id]);
    assert.equal(timestamps.resolved_at, null);
    const resolved = await data(tech.request(path, 'PATCH', { ...payload(reopened), status: 'RESOLVED', note: 'Đã sửa.' }));
    assert.equal(resolved.history.at(-1).note, 'Đã sửa.');
    assert.equal((await data(user.request(path + '/history'))).at(-1).actorName, 'Kỹ thuật viên mẫu');
    await expectStatus(admin.request(path, 'PATCH', { ...payload(resolved), status: 'CLOSED' }), 403);
    const closed = await data(user.request(path, 'PATCH', { ...payload(resolved), status: 'CLOSED' }));
    assert.equal(closed.status, 'CLOSED');
    await expectStatus(user.request(path, 'PATCH', { ...payload(resolved), status: 'CLOSED' }), 409);
    assert.ok((await data(tech.request('/tickets'))).some(ticket => ticket.id === created.id));
    const updates = await data(user.request('/notifications'));
    const notification = updates.find(item => item.ticketId === created.id && item.type === 'COMMENT_ADDED');
    assert.ok(notification);
    await expectStatus(tech.request('/notifications/read', 'PATCH', { ids: [notification.id] }), 204);
    assert.equal((await data(user.request('/notifications'))).find(item => item.id === notification.id).readAt, null);
    await expectStatus(user.request('/notifications/read', 'PATCH', { ids: [notification.id] }), 204);
    assert.ok((await data(user.request('/notifications'))).find(item => item.id === notification.id).readAt);
    await expectStatus(user.request('/tickets/archive', 'POST', { ids: [created.id] }), 403);
    assert.equal((await data(admin.request('/tickets/archive', 'POST', { ids: [created.id] }))).count, 1);
    await expectStatus(tech.request(path), 404);



    const avatar = new FormData();
    const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPfcAAAAASUVORK5CYII=', 'base64');
    avatar.append('avatar', new Blob([photo], { type: 'image/png' }), 'sample.png');
    await expectStatus(user.request('/profile/avatar', 'POST', avatar), 204);
    const downloadPhoto = await expectStatus(user.request('/profile/avatar?download=1'), 200);
    assert.deepEqual(Buffer.from(await downloadPhoto.arrayBuffer()), photo);
    assert.match(downloadPhoto.headers.get('content-disposition'), /avatar\.png/);
    const profileInput = { fullName: 'Người gửi mẫu', phone: '0900000000', department: 'Hỗ trợ', jobTitle: 'Thực tập sinh', location: 'Văn phòng', birthDate: '2000-01-01', bio: 'Ghi chú ban đầu' };
    const currentProfile = await data(user.request('/profile', 'PATCH', profileInput));
    assert.equal(currentProfile.details.department, 'Hỗ trợ');
    await expectStatus(user.request('/auth/me', 'PATCH', { fullName: 'Người gửi mẫu', email: 'not-allowed@example.test' }), 403);
    await expectStatus(admin.request('/users/3', 'PATCH', {
      fullName: 'Quản trị mẫu', email: 'admin-new@example.test', isActive: true, role: 'ADMIN',
    }), 403);
    await expectStatus(admin.request('/users/1', 'PATCH', {
      fullName: 'Người gửi mẫu', email: 'user-changed@example.test', isActive: true, role: 'USER',
    }), 200);
    assert.equal((await data(user.request('/profile'))).email, 'user-changed@example.test');

    await expectStatus(user.request('/tasks'), 403);
    const task = await data(tech.request('/tasks', 'POST', {
      title: 'Kiểm tra thiết bị', description: 'Hạn kiểm tra trước tuần sau', status: 'TODO', assigneeId: 2, dueDate: '2026-11-28',
    }), 201);
    assert.equal(task.dueDate, '2026-11-28');
    assert.ok((await data(admin.request('/tasks'))).tasks.some(item => item.id === task.id));

    const jobs = () => data(admin.request('/backups'));
    const waitForBackup = async id => {
      for (let attempt = 0; attempt < 30; attempt++) {
        const job = (await jobs()).jobs.find(item => item.id === id);
        if (job?.status === 'completed') return job;
        assert.notEqual(job?.status, 'failed', JSON.stringify(job));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      assert.fail('Backup did not complete');
    };
    await expectStatus(user.request('/backups'), 403);
    await expectStatus(tech.request('/backups', 'POST', {}), 403);
    await expectStatus(admin.request('/backups/schedule', 'PUT', { enabled: true, intervalMinutes: 5 }), 422);
    const manual = await data(admin.request('/backups', 'POST', {}), 202);
    assert.equal((await waitForBackup(manual.id)).kind, 'manual');
    const archive = await expectStatus(admin.request('/backups/' + manual.id + '/download'), 200);
    const zip = Buffer.from(await archive.arrayBuffer());
    assert.equal(zip.subarray(0, 2).toString(), 'PK');
    assert.ok(zip.includes(Buffer.from('data.json')));
    assert.ok(zip.includes(Buffer.from('attachments/' + attachment.id)));
    assert.match(archive.headers.get('content-disposition'), /\.zip/);
    await expectStatus(user.request('/backups/' + manual.id + '/download'), 403);

    const movedTask = await data(tech.request('/tasks/' + task.id, 'PATCH', { status: 'DONE', version: task.version }));
    assert.equal(movedTask.status, 'DONE');
    await expectStatus(tech.request('/tasks/' + task.id, 'PATCH', { status: 'DOING', version: task.version }), 409);
    await data(user.request('/profile', 'PATCH', { ...profileInput, bio: 'Thay đổi sau sao lưu' }));
    await expectStatus(user.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: true }), 403);
    await expectStatus(admin.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: false }), 422);
    const restored = await data(admin.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: true }));
    assert.equal((await jobs()).jobs.find(job => job.id === restored.safetyBackupId).kind, 'pre_restore');
    assert.equal((await data(tech.request('/tasks'))).tasks.find(item => item.id === task.id).status, 'TODO');
    await expectStatus(tech.request('/tasks/' + task.id, 'PATCH', { status: 'DONE', version: movedTask.version }), 409);
    assert.equal((await data(user.request('/profile'))).details.bio, 'Ghi chú ban đầu');
    assert.equal((await data(user.request('/profile'))).email, 'user-changed@example.test');

    await expectStatus(admin.request('/backups/schedule/check', 'POST', {}), 204);
    await data(admin.request('/backups/schedule', 'PUT', { enabled: true, intervalMinutes: 30 }));
    const results = await Promise.all([
      admin.request('/backups/schedule/check', 'POST', {}),
      admin.request('/backups/schedule/check', 'POST', {}),
    ]);
    assert.deepEqual(results.map(response => response.status).sort(), [202, 204]);
    const automatic = (await results.find(response => response.status === 202).json()).data;
    assert.equal((await waitForBackup(automatic.id)).kind, 'automatic');
    assert.ok(Date.parse((await jobs()).schedule.nextAt) > Date.now());
    await data(admin.request('/backups/schedule', 'PUT', { enabled: false, intervalMinutes: 30 }));
    assert.equal((await jobs()).schedule.nextAt, null);

    const other = await data(admin.request('/users', 'POST', {
      email: 'created@example.test', fullName: 'Tài khoản thử', role: 'USER', password: 'local-test-password',
    }), 201);
    await login(tech, 'created', 'local-test-password');
    const profile = await data(tech.request('/auth/me', 'PATCH', { fullName: 'Tên mới', email: other.email }));
    assert.equal(profile.fullName, 'Tên mới');
    await expectStatus(tech.request('/auth/me/password', 'PATCH', { currentPassword: 'local-test-password', newPassword: 'next-test-password' }), 204);
    await expectStatus(tech.request('/auth/me'), 401);
    await login(tech, 'created', 'next-test-password');
    await expectStatus(admin.request('/users/' + other.id, 'PATCH', { isActive: false }), 200);
    await expectStatus(tech.request('/auth/me'), 401);
    await expectStatus(tech.request('/auth/refresh', 'POST', {}), 401);
    const adminCookies = admin.cookieHeader();
    await expectStatus(admin.request('/auth/logout', 'POST', {}), 204);
    await expectStatus(client().request('/auth/me', 'GET', undefined, { Cookie: adminCookies }), 401);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    try {
      await connection.query('DROP DATABASE IF EXISTS ' + database);
    } finally {
      await connection.end();
      await rm(uploadDir, { recursive: true, force: true });
    }
  }
});
