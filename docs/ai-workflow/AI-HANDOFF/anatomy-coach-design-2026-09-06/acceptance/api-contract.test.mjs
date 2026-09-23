/** Future isolated-server contract suite. Never point this at production or live customer data. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

if (!process.env.SPA_FIXTURE_CONFIG) throw new Error('SETUP BLOCKED: private isolated fixture config required; not behavioral RED.');
const config = JSON.parse(readFileSync(process.env.SPA_FIXTURE_CONFIG, 'utf8'));
const base = new URL(config.baseUrl);
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Only loopback fixture servers allowed.');
assert.equal(base.protocol, 'http:');
assert.equal(base.username + base.password + base.search + base.hash, '');
assert.equal(base.pathname, '/');
const marker = await fetch(new URL('/__test__/fixture-identity', base), { redirect: 'error' }).then(r => r.json());
assert.equal(marker.kind, 'swan-pain-atlas-disposable');
assert.equal(marker.instanceId, config.instanceId);
assert.equal(marker.productionConnection, false, 'Fixture server must attest isolated DB; review its setup independently.');
assert.equal(marker.syntheticOnly, true);
const target = config.ownUserId;
const episode = config.episodeId;
assert.ok(Number.isSafeInteger(target) && Number.isSafeInteger(episode));
const prefix = `/api/pain-entries/v2/${target}/${episode}`;
async function request(path, { token = config.ownToken, method = 'GET', body, key } = {}) {
  const response = await fetch(new URL(path, base), { method, redirect: 'error',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
test('T04: a foreign client cannot read this episode history', async () => {
  const response = await request(`${prefix}/observations`, { token: config.foreignClientToken });
  assert.equal(response.status, 403);
  assert.equal(response.body.data, undefined);
});
test('T08: malformed score cannot alter episode revision', async () => {
  const before = await request(`/api/pain-entries/v2/${target}`);
  const row = before.body.data.find(x => x.id === episode);
  for (const painLevel of [true, '4', 4.5, -1, 11]) {
    const response = await request(`${prefix}/observations`, { method: 'POST', key: randomUUID(),
      body: { expectedRevision: row.revision, painLevel } });
    assert.ok([400, 422].includes(response.status));
  }
  const after = await request(`/api/pain-entries/v2/${target}`);
  assert.equal(after.body.data.find(x => x.id === episode).revision, row.revision);
});
test('T09: concurrent identical mutation commits once and rejects changed payload', async () => {
  const before = await request(`/api/pain-entries/v2/${target}`);
  const row = before.body.data.find(x => x.id === episode);
  const key = randomUUID();
  const body = { expectedRevision: row.revision, painLevel: 4, description: 'Synthetic acceptance observation' };
  const results = await Promise.all([request(`${prefix}/observations`, { method: 'POST', key, body }),
    request(`${prefix}/observations`, { method: 'POST', key, body })]);
  results.forEach(result => assert.ok([200, 201].includes(result.status)));
  assert.equal(results[0].body.data.observation.id, results[1].body.data.observation.id);
  const changed = await request(`${prefix}/observations`, { method: 'POST', key, body: { ...body, painLevel: 6 } });
  assert.equal(changed.status, 409);
  const after = await request(`/api/pain-entries/v2/${target}`);
  assert.equal(after.body.data.find(x => x.id === episode).revision, row.revision + 1);
  const deniedReplay = await request(`${prefix}/observations`, { method: 'POST', key, body, token: config.foreignClientToken });
  assert.equal(deniedReplay.status, 403);
});
