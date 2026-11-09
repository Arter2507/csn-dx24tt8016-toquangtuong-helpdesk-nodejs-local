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
    const path = '/tickets/' + ticket.id;
    const update = { ...details, assigneeId: 2, status: 'IN_PROGRESS', priority: 'HIGH', version: ticket.version };
    assert.equal((await send(path, 'PATCH', update)).status, 200);
    assert.equal((await send(path, 'PATCH', update)).status, 409);
    const response = await fetch(api + '/tickets?filter=IN_PROGRESS&search=mạng');
    const result = await response.json();
    assert.equal(result.meta.totalItems, 1);
    assert.equal(result.data[0].version, 2);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
