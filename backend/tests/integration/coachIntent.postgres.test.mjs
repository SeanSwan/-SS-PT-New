/** Real PostgreSQL intent-schema and atomicity checks against an owned disposable DB.
 * Run with --import ./tests/helpers/registerCoachTestDatabase.mjs and explicit port.
 * No production configuration, paid provider or full application boot is involved.
 */
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Sequelize from 'sequelize';
import sequelize from '../helpers/coachTestDatabase.mjs';
import CoachIntent from '../../models/CoachIntent.mjs';
import v1 from '../../migrations/20260904000000-create-coach-intents.cjs';
import v2 from '../../migrations/20260906000000-coach-intent-lifecycle-v2.cjs';
import compatibility from '../../migrations/20260906000000-add-coach-intent-trust-fields.cjs';
import { claimCoachIntent, completeCoachIntent } from '../../services/ai/coachIntentService.mjs';
const qi = sequelize.getQueryInterface();
before(async () => {
  await sequelize.authenticate();
  await v1.up(qi, Sequelize);
  await v2.up(qi, Sequelize);
  await v2.up(qi, Sequelize); // Interrupted/repeated deployments must be retryable.
  await compatibility.up(qi, Sequelize);
});
after(async () => { await sequelize.close(); });

test('v2 model and database expose the actual lifecycle proof fields', async () => {
  const columns = await qi.describeTable('coach_intents');
  for (const field of ['version', 'expectedHash', 'expectedFootprint', 'proofVersion', 'committedAt', 'verifiedAt']) {
    assert.ok(CoachIntent.getAttributes()[field], `Model missing ${field}`);
    assert.ok(columns[field], `Database missing ${field}`);
  }
});

test('20 simultaneous claims create one real database row', async () => {
  const requestKey = randomUUID();
  const claims = await Promise.all(Array.from({ length: 20 }, () => claimCoachIntent({
    model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestKey, requestHash: 'a'.repeat(64), commandType: 'log_workout',
  })));
  assert.equal(claims.filter(claim => claim.created).length, 1);
  assert.equal(new Set(claims.map(claim => claim.intent.id)).size, 1);
  assert.equal(await CoachIntent.count({ where: { actorId: 9101, requestKey } }), 1);
});

test('rollback discards the receipt update and commit persists sanitized data', async () => {
  const claim = await claimCoachIntent({ model: CoachIntent, actorId: 9101,
    requestKey: randomUUID(), requestHash: 'b'.repeat(64), commandType: 'log_workout' });
  await assert.rejects(sequelize.transaction(async transaction => {
    await completeCoachIntent({ model: CoachIntent, intentId: claim.intent.id,
      result: { privateNotes: 'synthetic', realAffectedCount: 1 }, transaction });
    throw new Error('synthetic rollback');
  }), /synthetic rollback/);
  const rolledBack = await CoachIntent.findByPk(claim.intent.id);
  assert.equal(rolledBack.status, 'claimed');
  assert.equal(rolledBack.result, null);
  await sequelize.transaction(async transaction => {
    await completeCoachIntent({ model: CoachIntent, intentId: claim.intent.id,
      result: { privateNotes: 'synthetic', realAffectedCount: 1 }, transaction });
  });
  const committed = await CoachIntent.findByPk(claim.intent.id);
  assert.equal(committed.status, 'completed');
  assert.equal(committed.result.realAffectedCount, 1);
  assert.equal(Object.hasOwn(committed.result, 'privateNotes'), false);
});

test('v2 cancel and execution race has one winner at the reviewed revision', async () => {
  const { createCoachIntentDraft, advanceCoachIntent } = await import('../../services/ai/coachIntentLifecycle.mjs');
  const draft = await createCoachIntentDraft({ model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestKey: randomUUID(), requestHash: 'c'.repeat(64), commandType: 'log_workout', proposalId: randomUUID() });
  const preview = await advanceCoachIntent({ model: CoachIntent, intentId: draft.intent.id, actorId: 9101,
    expectedVersion: 0, event: 'review', expectedHash: 'd'.repeat(64), operationId: randomUUID(),
    expiresAt: new Date(Date.now() + 60000) });
  assert.equal(preview.intent.status, 'awaiting_approval');
  const race = await Promise.all(['start', 'cancel'].map(event => advanceCoachIntent({
    model: CoachIntent, intentId: draft.intent.id, actorId: 9101, expectedVersion: 1, event,
    operationId: preview.intent.operationId,
  })));
  assert.equal(race.filter(result => result.changed).length, 1);
  assert.ok(['executing', 'cancelled'].includes((await CoachIntent.findByPk(draft.intent.id)).status));
  assert.equal((await CoachIntent.findByPk(draft.intent.id)).version, 2);
});

