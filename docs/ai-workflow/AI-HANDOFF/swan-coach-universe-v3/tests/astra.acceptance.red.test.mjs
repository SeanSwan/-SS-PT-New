/** SCU v3.2 executable acceptance gaps, isolated from the normal green suite.
 * Calls real pure runtime boundaries with synthetic data; no DB/env/network.
 * Until implemented, failures are expected and are NOT a green release gate.
 * Run: node --test <packet>/tests/astra.acceptance.red.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiExercises } from '../../../../../backend/services/workout/aiWorkoutDailyFormPayloadService.mjs';
import { toCoachIntentReceipt, reconcileCoachIntent } from '../../../../../backend/services/ai/coachIntentService.mjs';
import { verifyCoachWorkoutReadback } from '../../../../../backend/services/ai/coachWorkoutResultVerifier.mjs';
import { buildCoachProgressEvidence } from '../../../../../backend/services/ai/coachProgressEvidence.mjs';

const strict = { policy: 'coach_verified_v1' };
const exercise = () => ({
  exerciseInstanceId: 'synthetic-instance-1',
  exerciseId: 'synthetic-bench', exerciseKey: 'synthetic-bench',
  exerciseName: 'Synthetic bench', unit: 'lb',
  sets: [{ setNumber: 1, reps: 8, weight: 135, load: 135 }],
});
const intent = (overrides = {}) => ({
  id: '00000000-0000-4000-8000-000000000001', actorId: 9101,
  targetClientId: 9201, commandType: 'log_workout', status: 'claimed',
  ...overrides,
});
const footprint = () => ({
  actorId: 9101, targetClientId: 9201, date: '2026-09-05',
  dailyFormId: 1, sessionId: '00000000-0000-4000-8000-000000000002',
  version: 1, exercises: [exercise()],
});
const session = (id) => ({
  id, status: 'completed', verified: true, exercises: [exercise()],
});

test('AR01 strict workout normalization preserves canonical identity and units', () => {
  const [out] = normalizeAiExercises([exercise()], strict);
  assert.equal(out.exerciseId, 'synthetic-bench');
  assert.equal(out.exerciseKey, 'synthetic-bench');
  assert.equal(out.unit, 'lb');
});

test('AR02 strict workout normalization rejects a negative load instead of zeroing it', () => {
  const row = exercise(); row.sets[0].weight = -5; row.sets[0].load = -5;
  assert.throws(() => normalizeAiExercises([row], strict),
    (error) => error.code === 'WORKOUT_LOAD_INVALID');
});

test('AR03 failed receipt has no committed timestamp', () => {
  const receipt = toCoachIntentReceipt(intent({
    status: 'failed', completedAt: new Date('2026-09-05T12:00:00Z'),
  }));
  assert.equal(receipt.committedAt, null);
});

test('AR04 a result-shaped object cannot self-certify verification', () => {
  const receipt = toCoachIntentReceipt(intent({ result: { state: 'verified' } }));
  assert.notEqual(receipt.state, 'verified');
  assert.equal(receipt.verifiedAt, null);
});

test('AR05 found-only reconciliation is insufficient evidence of a matching effect', async () => {
  const row = intent({ status: 'unknown' });
  let writes = 0;
  const model = {
    findByPk: async () => row,
    update: async (values) => { writes++; return [1, [{ ...row, ...values }]]; },
  };
  const result = await reconcileCoachIntent({
    model, intentId: row.id,
    authorizeIntent: async () => true,
    readEffect: async () => ({ found: true, result: { targetUserId: 9202 } }),
  });
  assert.equal(result.status, 'unknown');
  assert.equal(writes, 0);
});

test('AR06 progress must not fabricate a larger scheduled denominator', () => {
  const result = buildCoachProgressEvidence({
    sessions: [session('s1'), session('s2'), session('s3')], scheduledCount: 1,
  });
  assert.equal(result.adherence, null);
  assert.ok(result.missingInputs.includes('scheduled_session_matches'));
});

test('AR07 workout verification rejects name-only exercise identity', () => {
  const data = footprint();
  delete data.exercises[0].exerciseId; delete data.exercises[0].exerciseKey;
  assert.notEqual(verifyCoachWorkoutReadback({ expected: data, observed: data }).status, 'verified');
});

test('AR08 workout verification rejects duplicate set ordinals', () => {
  const data = footprint(); data.exercises[0].sets.push({ ...data.exercises[0].sets[0] });
  assert.notEqual(verifyCoachWorkoutReadback({ expected: data, observed: data }).status, 'verified');
});

test('AR09 control: matching canonical footprint verifies', () => {
  const data = footprint();
  assert.equal(verifyCoachWorkoutReadback({ expected: data, observed: data }).status, 'verified');
});

test('AR10 control: another client never verifies against the expected footprint', () => {
  const data = footprint();
  assert.notEqual(verifyCoachWorkoutReadback({
    expected: data, observed: { ...data, targetClientId: 9202 },
  }).status, 'verified');
});

test('AR11 real DailyWorkoutForm UUID is accepted by read-back verification', () => {
  const data = footprint();
  data.dailyFormId = '00000000-0000-4000-8000-000000000003';
  assert.equal(verifyCoachWorkoutReadback({ expected: data, observed: data }).status, 'verified');
});
