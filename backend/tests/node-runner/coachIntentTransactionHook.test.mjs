import test from 'node:test';
import assert from 'node:assert/strict';
import { hashCoachWorkoutExpectation } from '../../services/ai/coachIntentEffectProof.mjs';
import { persistCoachIntentReceipt } from '../../services/workout/coachIntentTransactionHook.mjs';

test('persists a completed CoachIntent receipt through the caller transaction', async () => {
  const transaction = { id: 'tx-1' };
  const calls = [];
  const model = {
    update: async (values, options) => {
      calls.push({ values, options });
      return [1, [{ id: 'intent-1', status: 'completed', result: values.result }]];
    },
  };
  const expectedFootprint = {
    actorId: 7,
    targetClientId: 42,
    date: '2026-09-06',
    dailyFormId: '101',
    sessionId: 'session-2',
    version: 1,
    exercises: [{ exerciseKey: 'bench_press', unit: 'lb', sets: [{ setNumber: 1, reps: 5, load: 135 }] }],
  };
  const result = await persistCoachIntentReceipt({
    model,
    intentId: 'intent-1',
    result: { schemaVersion: 1, state: 'completed', realAffectedCount: 2 },
    transaction,
  });

  assert.equal(result.status, 'completed');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.transaction, transaction);
  assert.deepEqual(calls[0].options.where, { id: 'intent-1', status: 'claimed' });
  assert.deepEqual(calls[0].values.result, { schemaVersion: 1, recordRefs: [],
    realAffectedCount: 2, reasonCode: null, correlationId: null });
});

test('skips the optional hook when no intent was claimed', async () => {
  const result = await persistCoachIntentReceipt({ model: null, intentId: null, transaction: {} });
  assert.deepEqual(result, { status: 'skipped', intent: null });
});

test('fails the writer transaction when the intent is no longer claimed', async () => {
  const model = { update: async () => [0, []] };
  await assert.rejects(
    persistCoachIntentReceipt({ model, intentId: 'intent-1', result: {}, transaction: {} }),
    (error) => error.code === 'INTENT_RECEIPT_NOT_CLAIMED',
  );
});

test('persists a server-owned committed-unverified footprint and proof hash in the writer transaction', async () => {
  const transaction = { id: 'tx-2' };
  const calls = [];
  const model = {
    update: async (values, options) => {
      calls.push({ values, options });
      return [1, [{ id: 'intent-2', status: 'committed_unverified', ...values }]];
    },
  };
  const expectedFootprint = {
    actorId: 7,
    targetClientId: 42,
    date: '2026-09-06',
    dailyFormId: '101',
    sessionId: 'session-2',
    version: 1,
    exercises: [{ exerciseKey: 'bench_press', unit: 'lb', sets: [{ setNumber: 1, reps: 5, load: 135 }] }],
  };

  const result = await persistCoachIntentReceipt({
    model,
    intentId: 'intent-2',
    result: { recordRefs: [{ kind: 'daily_workout_form', id: 'form-2', version: 1 }], realAffectedCount: 1 },
    expectedHash: hashCoachWorkoutExpectation(expectedFootprint),
    expectedFootprint,
    proofVersion: 2,
    transaction,
  });

  assert.equal(result.status, 'committed_unverified');
  assert.equal(calls[0].options.transaction, transaction);
  assert.deepEqual(calls[0].options.where, { id: 'intent-2', status: 'claimed' });
  assert.equal(calls[0].values.expectedHash, hashCoachWorkoutExpectation(expectedFootprint));
  assert.equal(calls[0].values.expectedFootprint.targetClientId, 42);
  assert.equal(calls[0].values.proofVersion, 2);
  assert.ok(calls[0].values.committedAt instanceof Date);
});
