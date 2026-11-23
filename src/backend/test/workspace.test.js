import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
process.env.DATA_SOURCE = 'demo';
const { app } = await import('../src/app.js');

test('demo user and ticket management preserves state on a stale update', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const api = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const send = (path, method, data) => fetch(api + path, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(data)
  });
  try {
    const account = await send('/users', 'POST', { fullName: 'Người gửi', email: 'new@example.test', role: 'USER' });
    assert.equal(account.status, 201);
    const { data: requester } = await account.json();
    const details = { title: 'Lỗi mạng', description: 'Mất kết nối', categoryId: 3 };
    const created = await send('/tickets', 'POST', { ...details, requesterId: requester.id });
    assert.equal(created.status, 201);
    const { data: ticket } = await created.json();
    assert.match(ticket.code, /^HD-\d+$/);
    assert.equal(ticket.priority, 'MEDIUM');
    assert.ok(Date.parse(ticket.createdAt));
    assert.equal(ticket.updatedAt, ticket.createdAt);
    const path = '/tickets/' + ticket.id;
    const update = { ...details, assigneeId: 2, status: 'IN_PROGRESS', priority: 'HIGH', version: ticket.version };
    assert.equal((await send(path, 'PATCH', update)).status, 200);
    assert.equal((await send(path, 'PATCH', update)).status, 409);
    const response = await fetch(api + '/tickets?filter=IN_PROGRESS&priority=HIGH&categoryId=3&search=' + ticket.code);
    const result = await response.json();
    assert.equal(result.meta.totalItems, 1);
    assert.equal(result.data[0].version, 2);
    assert.equal(result.data[0].createdAt, ticket.createdAt);
    assert.ok(Date.parse(result.data[0].updatedAt) >= Date.parse(ticket.createdAt));
    const unmatched = await fetch(api + '/tickets?priority=LOW&categoryId=3');
    assert.equal((await unmatched.json()).meta.totalItems, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('ticket attachments and status history are saved together', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const api = 'http://127.0.0.1:' + server.address().port + '/api/v1/tickets';
  const data = { title: 'Kiểm tra tệp', description: 'Đính kèm ảnh', categoryId: 3, requesterId: 1 };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l2QAAAAASUVORK5CYII=', 'base64');
  const image = new Blob([png], { type: 'image/png' });
  const send = (url, method, ticket, files) => {
    const body = new FormData();
    body.append('ticket', JSON.stringify(ticket));
    for (const [file, name] of files) body.append('attachments', file, name);
    return fetch(url, { method, body });
  };

  try {
    const bogus = new Blob(['fake image'], { type: 'image/png' });
    assert.equal((await send(api, 'POST', data, [[bogus, 'fake.png']])).status, 422);
    assert.equal((await send(api, 'POST', data, Array.from({ length: 6 }, () => [image, 'extra.png']))).status, 422);
    const large = new Blob([Buffer.alloc(50_000_001)], { type: 'image/png' });
    assert.equal((await send(api, 'POST', data, [[large, 'large.png']])).status, 413);

    const response = await send(api, 'POST', data, [[image, 'Ảnh lỗi.png']]);
    assert.equal(response.status, 201);
    const { data: ticket } = await response.json();
    assert.deepEqual(ticket.history.map(event => event.status), ['NEW']);
    const path = api + '/' + ticket.id;
    const imageUrl = path + '/attachments/' + ticket.attachments[0].id;
    const download = await fetch(imageUrl);
    assert.equal(ticket.attachments[0].name, 'Ảnh lỗi.png');
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition'), /^attachment/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);

    const { requesterId, ...details } = data;
    const changes = { ...details, version: ticket.version, assigneeId: 2,
      status: 'IN_PROGRESS', priority: 'HIGH', removeAttachments: [ticket.attachments[0].id] };
    assert.equal((await send(path, 'PATCH', { ...changes, version: 9 }, [[image, 'stale.png']])).status, 409);
    assert.equal((await fetch(imageUrl)).status, 200);
    const updated = await send(path, 'PATCH', changes, [[image, 'Ảnh mới.png']]);
    assert.equal(updated.status, 200);
    const { data: saved } = await updated.json();
    assert.deepEqual(saved.history.map(event => event.status), ['NEW', 'IN_PROGRESS']);
    assert.deepEqual(saved.attachments.map(file => file.name), ['Ảnh mới.png']);
    assert.equal((await fetch(imageUrl)).status, 404);
    assert.equal(saved.archivedAttachments[0].id, ticket.attachments[0].id);
    assert.ok(saved.archivedAttachments[0].archivedAt);

    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    const list = await fetch(api + '?createdOn=' + today).then(res => res.json());
    assert.ok(list.data.some(row => row.id === ticket.id));
    const mine = await fetch(api + '?requesterId=1&assigneeId=2').then(res => res.json());
    assert.ok(mine.data.some(row => row.id === ticket.id));
    const otherRequester = await fetch(api + '?requesterId=2&assigneeId=2').then(res => res.json());
    assert.ok(!otherRequester.data.some(row => row.id === ticket.id));
    const unassigned = await fetch(api + '?assigneeId=0').then(res => res.json());
    assert.ok(unassigned.data.every(row => row.assigneeId === null));
    const otherDay = await fetch(api + '?createdOn=2000-01-01').then(res => res.json());
    assert.equal(otherDay.meta.totalItems, 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('bulk delete validates the whole selection and keeps archived data in backup', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const api = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const post = (path, data) => fetch(api + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  try {
    const first = await post('/tickets', { title: 'Lỗi máy in', description: 'Không in được', categoryId: 3, requesterId: 1 }).then(r => r.json());
    const second = await post('/tickets', { title: 'Hỗ trợ mạng', description: 'Mất kết nối', categoryId: 3, requesterId: 1 }).then(r => r.json());
    const ids = [first.data.id, second.data.id];
    assert.equal((await post('/tickets/archive', { ids: [ids[0], 99999] })).status, 404);
    assert.equal((await fetch(api + '/tickets/' + ids[0])).status, 200);
    assert.equal((await post('/users/archive', { ids: [3] })).status, 404);
    assert.equal((await post('/categories/archive', { ids: [3, 4] })).status, 404);
    assert.equal((await fetch(api + '/categories/4')).status, 200);

    const removed = await post('/tickets/archive', { ids, duplicate: true });
    assert.equal(removed.status, 422);
    const result = await post('/tickets/archive', { ids: [...ids, ids[0]] }).then(r => r.json());
    assert.equal(result.data.count, 2);
    assert.equal((await post('/tickets/archive', { ids }).then(r => r.json())).data.count, 0);
    assert.equal((await fetch(api + '/tickets/' + ids[0])).status, 404);
    assert.ok(!(await fetch(api + '/tickets').then(r => r.json())).data.some(row => ids.includes(row.id)));

    const user = await post('/users', { fullName: 'Tài khoản thử', email: 'archive-test@example.test', role: 'USER' }).then(r => r.json());
    const patch = (path, data) => fetch(api + path, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    assert.equal((await patch('/users/3', { isActive: false })).status, 409);
    const path = '/users/' + user.data.id;
    assert.equal((await patch(path, { isActive: false })).status, 200);
    const { data: inactive } = await fetch(api + path).then(r => r.json());
    assert.equal(inactive.isActive, false);
    assert.equal(inactive.email, user.data.email);
    assert.equal((await patch('/categories/4', { isActive: false })).status, 200);
    const { data: backup } = await fetch(api + '/backups/snapshot').then(r => r.json());
    assert.equal(backup.tickets.filter(row => ids.includes(row.id) && row.archivedAt).length, 2);
    assert.equal(backup.users.find(row => row.id === user.data.id).email, user.data.email);
    assert.equal(backup.categories.find(row => row.id === 4).isActive, false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('inactive categories and accounts remain visible on existing requests', async () => {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const api = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  const send = (path, method, data) => fetch(api + path, {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
  });
  const submission = { title: 'Kiểm tra liên kết', description: 'Duy trì dữ liệu đang dùng', categoryId: 3, requesterId: 1 };
  const update = { title: submission.title, description: submission.description, categoryId: 3, assigneeId: 2, priority: 'MEDIUM' };
  try {
    const created = await send('/tickets', 'POST', submission).then(r => r.json());
    const path = '/tickets/' + created.data.id;
    assert.equal((await send(path, 'PATCH', { ...update, version: 1, status: 'IN_PROGRESS' })).status, 200);
    assert.equal((await send('/users/2', 'PATCH', { isActive: false })).status, 200);
    assert.equal((await send('/categories/3', 'PATCH', { isActive: false })).status, 200);
    assert.equal((await send('/tickets', 'POST', submission)).status, 422);
    const another = await send('/tickets', 'POST', { ...submission, categoryId: 1 }).then(r => r.json());
    assert.equal((await send('/tickets/' + another.data.id, 'PATCH', {
      ...update, categoryId: 1, version: 1, status: 'IN_PROGRESS',
    })).status, 422);
    const response = await send(path, 'PATCH', { ...update, version: 2, status: 'RESOLVED' });
    assert.equal(response.status, 200);
    const { data: saved } = await response.json();
    assert.equal(saved.categoryId, 3);
    assert.equal(saved.assigneeId, 2);
    assert.equal(saved.status, 'RESOLVED');
  } finally {
    await send('/users/2', 'PATCH', { isActive: true });
    await send('/categories/3', 'PATCH', { isActive: true });
    await new Promise(resolve => server.close(resolve));
  }
});
