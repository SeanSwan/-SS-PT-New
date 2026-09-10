/** Actual form/session/log models and PostgreSQL snapshot semantics.
 * Fixed loopback test DB only. FK placeholders are fixtures, not account tests.
 */
import { beforeAll, beforeEach, afterAll, afterEach, expect, test, vi } from 'vitest';
import db from '../helpers/coachTestDatabase.mjs';
import { buildCoachWorkoutFootprint, verifyCoachWorkoutReadback } from '../../services/ai/coachWorkoutResultVerifier.mjs';
import { readCoachWorkoutFootprint } from '../../services/workout/coachWorkoutReadbackService.mjs';
import { hashCoachWorkoutExpectation } from '../../services/ai/coachIntentEffectProof.mjs';
import { reconcileCoachIntent } from '../../services/ai/coachIntentService.mjs';
import v1 from '../../migrations/20260904000000-create-coach-intents.cjs';
import v2 from '../../migrations/20260906000000-coach-intent-lifecycle-v2.cjs';
import Sequelize from 'sequelize';
import { randomUUID } from 'node:crypto';
vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));
let Form, Session, Log, Intent, form, session, expected;
const exercises = [
  { exerciseName: 'Same display', exerciseId: 29, exerciseInstanceId: 'first', unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, weight: 40 }, { setNumber: 3, reps: 7, weight: 40 }] },
  { exerciseName: 'Same display', exerciseKey: 'row', exerciseInstanceId: 'second', unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, weight: 40 }, { setNumber: 2, reps: 10, weight: 20 }] },
];
const rawQuery = db.query.bind(db);
const models = () => ({ sequelize: db, DailyWorkoutForm: Form, WorkoutSession: Session, WorkoutLog: Log });
const read = () => readCoachWorkoutFootprint({ models: models(), footprint: expected,
  intentId: 'intent', requestHash: 'request', proposalId: 'proposal' });
beforeAll(async () => {
  await db.authenticate();
  await rawQuery('CREATE TABLE IF NOT EXISTS "Users" (id INTEGER PRIMARY KEY)');
  await rawQuery('INSERT INTO "Users" (id) VALUES (7),(42) ON CONFLICT DO NOTHING');
  await rawQuery('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plans (id UUID PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plan_days (id UUID PRIMARY KEY)');
  Form = (await import('../../models/DailyWorkoutForm.mjs')).default;
  Session = (await import('../../models/WorkoutSession.mjs')).default;
  Log = (await import('../../models/WorkoutLog.mjs')).default;
  await Session.sync(); await Form.sync(); await Log.sync();
  Intent = (await import('../../models/CoachIntent.mjs')).default;
  await v1.up(db.getQueryInterface(), Sequelize);
  await v2.up(db.getQueryInterface(), Sequelize);
});
beforeEach(async () => {
  await Form.destroy({ where: {} }); await Log.destroy({ where: {} }); await Session.destroy({ where: {} });
  session = await Session.create({ userId: 42, trainerId: 7, date: '2026-05-05', title: 'Synthetic' });
  form = await Form.create({ sessionId: session.id, clientId: 42, trainerId: 7,
    date: '2026-05-05', formData: { exercises } });
  const rows = exercises.flatMap(exercise => exercise.sets.map(set => ({
    sessionId: session.id, exerciseName: exercise.exerciseName, ...set,
  })));
  await Log.bulkCreate(rows.reverse());
  expected = buildCoachWorkoutFootprint({ actorId: 7, targetClientId: 42,
    date: '2026-05-05', dailyFormId: form.id, sessionId: session.id, exercises });
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { await db.close(); });

test('actual DATE timestamp and repeated exercises verify with arbitrary row ordering', async () => {
  expect(expected.schemaVersion).toBe(2); expect(expected).not.toHaveProperty('version');
  const result = await read();
  expect(result.observed).toEqual(expected);
  expect(verifyCoachWorkoutReadback({ expected, observed: result.observed })).toMatchObject({
    status: 'verified', realAffectedCount: 4,
  });
});

test('PostgreSQL snapshot really is read-only and repeatable-read, not merely option labels', async () => {
  let checks = 0;
  const find = Form.findByPk.bind(Form);
  vi.spyOn(Form, 'findByPk').mockImplementation(async (id, options) => {
    const [mode] = await rawQuery('SHOW transaction_read_only', options);
    const [isolation] = await rawQuery('SHOW transaction_isolation', options);
    expect(mode.transaction_read_only).toBe('on');
    expect(isolation.transaction_isolation).toBe('repeatable read');
    checks++;
    return find(id, options);
  });
  expect((await read()).observed).toEqual(expected);
  expect(checks).toBe(1);
});

test('concurrent edit between queries cannot assemble rows from different snapshots', async () => {
  const find = Form.findByPk.bind(Form);
  vi.spyOn(Form, 'findByPk').mockImplementation(async (id, options) => {
    const value = await find(id, options);
    await Log.update({ weight: 999 }, { where: { sessionId: session.id } });
    return value;
  });
  expect((await read()).observed).toEqual(expected);
  vi.restoreAllMocks();
  expect((await read()).observed).toBeNull();
});

test.each(['missing', 'extra', 'weight', 'owner', 'unit', 'instance'])('changed persisted %s prevents verification', async changed => {
  if (changed === 'missing') await (await Log.findOne()).destroy();
  if (changed === 'extra') await Log.create({ sessionId: session.id, exerciseName: 'Same display', setNumber: 1, reps: 8, weight: 40 });
  if (changed === 'weight') await Log.update({ weight: 50 }, { where: { sessionId: session.id } });
  if (changed === 'owner') await session.update({ trainerId: 42 });
  if (changed === 'unit' || changed === 'instance') {
    const edited = structuredClone(exercises);
    if (changed === 'unit') edited[0].unit = 'kg';
    else edited[0].exerciseInstanceId = 'different';
    await form.update({ formData: { exercises: edited } });
  }
  expect(verifyCoachWorkoutReadback({ expected, observed: (await read()).observed }).status).not.toBe('verified');
});

test('snapshot establishment failure performs no model read and no unprotected fallback', async () => {
  const find = vi.spyOn(Form, 'findByPk');
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    if (typeof sql === 'string' && sql.includes('SET TRANSACTION READ ONLY')) throw new Error('synthetic snapshot refusal');
    return rawQuery(sql, opts);
  });
  const result = await read();
  expect(result.observed ?? null).toBeNull(); expect(find).not.toHaveBeenCalled();
});

