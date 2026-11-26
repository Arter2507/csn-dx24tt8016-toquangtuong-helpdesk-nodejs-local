import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import mysql from 'mysql2/promise';

test('MySQL enforces organization roles, sessions and ticket workflows', {
  skip: process.env.HELPDESK_TEST_MYSQL !== '1',
  timeout: 60_000,
}, async (context) => {
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
      BACKUP_DIR: join(uploadDir, 'backups'), NODE_ENV: 'development', JWT_SECRET: randomBytes(32).toString('hex'),
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
    const localhost = client();
    const localhostOrigin = { Origin: 'http://localhost:4200' };
    await expectStatus(localhost.request('/auth/refresh', 'POST', {}, localhostOrigin), 401);
    await expectStatus(localhost.request('/auth/refresh', 'POST', {}, { Origin: 'http://localhost:4300' }), 403);
    assert.equal((await data(localhost.request('/auth/login', 'POST', {
      email: 'user@example.test', password: 'password',
    }, localhostOrigin))).role, 'USER');
    await expectStatus(localhost.request('/auth/logout', 'POST', {}, localhostOrigin), 204);
    await expectStatus(user.request('/tickets'), 401);
    await expectStatus(user.request('/tickets/number-preview?categoryId=3'), 401);
    await expectStatus(user.request('/auth/login', 'POST', { email: 'user@example.test', password: 'wrong' }), 401);
    assert.deepEqual((await login(user, 'user')).roleCodes, ['USER']);
    const oldCookies = user.cookieHeader();
    await expectStatus(user.request('/auth/refresh', 'POST', {}), 200);
    await expectStatus(client().request('/auth/refresh', 'POST', {}, { Cookie: oldCookies }), 401);
    assert.deepEqual((await login(tech, 'tech')).roleCodes, ['TECHNICIAN', 'USER']);
    assert.equal((await login(admin, 'admin')).role, 'OWNER');
    const organization = await data(admin.request('/organizations'));
    assert.equal(organization.ownerName, 'Quản trị mẫu');
    await data(admin.request('/organizations', 'PUT', { name: 'Tổ chức kiểm thử', code: organization.code, description: 'IAM' }));
    assert.equal((await data(admin.request('/users/2'))).role, 'TECHNICIAN');
    await expectStatus(user.request('/users'), 403);
    await expectStatus(user.request('/backups/snapshot'), 403);
    await expectStatus(user.request('/settings/ticket-number-rules'), 403);
    await expectStatus(tech.request('/settings/ticket-number-rules/3', 'PUT', {}), 403);
    assert.equal((await data(admin.request('/tickets/3'))).code, 'HD-003');
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
    assert.equal(created.code, '0001');
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
    await expectStatus(tech.request(path + '/transitions', 'POST', { version: progress.version, toStatus: 'PENDING_CUSTOMER' }), 422);
    const comment = await data(tech.request(path + '/comments', 'POST', { body: 'Đã thử in lại.' }), 201);
    assert.equal((await data(user.request(path + '/comments')))[0].id, comment.id);
    const pending = await data(tech.request(path + '/transitions', 'POST', {
      version: progress.version, toStatus: 'PENDING_CUSTOMER', note: 'Cho mình xin mã lỗi.',
    }));
    const privateComment = await data(tech.request(path + '/comments', 'POST', { body: 'Trao đổi nội bộ', internal: true }), 201);
    assert.ok((await data(admin.request(path + '/comments'))).some(item => item.id === privateComment.id && item.internal));
    assert.ok(!(await data(user.request(path + '/comments'))).some(item => item.id === privateComment.id));
    await expectStatus(user.request(path + '/comments', 'POST', { body: 'Ghi chú không được phép', internal: true }), 403);
    assert.equal((await data(user.request(path))).status, 'PENDING_CUSTOMER');
    const response = await data(user.request(path + '/comments', 'POST', { body: 'Mã lỗi là 102.' }), 201);
    assert.equal(response.ticketUpdate.status, 'IN_PROGRESS');
    const resumed = await data(tech.request(path));
    assert.equal(resumed.version, pending.version + 1);
    await expectStatus(tech.request(path, 'PATCH', { ...payload(pending), status: 'IN_PROGRESS' }), 409);
    const firstResolution = await data(tech.request(path, 'PATCH', { ...payload(resumed), status: 'RESOLVED', note: 'Đã sửa lần đầu.' }));
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

    const networkRulePath = '/settings/ticket-number-rules/3';
    const networkRule = { prefix: 'pycm', nextNumber: 1, digits: 5, suffix: '' };
    await expectStatus(admin.request(networkRulePath, 'PUT', { ...networkRule, digits: 0 }), 422);
    await expectStatus(admin.request(networkRulePath, 'PUT', networkRule), 204);
    assert.equal((await data(user.request('/tickets/number-preview?categoryId=3'))).code, 'PYCM00001');
    assert.equal((await data(user.request('/tickets/number-preview?categoryId=2'))).code, '0002');
    const createNetworkTicket = () => data(user.request('/tickets', 'POST', {
      title: 'Yêu cầu mạng', description: 'Thử đánh số tự động', categoryId: 3,
    }), 201);
    const numbered = await Promise.all([createNetworkTicket(), createNetworkTicket()]);
    assert.deepEqual(numbered.map(item => item.code).sort(), ['PYCM00001', 'PYCM00002']);
    const found = await data(user.request('/tickets?search=' + encodeURIComponent('#' + numbered[0].code)));
    assert.deepEqual(found.map(item => item.id), [numbered[0].id]);
    await expectStatus(admin.request('/tickets/archive', 'POST', { ids: [numbered[0].id] }), 200);
    await expectStatus(admin.request(networkRulePath, 'PUT', networkRule), 204);
    assert.equal((await data(user.request('/tickets/number-preview?categoryId=3'))).code, 'PYCM00003');
    assert.equal((await createNetworkTicket()).code, 'PYCM00003');

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
    await expectStatus(user.request('/profile'), 401);
    await login(user, 'user-changed');
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
    await expectStatus(admin.request(networkRulePath, 'PUT', { ...networkRule, prefix: 'NET' }), 204);
    await expectStatus(user.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: true }), 403);
    await expectStatus(admin.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: false }), 422);
    const restored = await data(admin.request('/backups/' + manual.id + '/restore', 'POST', { confirmed: true }));
    assert.equal((await jobs()).jobs.find(job => job.id === restored.safetyBackupId).kind, 'pre_restore');
    assert.equal((await data(tech.request('/tasks'))).tasks.find(item => item.id === task.id).status, 'TODO');
    await expectStatus(tech.request('/tasks/' + task.id, 'PATCH', { status: 'DONE', version: movedTask.version }), 409);
    assert.equal((await data(user.request('/profile'))).details.bio, 'Ghi chú ban đầu');
    assert.equal((await data(user.request('/profile'))).email, 'user-changed@example.test');
    const restoredRule = (await data(admin.request('/settings/ticket-number-rules'))).find(rule => rule.categoryId === 3);
    assert.equal(restoredRule.prefix, 'PYCM');
    assert.equal(restoredRule.nextNumber, 4);

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

    await context.test('ticket search and transactional batch workflows', async () => {
      const ticketsForBatch = await Promise.all(['Thiết bị A', 'Thiết bị B', 'Thiết bị C'].map(title =>
        data(user.request('/tickets', 'POST', { title, description: 'Kiểm tra kết nối tại văn phòng', categoryId: 3 }), 201)));
      const [primary, duplicate, third] = ticketsForBatch;
      const batchTicket = ({ id, version }) => ({ id, version });
      for (const query of ['mạng', 'mang']) {
        const categorySearch = await data(admin.request('/tickets?search=' + encodeURIComponent(query) + '&pageSize=100'));
        assert.ok(categorySearch.some(row => row.id === primary.id));
      }
      const partialCode = await data(admin.request('/tickets?search=' + encodeURIComponent(primary.code.slice(1, -1))));
      assert.ok(partialCode.some(row => row.id === primary.id));
      assert.ok((await data(admin.request('/tickets/technicians?categoryId=3'))).some(person => person.id === 2));
      const batchAssign = { selection: [primary, duplicate].map(batchTicket), update: { assigneeId: 2 } };
      await expectStatus(tech.request('/tickets/batch', 'POST', batchAssign), 403);
      const differentCategory = await data(user.request('/tickets', 'POST', {
        title: 'Phiếu khác loại', description: 'Kiểm tra phần cứng', categoryId: 2,
      }), 201);
      const mixedBatch = { ...batchAssign, selection: [primary, differentCategory].map(batchTicket) };
      assert.equal((await (await expectStatus(admin.request('/tickets/batch', 'POST', mixedBatch), 422)).json()).error.code, 'BATCH_CATEGORY');
      assert.equal((await data(admin.request('/tickets/' + primary.id))).assigneeId, null);
      assert.equal((await data(admin.request('/tickets/batch', 'POST', batchAssign))).count, 2);
      await expectStatus(admin.request('/tickets/batch', 'POST', batchAssign), 409);
      const assigned = await Promise.all([primary, duplicate].map(row => data(admin.request('/tickets/' + row.id))));
      assert.ok(assigned.every(row => row.assigneeId === 2 && row.version === primary.version + 1));
      const otherRequester = await data(tech.request('/tickets', 'POST', {
        title: 'Phiếu từ người khác', description: 'Kiểm tra từ tài khoản khác', categoryId: 3,
      }), 201);
      const invalidMerge = { selection: [third, otherRequester].map(batchTicket), update: { targetId: third.id } };
      assert.equal((await (await expectStatus(admin.request('/tickets/batch', 'POST', invalidMerge), 422)).json()).error.code, 'BATCH_REQUESTER');
      await data(user.request('/tickets/' + duplicate.id + '/comments', 'POST', { body: 'Trao đổi trước khi gộp' }), 201);
      const merged = await data(admin.request('/tickets/batch', 'POST', {
        selection: assigned.map(batchTicket), update: { targetId: primary.id },
      }));
      assert.equal(merged.count, 1);
      const source = await data(user.request('/tickets/' + duplicate.id));
      assert.equal(source.mergedInto.id, primary.id);
      assert.ok(source.archivedAt);
      assert.equal((await data(user.request('/tickets/' + primary.id))).mergedTickets[0].id, duplicate.id);
      const sourceComments = await data(user.request('/tickets/' + duplicate.id + '/comments'));
      assert.equal(sourceComments[0].body, 'Trao đổi trước khi gộp');
      await expectStatus(tech.request('/tickets/' + duplicate.id), 404);
      await expectStatus(user.request('/tickets/' + duplicate.id, 'PATCH', { version: source.version }), 404);
      assert.ok(!(await data(user.request('/tickets?pageSize=100'))).some(row => row.id === duplicate.id));
    });

    const newcomer = client();
    const password = 'local-test-password';
    const registration = { email: 'newcomer@example.test', fullName: 'Người tự đăng ký', password };
    await data(newcomer.request('/auth/register', 'POST', registration), 201);
    assert.equal((await login(newcomer, 'newcomer', password)).status, 'UNASSIGNED');
    for (const path of ['/tickets', '/tasks', '/profile', '/users', '/organizations', '/notifications', '/backups']) {
      const blocked = await expectStatus(newcomer.request(path), 403);
      assert.equal((await blocked.json()).error.code, 'ORGANIZATION_REQUIRED');
    }
    const linked = await data(admin.request('/users', 'POST', {
      email: registration.email, fullName: 'Người đã vào tổ chức', role: 'USER', employeeCode: 'NEW-001', department: 'Hỗ trợ',
    }), 201);
    assert.equal(linked.invitation, null);
    assert.equal(linked.status, 'ACTIVE');
    await expectStatus(newcomer.request('/auth/me'), 401);
    assert.equal((await login(newcomer, 'newcomer', password)).organizationId, 1);
    await data(newcomer.request('/tickets'));
    await expectStatus(newcomer.request('/users'), 403);

    const invitedAdmin = await data(admin.request('/users', 'POST', {
      email: 'operator@example.test', fullName: 'Quản trị được mời', role: 'ADMIN',
    }), 201);
    const tokenOf = invitation => new URLSearchParams(new URL(invitation.path, origin).hash.slice(1)).get('token');
    const operator = client();
    await expectStatus(operator.request('/auth/activate', 'POST', { token: tokenOf(invitedAdmin.invitation), password }), 204);
    assert.equal((await login(operator, 'operator', password)).role, 'ADMIN');
    await data(operator.request('/organizations'));
    await expectStatus(operator.request('/organizations', 'PUT', { name: 'Khác', code: 'DIFFERENT', description: '' }), 403);
    await expectStatus(operator.request('/backups'), 403);
    await expectStatus(operator.request('/users/3', 'PATCH', { isActive: false }), 403);
    await expectStatus(operator.request('/users/3/avatar', 'POST', avatar), 403);
    await expectStatus(operator.request('/users/' + linked.id + '/avatar', 'POST', avatar), 204);
    const staffPhoto = await expectStatus(operator.request('/users/' + linked.id + '/avatar'), 200);
    assert.deepEqual(Buffer.from(await staffPhoto.arrayBuffer()), photo);
    await expectStatus(newcomer.request('/users/' + linked.id + '/avatar'), 403);
    await expectStatus(operator.request('/users/' + invitedAdmin.id, 'PATCH', { role: 'USER' }), 403);
    await expectStatus(operator.request('/users/' + linked.id, 'PATCH', { role: 'ADMIN' }), 403);
    await expectStatus(operator.request('/users', 'POST', {
      email: 'peer@example.test', fullName: 'Ngoài quyền', role: 'ADMIN',
    }), 403);
    assert.equal((await data(operator.request('/users/' + linked.id, 'PATCH', { isActive: false }))).employeeCode, 'NEW-001');
    await expectStatus(newcomer.request('/auth/me'), 401);
    await data(operator.request('/users/' + linked.id, 'PATCH', { isActive: true, role: 'TECHNICIAN' }));
    assert.equal((await login(newcomer, 'newcomer', password)).role, 'TECHNICIAN');

    const other = await data(operator.request('/users', 'POST', {
      email: 'created@example.test', fullName: 'Tài khoản thử', role: 'USER',
    }), 201);
    assert.equal(other.status, 'PENDING_ACTIVATION');
    assert.match(other.invitation.path, /^\/activate#token=[0-9a-f]{64}$/);
    await expectStatus(tech.request('/auth/login', 'POST', { email: other.email, password }), 401);
    const invite = await data(operator.request('/users/' + other.id + '/invitation', 'POST', {}));
    await expectStatus(tech.request('/auth/activate', 'POST', { token: tokenOf(other.invitation), password }), 422);
    await connection.execute('UPDATE users SET activation_expires_at = UTC_TIMESTAMP(3) WHERE id = ?', [other.id]);
    await expectStatus(tech.request('/auth/activate', 'POST', { token: tokenOf(invite), password }), 422);
    const validInvite = await data(operator.request('/users/' + other.id + '/invitation', 'POST', {}));
    const activation = { token: tokenOf(validInvite), password };
    const outcomes = await Promise.all([tech.request('/auth/activate', 'POST', activation), newcomer.request('/auth/activate', 'POST', activation)]);
    assert.deepEqual(outcomes.map(response => response.status).sort(), [204, 422]);
    const pendingMembers = await data(operator.request('/users?status=PENDING_ACTIVATION&filter=USER'));
    assert.ok(!pendingMembers.some(row => row.id === other.id));
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
