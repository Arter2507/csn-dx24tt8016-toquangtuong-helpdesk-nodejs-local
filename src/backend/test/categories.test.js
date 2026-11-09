import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';
test('category API validates, creates, filters, updates and reports errors', async () => {
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/api/v1/categories';
  try {
    let response = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'TEST', name: 'Thử' }) });
    assert.equal(response.status, 201); const created = (await response.json()).data;
    response = await fetch(base + '?search=TEST&pageSize=1'); const list = await response.json(); assert.equal(list.meta.totalItems, 1); assert.equal(list.data[0].id, created.id);
    response = await fetch(base + '/' + created.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ isActive: false }) }); assert.equal((await response.json()).data.isActive, false);
    response = await fetch(base + '?sortBy=invalid'); assert.equal(response.status, 422); assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
    response = await fetch(base + '/999999'); assert.equal(response.status, 404);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