test('semantic hashing excludes display/free text but binds instance and numeric truth', () => {
  const original = hashCoachWorkoutExpectation(expected);
  expect(original).toMatch(/^[a-f0-9]{64}$/);
  const display = structuredClone(expected);
  display.exercises[0].exerciseName = 'Renamed'; display.notes = 'Not proof'; display.createdAt = 'irrelevant';
  expect(hashCoachWorkoutExpectation(display)).toBe(original);
  display.exercises[0].exerciseInstanceId = 'changed';
  expect(hashCoachWorkoutExpectation(display)).not.toBe(original);
});

test('actual persisted v2 footprint and snapshot reader promote a real receipt exactly once', async () => {
  const row = await Intent.create({ actorId: 7, targetClientId: 42, requestKey: randomUUID(),
    requestHash: 'a'.repeat(64), commandType: 'log_workout', proposalId: randomUUID(),
    status: 'committed_unverified', version: 3, proofVersion: 2, committedAt: new Date(),
    expectedHash: hashCoachWorkoutExpectation(expected), expectedFootprint: expected });
  let reads = 0;
  const args = { model: Intent, intentId: row.id, authorizeIntent: async () => true,
    readEffect: async intent => {
      reads++;
      return readCoachWorkoutFootprint({ models: models(), footprint: intent.expectedFootprint,
        intentId: intent.id, requestHash: intent.requestHash, proposalId: intent.proposalId });
    } };
  const result = await reconcileCoachIntent(args);
  expect(result.status).toBe('verified'); expect(result.intent.version).toBe(4);
  expect(result.intent.result.realAffectedCount).toBe(4);
  expect(result.intent.result.recordRefs.map(ref => ref.id)).toEqual([form.id, session.id]);
  expect((await reconcileCoachIntent(args)).status).toBe('verified');
  expect(reads).toBe(1);
});

test.each([false, null, 0])('persisted malformed alternate identity %s cannot disappear during proof', async malformed => {
  const edited = structuredClone(exercises);
  edited[1].exerciseId = malformed;
  await form.update({ formData: { exercises: edited } });
  const result = await read();
  expect(result.observed).toBeNull();
  expect(verifyCoachWorkoutReadback({ expected, observed: result.observed }).status).not.toBe('verified');
});
