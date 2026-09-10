import test from 'node:test';
import assert from 'node:assert/strict';
import { hashCoachWorkoutExpectation } from '../../services/ai/coachIntentEffectProof.mjs';
import {
  claimCoachIntent,
  completeCoachIntent,
  markCoachIntentUnknown,
  reconcileCoachIntent,
  toCoachIntentReceipt,
} from '../../services/ai/coachIntentService.mjs';

function fakeModel() {
  const rows = new Map();
  return {
    rows,
    async findOrCreate({ where, defaults }) {
      const key = `${where.actorId}:${where.requestKey}`;
      const existing = rows.get(key);
      if (existing) return [existing, false];
      const row = { id: `intent-${rows.size + 1}`, version: 0, ...defaults, key };
      rows.set(key, row);
      return [row, true];
    },
    async update(values, { where, returning }) {
      const row = [...rows.values()].find(candidate => Object.entries(where).every(([key, value]) => candidate[key] === value));
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
    assert.deepEqual(completed.result, { schemaVersion: 1,
      recordRefs: [{ kind: 'workout_session', id: 'session-1', version: null }],
      realAffectedCount: null, reasonCode: null, correlationId: null });

    const second = await claimCoachIntent({ model, actorId: 7, requestKey: 'req-3', requestHash: 'hash-d', commandType: 'log_workout' });
    await markCoachIntentUnknown({ model, intentId: second.intent.id, reason: 'CLIENT_TIMEOUT' });
    const reconciled = await reconcileCoachIntent({ model, intentId: second.intent.id,
      authorizeIntent: async () => true, readEffect: async () => ({ found: false }) });
    assert.equal(reconciled.status, 'unknown');
    assert.equal(reconciled.dispatched, false);
  });

test('failed intent receipts never expose a commit timestamp or verified state', () => {
  const receipt = toCoachIntentReceipt({
    id: 'intent-failed',
    actorId: 7,
    targetClientId: 8,
    commandType: 'log_workout',
    status: 'failed',
    completedAt: new Date('2026-09-05T12:00:00Z'),
    result: { state: 'verified', verifiedAt: '2026-09-05T12:00:00Z' },
  });

  assert.equal(receipt.state, 'failed');
  assert.equal(receipt.committedAt, null);
  assert.equal(receipt.verifiedAt, null);
});

test('result JSON cannot self-certify a committed intent as verified', () => {
  const receipt = toCoachIntentReceipt({
    id: 'intent-completed',
    actorId: 7,
    targetClientId: 8,
    commandType: 'log_workout',
    status: 'completed',
    completedAt: new Date('2026-09-05T12:00:00Z'),
    result: { state: 'verified' },
  });

  assert.equal(receipt.state, 'committed_unverified');
  assert.equal(receipt.verifiedAt, null);
});

test('reconciliation requires an independent matching proof before promotion', async () => {
  const model = fakeModel();
  const claimed = await claimCoachIntent({
    model,
    actorId: 7,
    requestKey: 'req-proof',
    requestHash: 'hash-proof',
    commandType: 'log_workout',
    targetClientId: 8,
    proposalId: 'proposal-1',
  });
  await markCoachIntentUnknown({ model, intentId: claimed.intent.id, reason: 'CLIENT_TIMEOUT' });

  const mismatch = await reconcileCoachIntent({
    model,
    authorizeIntent: async () => true,
    intentId: claimed.intent.id,
    readEffect: async () => ({
      found: true,
      result: { targetUserId: 9, state: 'verified' },
    }),
  });
  assert.equal(mismatch.status, 'unknown');

  const proof = await reconcileCoachIntent({
    model,
    authorizeIntent: async () => true,
    intentId: claimed.intent.id,
    readEffect: async () => ({
      found: true,
      matches: true,
      intentId: claimed.intent.id,
      targetClientId: 8,
      proposalId: 'proposal-1',
      proofVersion: 2,
      expectedHash: 'a'.repeat(64),
      result: { recordRefs: [{ kind: 'workout_session', id: 'session-1' }] },
    }),
  });
  // Matching labels and an arbitrary hash cannot replace the stored expectation.
  assert.equal(proof.status, 'unknown');

  const footprint = { actorId: 7, targetClientId: 8, date: '2026-09-06',
    dailyFormId: '00000000-0000-4000-8000-000000000010',
    sessionId: '00000000-0000-4000-8000-000000000011', version: 1,
    exercises: [{ exerciseId: 'bench', unit: 'kg', sets: [{ setNumber: 1, reps: 8, load: 20 }] }] };
  const stored = await model.findByPk(claimed.intent.id);
  stored.proofVersion = 2;
  stored.expectedHash = hashCoachWorkoutExpectation(footprint);
  stored.expectedFootprint = footprint;
  stored.committedAt = '2026-09-06T00:00:00Z';
  const verified = await reconcileCoachIntent({ model, intentId: stored.id,
    authorizeIntent: async () => true, readEffect: async () => ({
    found: true, intentId: stored.id, requestHash: stored.requestHash, proposalId: stored.proposalId,
    committedAt: '2026-09-06T00:00:00Z', expected: footprint, observed: structuredClone(footprint),
  }) });
  assert.equal(verified.status, 'verified');
  assert.equal(toCoachIntentReceipt(verified.intent).state, 'verified');
  assert.equal(toCoachIntentReceipt(verified.intent).committedAt, '2026-09-06T00:00:00.000Z');
});
