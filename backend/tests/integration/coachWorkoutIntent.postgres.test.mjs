/** Versioned proposal authoring -> actual canonical writer -> snapshot proof.
 * Account/FK tables are synthetic; Exercise/Form/Session/Log/Intent and their
 * transaction behavior are the real models. No app .env or provider calls.
 */
import { beforeAll, beforeEach, afterAll, afterEach, expect, test, vi } from 'vitest';
import Sequelize, { DataTypes, QueryTypes } from 'sequelize';
import db from '../helpers/coachTestDatabase.mjs';
import proposalMigration from '../../migrations/20260506120000-create-coach-intake-items.cjs';
import intentV1 from '../../migrations/20260904000000-create-coach-intents.cjs';
import intentV2 from '../../migrations/20260906000000-coach-intent-lifecycle-v2.cjs';
vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));
vi.mock('../../models/index.mjs', () => ({ getAllModels: () => db.models }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
vi.mock('../../services/plaudCipherService.mjs', () => ({
  encryptPayload: value => ({ cipher: Buffer.from(JSON.stringify(value)), iv: Buffer.from('iv'), tag: Buffer.from('tag'), keyId: 'TEST' }),
  decryptPayload: ({ cipher }) => JSON.parse(Buffer.from(cipher).toString()),
}));
vi.mock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(), summarizeOnboardingDraftForReview: vi.fn(),
}));
vi.mock('../../services/ai/coachPlanEditApprovalService.mjs', () => ({ applyPlanEditProposal: vi.fn(), resolveActiveEditablePlan: vi.fn() }));
vi.mock('../../services/workout/workoutXpAwardStep.mjs', () => ({ runWorkoutXpAwardStep: vi.fn(async () => null) }));
vi.mock('../../services/workout/workoutPrDetectionService.mjs', () => ({ detectAndRecordPersonalRecords: vi.fn(async () => ({ prEvents: [] })) }));
vi.mock('../../services/workout/aiWorkoutChallengeProgressBridge.mjs', () => ({ applyAiWorkoutChallengeProgress: vi.fn(async () => ({ status: 'none', updates: [] })) }));
vi.mock('../../services/trainerSessionEarningService.mjs', () => ({ accrueFlatSessionEarning: vi.fn() }));
let User, Form, Session, Log, Exercise, Intent, Assignment, create, detail, approve, reject, library;
const rawQuery = db.query.bind(db), actor = { id: 7, role: 'admin' };
const payload = () => ({ clientId: 42, date: '2026-05-05', title: 'Synthetic workout',
  exercises: [{ exerciseId: library.id, exerciseKey: 'synthetic-squat', name: 'Synthetic Squat',
    exerciseInstanceId: 'first', unit: 'lb', sets: [{ setNumber: 1, reps: 8, weight: 40 }, { setNumber: 2, reps: 7, weight: 40 }] }] });
const prepare = value => create({ type: 'workout_log', payload: value || payload(), user: actor,
  conversation: { targetUserId: 42 }, db });
const input = id => ({ id, req: { user: actor }, sequelizeOverride: db });
const state = async id => (await rawQuery('SELECT * FROM coach_action_proposals WHERE id=:id',
  { replacements: { id }, type: QueryTypes.SELECT }))[0];
