import test from 'node:test';
import assert from 'node:assert/strict';
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
  assert.deepEqual(calls[0].values.result, { schemaVersion: 1, state: 'completed', realAffectedCount: 2 });
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
