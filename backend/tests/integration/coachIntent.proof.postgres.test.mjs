/** Reconciliation authorization and CAS races using real PostgreSQL receipts.
 * Fixtures exercise the existing footprint comparator, not an activated writer.
 * No domain records are written, no provider called, and no application DB loaded.
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Sequelize from 'sequelize';
import sequelize from '../helpers/coachTestDatabase.mjs';
import CoachIntent from '../../models/CoachIntent.mjs';
import v1 from '../../migrations/20260904000000-create-coach-intents.cjs';
import v2 from '../../migrations/20260906000000-coach-intent-lifecycle-v2.cjs';
import { hashCoachWorkoutExpectation } from '../../services/ai/coachIntentEffectProof.mjs';
import { reconcileCoachIntent } from '../../services/ai/coachIntentService.mjs';
before(async () => {
  await sequelize.authenticate();
  await v1.up(sequelize.getQueryInterface(), Sequelize);
  await v2.up(sequelize.getQueryInterface(), Sequelize);
});
after(async () => { await sequelize.close(); });
async function fixture(overrides = {}) {
  const expectedFootprint = { actorId: 9101, targetClientId: 9201, date: '2026-09-06',
    dailyFormId: randomUUID(), sessionId: randomUUID(), version: 1,
    exercises: [{ exerciseId: 'bench_press', unit: 'lb', sets: [{ setNumber: 1, reps: 8, load: 135 }] }] };
  const row = await CoachIntent.create({ actorId: 9101, targetClientId: 9201,
    requestKey: randomUUID(), requestHash: '1'.repeat(64), commandType: 'log_workout',
    proposalId: randomUUID(), status: 'committed_unverified', version: 3, proofVersion: 2,
    committedAt: new Date(), expectedHash: hashCoachWorkoutExpectation(expectedFootprint),
    expectedFootprint, ...overrides });
  const observation = { found: true, intentId: row.id, requestHash: row.requestHash,
    proposalId: row.proposalId, expected: expectedFootprint, observed: expectedFootprint,
    committedAt: new Date().toISOString() };
  return { row, observation, input: { model: CoachIntent, intentId: row.id,
    authorizeIntent: async () => true, readEffect: async () => observation } };
}
test('unauthorized reconciliation reveals no row and never reads an effect', async () => {
  const { row, input } = await fixture();
  let reads = 0;
  const result = await reconcileCoachIntent({ ...input, authorizeIntent: async () => false,
    readEffect: async () => { reads += 1; return null; } });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.intent, null);
  assert.equal(reads, 0);
  assert.equal((await CoachIntent.findByPk(row.id)).version, 3);
});
test('access revoked during readback blocks promotion and response disclosure', async () => {
  const { row, input } = await fixture();
  let checks = 0;
  const result = await reconcileCoachIntent({ ...input, authorizeIntent: async () => ++checks === 1 });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.intent, null);
  assert.equal((await CoachIntent.findByPk(row.id)).status, 'committed_unverified');
});
test('concurrent receipt revision prevents stale promotion in the real SQL update', async () => {
  const { row, observation, input } = await fixture();
  const result = await reconcileCoachIntent({ ...input, readEffect: async () => {
    await CoachIntent.update({ version: 4 }, { where: { id: row.id } });
    return observation;
  } });
  assert.equal(result.status, 'committed_unverified');
  assert.equal(result.intent.version, 4);
  assert.equal((await CoachIntent.findByPk(row.id)).verifiedAt, null);
});
test('stored proof is required and a supplied observation cannot restore missing columns', async () => {
  for (const overrides of [{ expectedFootprint: null }, { committedAt: null }]) {
    const { row, input } = await fixture(overrides);
    const result = await reconcileCoachIntent(input);
    assert.equal(result.status, 'committed_unverified');
    assert.equal((await CoachIntent.findByPk(row.id)).verifiedAt, null);
  }
});
test('readback outage preserves committed-unverified status and reports unavailable', async () => {
  const { row, input } = await fixture();
  const result = await reconcileCoachIntent({ ...input, readEffect: async () => { throw new Error('synthetic outage'); } });
  assert.equal(result.status, 'committed_unverified');
  assert.equal(result.reasonCode, 'READBACK_UNAVAILABLE');
  assert.equal((await CoachIntent.findByPk(row.id)).version, 3);
});
test('matching durable proof promotes once and increments revision', async () => {
  const { row, input } = await fixture();
  const verified = await reconcileCoachIntent(input);
  assert.equal(verified.status, 'verified');
  assert.equal(verified.intent.version, 4);
  assert.equal(verified.intent.result.realAffectedCount, 1);
  assert.ok(verified.intent.verifiedAt instanceof Date);
  let replayReads = 0;
  const replay = await reconcileCoachIntent({ ...input, readEffect: async () => { replayReads += 1; } });
  assert.equal(replay.status, 'verified');
  assert.equal(replayReads, 0);
  assert.equal((await CoachIntent.findByPk(row.id)).version, 4);
});

test('access revoked during successful SQL update prevents disclosure of the returned row', async () => {
  const { input } = await fixture();
  let revoked = false;
  const model = {
    findByPk: id => CoachIntent.findByPk(id),
    update: async (...args) => {
      const result = await CoachIntent.update(...args);
      revoked = true;
      return result;
    },
  };
  const result = await reconcileCoachIntent({ ...input, model, authorizeIntent: async () => !revoked });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.intent, null);
});

test('read failure after another verifier wins returns the current durable revision', async () => {
  const { row, input } = await fixture();
  const result = await reconcileCoachIntent({ ...input, readEffect: async () => {
    await CoachIntent.update({ status: 'verified', version: 4, verifiedAt: new Date() }, { where: { id: row.id } });
    throw new Error('synthetic late read failure');
  } });
  assert.equal(result.status, 'verified');
  assert.equal(result.intent.version, 4);
  assert.equal(result.reasonCode, 'READBACK_UNAVAILABLE');
});
