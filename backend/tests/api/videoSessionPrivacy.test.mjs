// Synthetic in-memory resources; no DB, startup, token signer or external call.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { loadVideoSessionRoutes } from './videoSessionWearableHarness.mjs';

const trainer = { id: '7', role: 'trainer' };
const admin = { id: 1, role: 'admin' };
const client = { id: '42', role: 'client' };
const privateNote = 'Synthetic private trainer note';
const storedToken = 'synthetic-stored-token-never-return';

async function setup() {
  const state = { updates: [], lookups: [], logs: [], listQueries: [], tokenCalls: [] };
  state.session = {
    id: 'session-1', trainerId: 7, clientId: 42, status: 'active',
    trainerNotes: privateNote, joinToken: storedToken, wearableData: null,
    update: async values => { state.updates.push(values); Object.assign(state.session, values); },
    toJSON() {
      const { update, toJSON, ...data } = this;
      return data;
    },
  };
  return { state, request: await loadVideoSessionRoutes(state) };
}

function assertStoredValuesIntact(state) {
  assert.equal(state.session.trainerNotes, privateNote);
  assert.equal(state.session.joinToken, storedToken);
}

for (const [label, user] of [
  ['client', client], ['unknown role', { id: 42, role: 'unknown' }],
  ['trainer attending as client', { id: 42, role: 'trainer' }],
]) {
  test(`VP1/VP2 ${label} detail omits private notes and stored join token`, async () => {
    const { request, state } = await setup();
    const result = await request('get', '/:id', { user });
    assert.equal(result.status, 200);
    assert.equal(Object.hasOwn(result.body.data, 'trainerNotes'), false);
    assert.equal(Object.hasOwn(result.body.data, 'joinToken'), false);
    assertStoredValuesIntact(state);
    assert.deepEqual(state.updates, []);
  });
}

for (const [label, user] of [['assigned trainer', trainer], ['admin', admin]]) {
  for (const path of ['/:id', '/']) {
    test(`VP1/VP2 ${label} GET ${path} keeps notes, omits stored token`, async () => {
      const { request, state } = await setup();
      const result = await request('get', path, { user });
      assert.equal(result.status, 200);
      const data = path === '/' ? result.body.data[0] : result.body.data;
      assert.equal(data.trainerNotes, privateNote);
      assert.equal(Object.hasOwn(data, 'joinToken'), false);
      assertStoredValuesIntact(state);
      assert.deepEqual(state.updates, []);
    });
  }
  test(`VP1/VP2 ${label} end response keeps notes, omits stored token`, async () => {
    const { request, state } = await setup();
    const result = await request('patch', '/:id/end', { user });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.trainerNotes, privateNote);
    assert.equal(Object.hasOwn(result.body.data, 'joinToken'), false);
    assertStoredValuesIntact(state);
    assert.equal(state.updates.length, 1);
    assert.equal(state.updates[0].joinToken, undefined);
  });
}

test('VP2 client listing stays forbidden and never performs lookup', async () => {
  const { request, state } = await setup();
  const result = await request('get', '/', { user: client });
  assert.equal(result.status, 403);
  assert.equal(result.body.data, undefined);
  assert.deepEqual(state.listQueries, []);
  assert.deepEqual(state.updates, []);
});

for (const role of ['client', 'unknown']) {
  test(`VP3 ${role} sharing trainer ID cannot assume the trainer seat`, async () => {
    const { request, state } = await setup();
    const user = { id: 7, role };
    for (const path of ['/:id', '/:id/wearable', '/:id/join']) {
      const result = await request('get', path, { user });
      assert.equal(result.status, 403, path);
      assert.equal(result.body.data, undefined);
    }
    assert.deepEqual(state.tokenCalls, []);
    assert.deepEqual(state.updates, []);
  });
}

for (const [label, user, isTrainer] of [['trainer', trainer, true], ['admin', admin, true], ['client', client, false]]) {
  test(`VP3 fresh join endpoint still admits ${label} with correct seat`, async () => {
    const { request, state } = await setup();
    const result = await request('get', '/:id/join', { user });
    assert.equal(result.status, 200);
    assert.equal(result.body.data.token, 'synthetic-fresh-token');
    assert.equal(result.body.data.isTrainer, isTrainer);
    assert.equal(state.tokenCalls.length, 1);
    assert.equal(state.tokenCalls[0][3], isTrainer);
    assertStoredValuesIntact(state);
    assert.deepEqual(state.updates, []);
  });
}
