import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { app } from '../src/app.js';

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