const intent = id => Intent.findOne({ where: { proposalId: id } });
async function reviewed() {
  const draft = await prepare(), request = input(draft.id);
  const preview = await detail(request);
  expect(preview.status).toBe(200);
  request.req.body = { reviewToken: preview.body.proposal.reviewToken };
  return request;
}
async function rollbackProof(id) {
  expect((await state(id)).status).toBe('PENDING');
  expect((await intent(id)).status).toBe('awaiting_approval');
  expect(await Form.count()).toBe(0); expect(await Session.count()).toBe(0); expect(await Log.count()).toBe(0);
  expect((await User.findByPk(42)).availableSessions).toBe(3);
}
beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-intent-review-secret-only');
  await db.authenticate();
  User = db.define('User', { id: { type: DataTypes.INTEGER, primaryKey: true }, role: DataTypes.STRING,
    availableSessions: DataTypes.INTEGER, clientSource: DataTypes.STRING, timeZone: DataTypes.STRING,
    timeZoneConfigured: DataTypes.BOOLEAN }, { tableName: 'Users', timestamps: false });
  await User.sync();
  for (const sql of ['CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS workout_plans (id UUID PRIMARY KEY)',
    'CREATE TABLE IF NOT EXISTS workout_plan_days (id UUID PRIMARY KEY)']) await rawQuery(sql);
  Form = (await import('../../models/DailyWorkoutForm.mjs')).default;
  Session = (await import('../../models/WorkoutSession.mjs')).default;
  Log = (await import('../../models/WorkoutLog.mjs')).default;
  Assignment = (await import('../../models/ClientTrainerAssignment.mjs')).default;
  Exercise = (await import('../../models/Exercise.mjs')).default;
  Intent = (await import('../../models/CoachIntent.mjs')).default;
  await Assignment.sync(); await Session.sync(); await Form.sync(); await Log.sync(); await Exercise.sync();
  await proposalMigration.up(db.getQueryInterface());
  await intentV1.up(db.getQueryInterface(), Sequelize); await intentV2.up(db.getQueryInterface(), Sequelize);
  ({ createCoachActionProposalDraft: create } = await import('../../services/ai/coachActionProposalService.mjs'));
  ({ getCoachActionProposal: detail, approveCoachActionProposal: approve, rejectCoachActionProposal: reject }
    = await import('../../services/ai/coachActionProposalApprovalService.mjs'));
});
beforeEach(async () => {
  vi.stubEnv('COACH_VERIFIED_WORKOUTS_ENABLED', 'true');
  await rawQuery('TRUNCATE "Users" CASCADE');
  await Form.destroy({ where: {} }); await Log.destroy({ where: {} }); await Session.destroy({ where: {} });
  await Intent.destroy({ where: {} }); await Exercise.destroy({ where: {} });
  await rawQuery('TRUNCATE coach_action_proposals CASCADE');
  await User.bulkCreate([{ id: 7, role: 'admin' }, { id: 42, role: 'client', availableSessions: 3, clientSource: 'swan' }]);
  library = await Exercise.create({ name: 'Synthetic Squat', exercise_key: 'synthetic-squat',
    description: 'Synthetic', instructions: 'Synthetic', exerciseType: 'compound', primaryMuscles: ['legs'], difficulty: 1 });
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { vi.unstubAllEnvs(); await db.close(); });

test('new preview has one durable drafted input binding, no fabricated post-save proof', async () => {
  const draft = await prepare(), row = await intent(draft.id);
  expect(row).toBeTruthy(); expect(row.status).toBe('drafted'); expect(row.requestHash).toMatch(/^[a-f0-9]{64}$/);
  expect(row.expectedHash).toBeNull(); expect(row.expectedFootprint).toBeNull();
  expect((await state(draft.id)).schema_version).toBe('coach-workout-v2');
  expect(await Form.count()).toBe(0);
});
test('intent creation failure cannot leave an orphaned reviewable proposal', async () => {
  vi.spyOn(Intent, 'create').mockRejectedValueOnce(new Error('synthetic intent failure'));
  await expect(prepare()).rejects.toThrow();
  expect((await rawQuery('SELECT id FROM coach_action_proposals', { type: QueryTypes.SELECT })).length).toBe(0);
});
test('real detail, writer and independent readback return one verified receipt with actual IDs', async () => {
  const request = await reviewed(), response = await approve(request), saved = await intent(request.id);
  expect(response.status).toBe(200); expect(saved.status).toBe('verified');
  const form = await Form.findOne(), session = await Session.findOne();
  expect(saved.expectedFootprint.dailyFormId).toBe(form.id); expect(saved.expectedFootprint.sessionId).toBe(session.id);
  expect(saved.requestHash).not.toBe(saved.expectedHash);
  expect(saved.result.realAffectedCount).toBe(2); expect(response.body.intent.result.state).toBe('verified');
  expect(form.formData.exercises[0]).toMatchObject({ exerciseId: library.id, unit: 'lb' });
  expect((await User.findByPk(42)).availableSessions).toBe(2);
});
test('intent commit failure rolls back APPLIED, diary, logs and credits', async () => {
  const request = await reviewed(), update = Intent.update.bind(Intent);
  vi.spyOn(Intent, 'update').mockImplementation((values, options) => {
    if (values.status === 'committed_unverified') throw new Error('synthetic receipt failure');
    return update(values, options);
  });
  expect((await approve(request)).status).toBe(400); await rollbackProof(request.id);
});
test('20 concurrent approvals share one workout, one intent and one credit deduction', async () => {
  const request = await reviewed();
  const responses = await Promise.all(Array.from({ length: 20 }, () => approve(request)));
  expect(responses.filter(result => result.status === 200).length).toBe(20);
  expect(await Form.count()).toBe(1); expect(await Log.count()).toBe(2); expect(await Intent.count()).toBe(1);
  expect((await User.findByPk(42)).availableSessions).toBe(2);
});
test('new detail token cannot launder changed encrypted reviewed input', async () => {
  const request = await reviewed(), row = await state(request.id);
  const changed = JSON.parse(row.proposal_cipher.toString()); changed.payload.title = 'Changed after binding';
  await rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
    { replacements: { id: request.id, cipher: Buffer.from(JSON.stringify(changed)) } });
  expect((await detail(input(request.id))).status).toBe(409);
  expect((await approve(request)).status).toBe(409); await rollbackProof(request.id);
});
test('rollback switch permits committed receipt recovery, refuses new v2 execution', async () => {
  const request = await reviewed(); expect((await approve(request)).status).toBe(200);
  const other = await reviewed();
  vi.stubEnv('COACH_VERIFIED_WORKOUTS_ENABLED', 'false');
  expect((await approve(request)).body.duplicate).toBe(true);
  expect((await approve(other)).status).toBe(503);
  expect(await Form.count()).toBe(1);
});
test('reject and approve race never leaves a cancelled intent with an APPLIED proposal', async () => {
  const request = await reviewed(); await Promise.all([reject(input(request.id)), approve(request)]);
  const saved = await intent(request.id), proposal = await state(request.id);
  if (proposal.status === 'REJECTED') { expect(saved.status).toBe('cancelled'); expect(await Form.count()).toBe(0); }
  else { expect(proposal.status).toBe('APPLIED'); expect(saved.status).toBe('verified'); expect(await Form.count()).toBe(1); }
});
test('deactivated canonical exercise after review is refused before writer effects', async () => {
  const request = await reviewed(); await library.update({ isActive: false });
  expect((await approve(request)).status).toBe(400); await rollbackProof(request.id);
});
test.each(['kg', null, false])('unsupported explicit unit %s cannot produce a trusted proposal', async unit => {
  const value = payload(); value.exercises[0].unit = unit;
  await expect(prepare(value)).rejects.toThrow(); expect(await Intent.count()).toBe(0);
});
test('actual committed transaction with lost acknowledgement is recovered by same proposal without another effect', async () => {
  const request = await reviewed(); let lose = true;
  vi.spyOn(db, 'query').mockImplementation(async (sql, options) => {
    const result = await rawQuery(sql, options);
    if (lose && sql === 'COMMIT;' && options?.transaction && await Form.count()) { lose = false; throw new Error('synthetic lost ACK'); }
    return result;
  });
  const unknown = await approve(request); expect(unknown.status).toBe(503);
  expect(unknown.body.code).toBe('WORKOUT_COMMIT_UNKNOWN'); expect(unknown.body.intentId).toBe((await intent(request.id)).id);
  vi.restoreAllMocks();
  expect((await approve(request)).body.duplicate).toBe(true);
  expect(await Form.count()).toBe(1); expect((await User.findByPk(42)).availableSessions).toBe(2);
});
test('receipt infrastructure failure after known commit never reports a workout apply failure', async () => {
  const request = await reviewed();
  vi.spyOn(Intent, 'findByPk').mockRejectedValueOnce(new Error('synthetic receipt lookup outage'));
  const response = await approve(request);
  expect(response.status).toBe(503); expect(response.body.code).toBe('WORKOUT_RESULT_UNAVAILABLE');
  expect(response.body.intentId).toBe((await intent(request.id)).id);
  expect((await state(request.id)).status).toBe('APPLIED'); expect(await Form.count()).toBe(1);
});
test.each(['log_value', 'session_date'])('wrong persisted %s rolls back before commit rather than merely failing later proof', async changed => {
  const request = await reviewed();
  if (changed === 'log_value') {
    const createLogs = Log.bulkCreate.bind(Log);
    vi.spyOn(Log, 'bulkCreate').mockImplementation((rows, options) => createLogs(rows.map(row => ({ ...row, weight: 999 })), options));
  } else {
    const findOrCreate = Session.findOrCreate.bind(Session);
    vi.spyOn(Session, 'findOrCreate').mockImplementation(async options => {
      const result = await findOrCreate(options);
      await result[0].update({ date: '2026-05-06' }, { transaction: options.transaction }); return result;
    });
  }
  expect((await approve(request)).status).toBe(400); await rollbackProof(request.id);
});
test('library lock wait cannot carry an expired approval into execution', async () => {
  const request = await reviewed(), findAll = Exercise.findAll.bind(Exercise), now = Date.now();
  vi.spyOn(Exercise, 'findAll').mockImplementation(async options => {
    const rows = await findAll(options); vi.spyOn(Date, 'now').mockReturnValue(now + 31 * 60000); return rows;
  });
  expect((await approve(request)).status).toBe(428); await rollbackProof(request.id);
});
test('already APPLIED receipt lookup outage reports saved/lookup semantics without dispatch', async () => {
  const request = await reviewed(); expect((await approve(request)).status).toBe(200);
  vi.spyOn(Intent, 'findOne').mockRejectedValueOnce(new Error('synthetic receipt unavailable'));
  const result = await approve(request);
  expect(result.status).toBe(503); expect(result.body).toMatchObject({ code: 'WORKOUT_RESULT_UNAVAILABLE', saved: true, proposalId: request.id });
  expect(await Form.count()).toBe(1); expect((await User.findByPk(42)).availableSessions).toBe(2);
});
test.each(['name', 'duration', 'intensity'])('ambiguous reviewed %s cannot be silently discarded or coerced', async field => {
  const value = payload();
  if (field === 'name') { value.exercises[0].exerciseName = 'Synthetic Squat'; value.exercises[0].name = 'Different'; }
  else value[field] = true;
  await expect(prepare(value)).rejects.toThrow(); expect(await Intent.count()).toBe(0); expect(await Form.count()).toBe(0);
});
test('postcommit changed encrypted payload cannot be certified by APPLIED retry', async () => {
  const request = await reviewed(); expect((await approve(request)).status).toBe(200);
  const row = await state(request.id), changed = JSON.parse(row.proposal_cipher.toString());
  changed.payload.notes = 'Changed later';
  await rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
    { replacements: { id: request.id, cipher: Buffer.from(JSON.stringify(changed)) } });
  expect((await approve(request)).status).toBe(409); expect(await Form.count()).toBe(1);
});
test('proposal mutation during snapshot read cannot promote or expose a stale verified receipt', async () => {
  const request = await reviewed(), readLogs = Log.findAll.bind(Log);
  vi.spyOn(Log, 'findAll').mockImplementation(async options => {
    const rows = await readLogs(options), proposal = await state(request.id);
    const changed = JSON.parse(proposal.proposal_cipher.toString()); changed.payload.title = 'Changed during read';
    await rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
      { replacements: { id: request.id, cipher: Buffer.from(JSON.stringify(changed)) } });
    return rows;
  });
  expect((await approve(request)).status).toBe(403);
  expect((await intent(request.id)).status).toBe('committed_unverified'); expect(await Form.count()).toBe(1);
});
test('receipt promotion actually locks proposal against concurrent mutation at the verified CAS', async () => {
  const request = await reviewed(), updateIntent = Intent.update.bind(Intent); let checked = false;
  vi.spyOn(Intent, 'update').mockImplementation(async (values, options) => {
    if (values.status === 'verified') {
      expect(options.transaction).toBeTruthy();
      // This independently connected transaction attempts the exact mutation the
      // synthetic adapter allowed. PostgreSQL must serialize it behind promotion.
      await expect(db.transaction(async other => {
        await rawQuery("SET LOCAL lock_timeout = '75ms'", { transaction: other });
        await rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
          { transaction: other, replacements: { id: request.id, cipher: Buffer.from('would corrupt binding') } });
      })).rejects.toMatchObject({ original: { code: '55P03' } });
      checked = true;
    }
    return updateIntent(values, options);
  });
  expect((await approve(request)).status).toBe(200); expect(checked).toBe(true);
  expect((await intent(request.id)).status).toBe('verified');
});