test('v2 cannot commit without writer transaction or cancel after execution starts', async () => {
  const { createCoachIntentDraft, advanceCoachIntent } = await import('../../services/ai/coachIntentLifecycle.mjs');
  const draft = await createCoachIntentDraft({ model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestKey: randomUUID(), requestHash: 'e'.repeat(64), commandType: 'log_workout', proposalId: randomUUID() });
  const operationId = randomUUID();
  const step = (event, expectedVersion, extra = {}) => advanceCoachIntent({ model: CoachIntent,
    intentId: draft.intent.id, actorId: 9101, event, expectedVersion, operationId, ...extra });
  await step('review', 0, { expectedHash: 'f'.repeat(64), expiresAt: new Date(Date.now() + 60000) });
  await step('start', 1);
  assert.equal((await step('cancel', 2)).changed, false);
  await assert.rejects(step('commit', 2, { result: { realAffectedCount: 1 } }), /writer transaction/i);
  await sequelize.transaction(async transaction => {
    const result = await step('commit', 2, { result: { realAffectedCount: 1 }, transaction });
    assert.equal(result.intent.status, 'committed_unverified');
  });
  const stored = await CoachIntent.findByPk(draft.intent.id);
  assert.ok(stored.committedAt instanceof Date);
  assert.equal(stored.verifiedAt, null);
});

test('one proposal cannot acquire two durable intents under different request keys', async () => {
  const { createCoachIntentDraft } = await import('../../services/ai/coachIntentLifecycle.mjs');
  const input = { model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestHash: '9'.repeat(64), commandType: 'log_workout', proposalId: randomUUID() };
  const first = await createCoachIntentDraft({ ...input, requestKey: randomUUID() });
  const again = await createCoachIntentDraft({ ...input, requestKey: randomUUID() });
  assert.equal(again.intent.id, first.intent.id);
  assert.equal(again.created, false);
  const mismatch = await createCoachIntentDraft({ ...input, requestKey: randomUUID(), requestHash: '8'.repeat(64) });
  assert.equal(mismatch.status, 'conflict');
  assert.equal(mismatch.intent, null);
});

test('20 proposal aliases race to one binding and another actor cannot acquire it', async () => {
  const { createCoachIntentDraft } = await import('../../services/ai/coachIntentLifecycle.mjs');
  const input = { model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestHash: '7'.repeat(64), commandType: 'log_workout', proposalId: randomUUID() };
  const claims = await Promise.all(Array.from({ length: 20 }, () =>
    createCoachIntentDraft({ ...input, requestKey: randomUUID() })));
  assert.equal(claims.filter(claim => claim.created).length, 1);
  assert.equal(new Set(claims.map(claim => claim.intent.id)).size, 1);
  const otherActor = await createCoachIntentDraft({ ...input, actorId: 9102, requestKey: randomUUID() });
  assert.equal(otherActor.status, 'conflict');
  assert.equal(otherActor.intent, null);
});

test('wrong actor, stale revision and expired approval cannot start or rewrite an intent', async () => {
  const { createCoachIntentDraft, advanceCoachIntent } = await import('../../services/ai/coachIntentLifecycle.mjs');
  const draft = await createCoachIntentDraft({ model: CoachIntent, actorId: 9101, targetClientId: 9201,
    requestKey: randomUUID(), requestHash: '6'.repeat(64), commandType: 'log_workout', proposalId: randomUUID() });
  const step = extra => advanceCoachIntent({ model: CoachIntent, intentId: draft.intent.id,
    actorId: 9101, expectedVersion: 0, event: 'review', expectedHash: '5'.repeat(64),
    operationId: randomUUID(), expiresAt: new Date(Date.now() + 60000), ...extra });
  const wrongActor = await step({ actorId: 9102 });
  assert.equal(wrongActor.status, 'unavailable');
  assert.equal(wrongActor.intent, null);
  const reviewed = await step({});
  assert.equal((await step({ expectedHash: '4'.repeat(64) })).changed, false);
  await CoachIntent.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { id: draft.intent.id } });
  const expired = await step({ event: 'start', expectedVersion: 1, operationId: reviewed.intent.operationId });
  assert.equal(expired.code, 'APPROVAL_EXPIRED');
  const stored = await CoachIntent.findByPk(draft.intent.id);
  assert.equal(stored.status, 'awaiting_approval');
  assert.equal(stored.expectedHash, '5'.repeat(64));
  assert.equal(stored.version, 1);
});
