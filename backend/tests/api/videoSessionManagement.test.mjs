// Owner-management authorization with synthetic models only; no DB/provider/socket.
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { loadVideoSessionRoutes } from './videoSessionWearableHarness.mjs';

const actions = [
  ['patch', '/:id/end', {}],
  ['patch', '/:id/notes', { trainerNotes: 'Synthetic replacement note' }],
  ['post', '/:id/micro-win', { type: 'great_rep' }],
  ['post', '/:id/rom', { measurements: [{ joint: 'shoulder_flexion', angle: 90 }] }],
  ['post', '/:id/transcribe', {}],
];

async function setup() {
  const state = { updates: [], lookups: [], logs: [], listQueries: [], modelUpdates: [], gamificationUpdates: [] };
  state.session = {
    id: 'session-1', trainerId: 7, clientId: 42, status: 'active',
    trainerNotes: 'Synthetic private note', recordingUrl: 'https://synthetic-unit.invalid/recording',
    transcription: 'Synthetic shared session transcript', transcriptionStatus: 'none',
    romData: [], wearableData: null,
    update: async values => { state.updates.push(values); Object.assign(state.session, values); },
    toJSON() {
      const { update, toJSON, ...data } = this;
      return data;
    },
  };
  return { state, request: await loadVideoSessionRoutes(state) };
}

for (const [actor, user] of [
  ['trainer attending as client', { id: 42, role: 'trainer' }],
  ['ordinary client', { id: '42', role: 'client' }],
  ['outsider trainer', { id: 99, role: 'trainer' }],
  ['client sharing trainer ID', { id: 7, role: 'client' }],
]) {
  for (const [method, path, body] of actions) {
    test(`VM1 ${actor} cannot mutate ${path}`, async () => {
      const { request, state } = await setup();
      const result = await request(method, path, { user, body });
      assert.equal(result.status, 403);
      assert.equal(result.body.data, undefined);
      assert.deepEqual(state.updates, []);
      assert.deepEqual(state.gamificationUpdates, []);
      assert.deepEqual(state.modelUpdates, []);
      assert.equal(state.session.trainerNotes, 'Synthetic private note');
      assert.equal(state.session.status, 'active');
    });
  }
}

for (const [actor, user] of [['assigned trainer', { id: '7', role: 'trainer' }], ['admin', { id: 1, role: 'admin' }]]) {
  for (const [method, path, body] of actions) {
    test(`VM2 ${actor} can perform ${path} with isolated side effects`, async () => {
      const { request, state } = await setup();
      const result = await request(method, path, { user, body });
      assert.equal(result.status, 200);
      if (path.endsWith('/micro-win')) {
        assert.equal(state.gamificationUpdates.length, 1);
        assert.equal(state.gamificationUpdates[0].experience, 20);
      } else {
        assert.equal(state.updates.length, 1);
        if (path.endsWith('/notes')) assert.equal(state.updates[0].trainerNotes, body.trainerNotes);
        if (path.endsWith('/end')) assert.equal(state.updates[0].status, 'completed');
        if (path.endsWith('/rom')) assert.equal(state.updates[0].romData[0].angle, 90);
        if (path.endsWith('/transcribe')) assert.equal(state.updates[0].transcriptionStatus, 'processing');
      }
    });
  }
}

for (const [actor, user] of [['ordinary client', { id: 42, role: 'client' }], ['trainer attending as client', { id: 42, role: 'trainer' }]]) {
  for (const path of ['/:id/rom', '/:id/transcription']) {
    test(`VM3 ${actor} retains existing participant read ${path}`, async () => {
      const { request, state } = await setup();
      const result = await request('get', path, { user });
      assert.equal(result.status, 200);
      assert.deepEqual(state.updates, []);
      assert.deepEqual(state.gamificationUpdates, []);
      assert.deepEqual(state.modelUpdates, []);
    });
  }
}

test('VM1 owner lookup retains missing-session 404', async () => {
  const { request, state } = await setup();
  state.session = null;
  const result = await request('patch', '/:id/end', { user: { id: 7, role: 'trainer' } });
  assert.equal(result.status, 404);
  assert.deepEqual(state.updates, []);
});

test('VM1 owner lookup retains lookup-failure 500', async () => {
  const { request, state } = await setup();
  state.lookupError = true;
  const result = await request('patch', '/:id/end', { user: { id: 7, role: 'trainer' } });
  assert.equal(result.status, 500);
  assert.deepEqual(state.updates, []);
});
