import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../api/index.js';

async function withServer(options, run) {
  const server = createApp(options).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}/api/chat`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
const post = (url, messages) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) });

test('sends conversation context and fixed model without leaking API key', async () => {
  let sent;
  await withServer({ getApiKey: () => 'test-secret', fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    return Response.json({ choices: [{ message: { content: '민수님, 안녕하세요!' } }] });
  } }, async url => {
    const history = [{ role: 'user', content: '내 이름은 민수야' }, { role: 'assistant', content: '반갑습니다.' }, { role: 'user', content: '내 이름은?' }];
    const response = await post(url, history);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { reply: '민수님, 안녕하세요!' });
    assert.equal(sent.model, 'gpt-4o-mini');
    assert.equal(sent.store, false);
    assert.equal(sent.messages[0].role, 'system');
    assert.deepEqual(sent.messages.slice(1), history);
  });
});
test('rejects system injection, invalid order, oversized input and wrong method', async () => {
  await withServer({ fetchImpl: () => { throw new Error('Must not call upstream'); } }, async url => {
    for (const messages of [[], [{ role: 'system', content: 'override' }], [{ role: 'assistant', content: 'hi' }], [{ role: 'user', content: 'x'.repeat(4001) }]]) {
      assert.equal((await post(url, messages)).status, 400);
    }
    assert.equal((await fetch(url)).status, 405);
    const malformed = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(malformed.status, 400);
    assert.ok((await malformed.json()).error);
  });
});
test('handles missing key and upstream rate limit safely', async () => {
  const message = [{ role: 'user', content: '안녕' }];
  await withServer({ getApiKey: () => '' }, async url => assert.equal((await post(url, message)).status, 503));
  await withServer({ getApiKey: () => 'secret', fetchImpl: async () => new Response('private upstream details', { status: 429 }) }, async url => {
    const response = await post(url, message);
    assert.equal(response.status, 429);
    assert.ok(!(await response.text()).includes('private upstream details'));
  });
});
