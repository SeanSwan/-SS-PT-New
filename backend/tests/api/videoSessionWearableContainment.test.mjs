// All resources are ephemeral in-memory fakes; runs under `cd backend && npm test`.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { loadVideoSessionRoutes } from './videoSessionWearableHarness.mjs';

const legacy = { heartRate: 78, steps: 5132, sleepHours: 7.5, hrv: 42, source: 'healthkit' };
const trainer = { id: '7', role: 'trainer' };
const client = { id: '42', role: 'client' };
const admin = { id: 1, role: 'admin' };
const outsider = { id: 99, role: 'trainer' };

async function setup(wearableData = structuredClone(legacy)) {
  const state = { updates: [], lookups: [], logs: [], listQueries: [], lookupError: false };
  state.session = {
    id: 'session-1', trainerId: 7, clientId: 42, status: 'active',
    wearableData, trainerNotes: 'Keep this note',
    update: async values => { state.updates.push(values); Object.assign(state.session, values); },
    toJSON() {
      const { update, toJSON, ...data } = this;
      return data;
    },
  };
  return { state, request: await loadVideoSessionRoutes(state) };
}

function assertUnavailable(data, verification) {
  assert.equal(data.wearableData, null, 'unproven wearable metrics must not leave the route');
  assert.equal(data.wearableStatus.availability, 'unavailable');
  assert.equal(data.wearableStatus.verification, verification);
  assert.equal(data.wearableStatus.code, 'VERIFIED_WEARABLE_SOURCE_UNAVAILABLE');
}

for (const [label, user] of [['trainer', trainer], ['client', client], ['admin', admin]]) {
  test(`WC1/WC2 ${label} legacy POST is unavailable and never writes`, async () => {
    const { request, state } = await setup();
    const before = structuredClone(state.session.wearableData);
    const result = await request('post', '/:id/wearable', { user, body: legacy });
    assert.equal(result.status, 409);
    assert.equal(result.body.success, false);
    assert.equal(result.body.code, 'WEARABLE_INGESTION_DISABLED');
    assert.match(result.body.message, /No data was saved/);
    assert.deepEqual(state.updates, []);
    assert.deepEqual(state.session.wearableData, before);
    assert.deepEqual(state.lookups, ['session-1']);
  });
  test(`WC2/WC3 ${label} GET quarantines history without modifying it`, async () => {
    const { request, state } = await setup();
    const before = structuredClone(state.session.wearableData);
    const result = await request('get', '/:id/wearable', { user });
    assert.equal(result.status, 200);
    assert.equal(result.body.success, true);
    assertUnavailable(result.body.data, 'unverified');
    assert.deepEqual(state.session.wearableData, before);
    assert.deepEqual(state.updates, []);
  });
}

for (const method of ['get', 'post']) {
  test(`WC2 ${method} outsider denied before disclosing unavailable state`, async () => {
    const { request, state } = await setup();
    const result = await request(method, '/:id/wearable', { user: outsider, body: legacy });
    assert.equal(result.status, 403);
    assert.match(result.body.message, /not a participant/i);
    assert.equal(result.body.data, undefined);
    assert.equal(result.body.code, undefined);
    assert.deepEqual(state.updates, []);
  });
  test(`WC2 ${method} unauthenticated request never reads or writes`, async () => {
    const { request, state } = await setup();
    const result = await request(method, '/:id/wearable', { body: legacy });
    assert.equal(result.status, 401);
    assert.deepEqual(state.lookups, []);
    assert.deepEqual(state.updates, []);
  });
  test(`WC2 ${method} missing session stays 404`, async () => {
    const { request, state } = await setup();
    state.session = null;
    const result = await request(method, '/:id/wearable', { user: trainer, body: legacy });
    assert.equal(result.status, 404);
    assert.deepEqual(state.updates, []);
  });
  test(`WC2 ${method} failed lookup stays 500 and never writes`, async () => {
    const { request, state } = await setup();
    state.lookupError = true;
    const result = await request(method, '/:id/wearable', { user: trainer, body: legacy });
    assert.equal(result.status, 500);
    assert.deepEqual(state.updates, []);
  });
}

test('WC1 malformed or claimed provider proof cannot enable ingestion', async () => {
  const { request, state } = await setup();
  for (const body of [null, {}, { source: 'unknown' }, { ...legacy, verified: true, providerReceipt: 'fake' }]) {
    const result = await request('post', '/:id/wearable', { user: client, body });
    assert.equal(result.status, 409);
    assert.equal(result.body.code, 'WEARABLE_INGESTION_DISABLED');
  }
  assert.deepEqual(state.updates, []);
});

test('WC3/WC4 absent and malformed legacy data never becomes trusted or zero metrics', async () => {
  for (const stored of [null, {}, [], 0, '', { source: 'healthkit', verified: true }]) {
    const { request, state } = await setup(stored);
    const result = await request('get', '/:id/wearable', { user: client });
    assertUnavailable(result.body.data, stored === null ? 'none' : 'unverified');
    assert.deepEqual(state.session.wearableData, stored);
    assert.deepEqual(state.updates, []);
  }
});

test('WC3 session detail does not bypass quarantine; unrelated fields survive', async () => {
  const { request, state } = await setup();
  const result = await request('get', '/:id', { user: client });
  assert.equal(result.status, 200);
  assertUnavailable(result.body.data, 'unverified');
  assert.equal(result.body.data.trainerNotes, undefined);
  assert.equal(result.body.data.status, 'active');
  assert.equal(state.session.trainerNotes, 'Keep this note');
  assert.deepEqual(state.session.wearableData, legacy);
});

test('WC3 trainer listing keeps trainer scoping and quarantines wearable history', async () => {
  const { request, state } = await setup();
  const result = await request('get', '/', { user: trainer });
  assert.equal(result.status, 200);
  assertUnavailable(result.body.data[0], 'unverified');
  assert.equal(state.listQueries[0].where.trainerId, '7');
  assert.deepEqual(state.session.wearableData, legacy);
});

test('WC3/WC5 ending a session preserves its intended update, suppresses legacy metrics', async () => {
  const { request, state } = await setup();
  const result = await request('patch', '/:id/end', { user: trainer });
  assert.equal(result.status, 200);
  assertUnavailable(result.body.data, 'unverified');
  assert.equal(result.body.data.status, 'completed');
  assert.equal(state.updates.length, 1);
  assert.equal(state.updates[0].wearableData, undefined);
  assert.deepEqual(state.session.wearableData, legacy);
});
