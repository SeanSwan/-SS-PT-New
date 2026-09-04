import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimCoachIntent,
  completeCoachIntent,
  markCoachIntentUnknown,
  reconcileCoachIntent,
} from '../../services/ai/coachIntentService.mjs';

function fakeModel() {
  const rows = new Map();
  return {
    rows,
    async findOrCreate({ where, defaults }) {
      const key = `${where.actorId}:${where.requestKey}`;
      const existing = rows.get(key);
      if (existing) return [existing, false];
      const row = { id: `intent-${rows.size + 1}`, ...defaults, key };
      rows.set(key, row);
      return [row, true];
    },
    async update(values, { where, returning }) {
      const row = [...rows.values()].find((candidate) => candidate.id === where.id && candidate.status === where.status);
      if (!row) return [0, []];
      Object.assign(row, values);
      return [1, returning ? [row] : []];
    },
    async findByPk(id) { return [...rows.values()].find((row) => row.id === id) || null; },
  };
}

test('coach intent claims once and replays an identical request without a second claim', async () => {
    const model = fakeModel();
    const first = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-1', requestHash: 'hash-a', commandType: 'log_workout' });
    const replay = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-1', requestHash: 'hash-a', commandType: 'log_workout' });
    assert.equal(first.status, 'claimed');
    assert.equal(first.created, true);
    assert.equal(replay.status, 'claimed');
    assert.equal(replay.created, false);
  });

test('coach intent refuses a request-key collision with a different semantic hash', async () => {
    const model = fakeModel();
    await claimCoachIntent({ model, actorId: 7, requestKey: 'req-1', requestHash: 'hash-a', commandType: 'log_workout' });
    const conflict = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-1', requestHash: 'hash-b', commandType: 'log_workout' });
    assert.equal(conflict.status, 'conflict');
    assert.equal(conflict.code, 'REQUEST_HASH_MISMATCH');
  });

test('coach intent records completed and unknown outcomes without dispatching from reconciliation', async () => {
    const model = fakeModel();
    const claimed = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-2', requestHash: 'hash-c', commandType: 'log_workout' });
    const completed = await completeCoachIntent({ model, intentId: claimed.intent.id, result: { sessionId: 'session-1' } });
    assert.equal(completed.status, 'completed');
    assert.deepEqual(completed.result, { sessionId: 'session-1' });

    const second = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-3', requestHash: 'hash-d', commandType: 'log_workout' });
    await markCoachIntentUnknown({ model, intentId: second.intent.id, reason: 'CLIENT_TIMEOUT' });
    const reconciled = await reconcileCoachIntent({ model, intentId: second.intent.id, readEffect: async () => ({ found: false }) });
    assert.equal(reconciled.status, 'unknown');
    assert.equal(reconciled.dispatched, false);
  });
