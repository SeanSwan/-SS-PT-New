/** Real canonical form/session/log models and proposal migration, on loopback only.
 * User/assignment/session fixture tables supply account FKs; no production data.
 * Secondary services are isolated; approval, writer, billing and persistence are real.
 */
import { beforeAll, beforeEach, afterAll, afterEach, expect, test, vi } from 'vitest';
import { DataTypes, QueryTypes } from 'sequelize';
import { randomUUID } from 'node:crypto';
import db from '../helpers/coachTestDatabase.mjs';
import proposalMigration from '../../migrations/20260506120000-create-coach-intake-items.cjs';

vi.mock('../../database.mjs', async () => ({ default: (await import('../helpers/coachTestDatabase.mjs')).default }));
vi.mock('../../models/index.mjs', () => ({ getAllModels: () => db.models }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
vi.mock('../../services/plaudCipherService.mjs', () => ({
  encryptPayload: vi.fn(),
  decryptPayload: ({ cipher }) => JSON.parse(Buffer.from(cipher).toString()),
}));
vi.mock('../../services/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(), summarizeOnboardingDraftForReview: vi.fn(),
}));
vi.mock('../../services/ai/coachPlanEditApprovalService.mjs', () => ({
  applyPlanEditProposal: vi.fn(), resolveActiveEditablePlan: vi.fn(),
}));
vi.mock('../../services/workout/workoutXpAwardStep.mjs', () => ({ runWorkoutXpAwardStep: vi.fn(async () => null) }));
vi.mock('../../services/workout/workoutPrDetectionService.mjs', () => ({
  detectAndRecordPersonalRecords: vi.fn(async () => ({ prEvents: [] })),
}));
vi.mock('../../services/workout/aiWorkoutChallengeProgressBridge.mjs', () => ({
  applyAiWorkoutChallengeProgress: vi.fn(async () => ({ status: 'none', updates: [] })),
}));
vi.mock('../../services/trainerSessionEarningService.mjs', () => ({ accrueFlatSessionEarning: vi.fn() }));

let Form, Session, Log, User, Assignment, approve, reject, detail, writer, xp;
const actor = { id: 7, role: 'admin' };
const payload = { targetUserId: 42, payload: {
  clientId: 42, date: '2026-05-05', title: 'Synthetic test workout',
  exercises: [
    { exerciseName: 'Squat', sets: [{ reps: 8, weight: 40 }, { reps: 7, weight: 40 }] },
    { exerciseName: 'Row', sets: [{ reps: 10, weight: 20 }] },
  ],
} };
const rawQuery = db.query.bind(db);
async function proposal() {
  const id = randomUUID();
  await rawQuery(`INSERT INTO coach_action_proposals
    (id,created_by_user_id,proposal_type,schema_version,proposal_cipher,proposal_iv,proposal_tag,cipher_key_id)
    VALUES (:id,7,'workout_log','v1',:cipher,:iv,:tag,'TEST')`,
  { replacements: { id, cipher: Buffer.from(JSON.stringify(payload)), iv: Buffer.from('iv'), tag: Buffer.from('tag') } });
  const reviewed = await detail({ id, req: { user: actor }, sequelizeOverride: db });
  return { id, req: { user: actor, body: { reviewToken: reviewed.body.proposal.reviewToken } }, sequelizeOverride: db };
}
const state = async id => (await rawQuery('SELECT status, applied_result_json FROM coach_action_proposals WHERE id=:id',
  { replacements: { id }, type: QueryTypes.SELECT }))[0];
async function assertRolledBack(id) {
  expect((await state(id)).status).toBe('PENDING');
  expect(await Form.count()).toBe(0);
  expect(await Session.count()).toBe(0);
  expect(await Log.count()).toBe(0);
  expect((await User.findByPk(42)).availableSessions).toBe(2);
}

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-coach-atomic-review-secret');
  await db.authenticate();
  User = db.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true }, role: DataTypes.STRING,
    availableSessions: DataTypes.INTEGER, clientSource: DataTypes.STRING,
    timeZone: DataTypes.STRING, timeZoneConfigured: DataTypes.BOOLEAN,
  }, { tableName: 'Users', timestamps: false });
  await User.sync();
  await rawQuery('CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plans (id UUID PRIMARY KEY)');
  await rawQuery('CREATE TABLE IF NOT EXISTS workout_plan_days (id UUID PRIMARY KEY)');
  Form = (await import('../../models/DailyWorkoutForm.mjs')).default;
  Session = (await import('../../models/WorkoutSession.mjs')).default;
  Log = (await import('../../models/WorkoutLog.mjs')).default;
  Assignment = (await import('../../models/ClientTrainerAssignment.mjs')).default;
  await Assignment.sync();
  await Session.sync(); await Form.sync(); await Log.sync();
  await proposalMigration.up(db.getQueryInterface());
  ({ approveCoachActionProposal: approve, rejectCoachActionProposal: reject, getCoachActionProposal: detail }
    = await import('../../services/ai/coachActionProposalApprovalService.mjs'));
  ({ submitAiWorkoutLogAsDailyForm: writer } = await import('../../services/workout/aiWorkoutDailyFormService.mjs'));
  ({ runWorkoutXpAwardStep: xp } = await import('../../services/workout/workoutXpAwardStep.mjs'));
});
beforeEach(async () => {
  await Assignment.destroy({ where: {} });
  await rawQuery('TRUNCATE "Users" CASCADE');
  await User.bulkCreate([
    { id: 7, role: 'admin' },
    { id: 42, role: 'client', availableSessions: 2, clientSource: 'swanstudios',
      timeZone: 'UTC', timeZoneConfigured: true },
  ]);
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { vi.unstubAllEnvs(); await db.close(); });

test('APPLIED and all canonical rows become visible together with one credit deduction', async () => {
  const input = await proposal();
  let observed = false;
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('UPDATE coach_action_proposals') && opts?.replacements?.status === 'APPLIED') {
      expect(opts.transaction).toBeTruthy();
      expect(await Form.count({ transaction: opts.transaction })).toBe(1);
      expect(await Log.count({ transaction: opts.transaction })).toBe(3);
      expect(await Form.count()).toBe(0);
      expect((await state(input.id)).status).toBe('PENDING');
      observed = true;
    }
    return result;
  });
  const result = await approve(input);
  expect(result.status).toBe(200); expect(observed).toBe(true);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect((await User.findByPk(42)).availableSessions).toBe(1);
  const form = await Form.findOne(), session = await Session.findOne();
  const saved = (await state(input.id)).applied_result_json.workout;
  expect(saved.formId).toBe(form.id); expect(saved.sessionId).toBe(session.id);
  expect(form.sessionId).toBe(session.id); expect(form.sessionDeducted).toBe(true);
  expect(result.body.workout.formId).toBe(form.id);
});

test('log insert failure rolls back the proposal claim and all domain writes', async () => {
  const input = await proposal();
  vi.spyOn(Log, 'bulkCreate').mockRejectedValueOnce(new Error('synthetic insert failure'));
  expect((await approve(input)).status).toBe(400);
  await assertRolledBack(input.id);
});

test('failure after proposal APPLIED SQL rolls back proposal, diary, logs and credit', async () => {
  const input = await proposal();
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('UPDATE coach_action_proposals') && opts?.replacements?.status === 'APPLIED')
      throw new Error('synthetic after-apply failure');
    return result;
  });
  expect((await approve(input)).status).toBe(400);
  await assertRolledBack(input.id);
});

test('20 approvals produce exactly one canonical workout and one paid deduction', async () => {
  const input = await proposal();
  const results = await Promise.all(Array.from({ length: 20 }, () => approve(input)));
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 409)).toHaveLength(19);
  expect(await Form.count()).toBe(1); expect(await Log.count()).toBe(3);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect((await User.findByPk(42)).availableSessions).toBe(1);
});

test('approval and rejection cannot both win the same proposal', async () => {
  const input = await proposal();
  const results = await Promise.all([approve(input), reject(input)]);
  expect(results.filter(r => r.status === 200)).toHaveLength(1);
  expect(results.filter(r => r.status === 409)).toHaveLength(1);
  const status = (await state(input.id)).status;
  expect(['APPLIED', 'REJECTED']).toContain(status);
  expect(await Form.count()).toBe(status === 'APPLIED' ? 1 : 0);
});

test('review token cannot authorize changed encrypted proposal content', async () => {
  const input = await proposal();
  const changed = { ...payload, payload: { ...payload.payload, date: '2026-05-04' } };
  await rawQuery('UPDATE coach_action_proposals SET proposal_cipher=:cipher WHERE id=:id',
    { replacements: { id: input.id, cipher: Buffer.from(JSON.stringify(changed)) } });
  const result = await approve(input);
  expect(result.status).toBe(428);
  await assertRolledBack(input.id);
});

test('access revoked before transaction check prevents the canonical write', async () => {
  const input = await proposal();
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    const result = await rawQuery(sql, opts);
    if (typeof sql === 'string' && sql.includes('FOR UPDATE') && sql.includes('coach_action_proposals'))
      await User.update({ role: 'trainer' }, { where: { id: 42 } });
    return result;
  });
  expect((await approve(input)).status).toBe(403);
  await assertRolledBack(input.id);
});

test('unexpected XP failure after commit preserves APPLIED and successful save', async () => {
  const input = await proposal();
  xp.mockRejectedValueOnce(new Error('synthetic XP unavailable'));
  const result = await approve(input);
  expect(result.status).toBe(200);
  expect((await state(input.id)).status).toBe('APPLIED');
  expect(await Form.count()).toBe(1); expect(await Log.count()).toBe(3);
  expect((await User.findByPk(42)).availableSessions).toBe(1);
});

test('legacy/manual caller with no proposal hooks keeps its existing save contract', async () => {
  const result = await writer({ ...payload.payload, trainerId: 7, userRole: 'admin', sequelize: db });
  expect(result.totalSets).toBe(3); expect(result.formId).toBeTruthy();
  expect(await Form.count()).toBe(1);
  expect((await User.findByPk(42)).availableSessions).toBe(1);
});

test.each(['rejected', 'lost_ack'])('COMMIT %s never publishes intake APPLIED or overwrites the durable outcome', async failure => {
  const input = await proposal();
  const intakeId = randomUUID();
  await rawQuery(`INSERT INTO coach_intake_items
    (id,user_id,created_by_user_id,source_type,latest_proposal_id)
    VALUES (:intakeId,7,7,'typed_note',:proposalId)`, { replacements: { intakeId, proposalId: input.id } });
  vi.spyOn(db, 'query').mockImplementation(async (sql, opts) => {
    if (typeof sql === 'string' && sql.trim().toUpperCase() === 'COMMIT;') {
      if (failure === 'lost_ack') await rawQuery(sql, opts);
      throw new Error('synthetic commit interruption');
    }
    return rawQuery(sql, opts);
  });
  const result = await approve(input);
  expect(result.status).toBe(503); expect(result.body.code).toBe('WORKOUT_COMMIT_UNKNOWN');
  expect((await state(input.id)).status).toBe(failure === 'rejected' ? 'PENDING' : 'APPLIED');
  expect(await Form.count()).toBe(failure === 'rejected' ? 0 : 1);
  const [intake] = await rawQuery('SELECT metadata_json FROM coach_intake_items WHERE id=:intakeId',
    { replacements: { intakeId }, type: QueryTypes.SELECT });
  expect(intake.metadata_json).not.toHaveProperty('latestProposal.status', 'APPLIED');
  const [count] = await rawQuery('SELECT COUNT(*) AS n FROM coach_intake_events WHERE intake_item_id=:intakeId',
    { replacements: { intakeId }, type: QueryTypes.SELECT });
  expect(Number(count.n)).toBe(0);
});

test('revocation while approval waits on the client row is rechecked before writing', async () => {
  const input = await proposal();
  input.req.user = { id: 7, role: 'trainer' };
  await Assignment.create({ trainerId: 7, clientId: 42, status: 'active' });
  const blocker = await db.transaction();
  await User.findByPk(42, { transaction: blocker, lock: blocker.LOCK.UPDATE });
  let entered;
  const waiting = new Promise(resolve => { entered = resolve; });
  const find = User.findByPk.bind(User);
  vi.spyOn(User, 'findByPk').mockImplementation((id, opts) => {
    if (opts?.transaction && opts.transaction !== blocker) entered();
    return find(id, opts);
  });
  const approval = approve(input);
  try {
    await waiting;
    await Assignment.update({ status: 'inactive' }, { where: { trainerId: 7, clientId: 42 } });
  } finally { await blocker.commit(); }
  expect((await approval).status).toBe(403);
  await assertRolledBack(input.id);
});

test('transactional access holds the assignment row against concurrent revocation', async () => {
  await Assignment.create({ trainerId: 7, clientId: 42, status: 'active' });
  const { ensureClientAccess } = await import('../../utils/clientAccess.mjs');
  const writerTx = await db.transaction(), revokerTx = await db.transaction();
  try {
    expect((await ensureClientAccess({ user: { id: 7, role: 'trainer' } }, 42, { transaction: writerTx })).allowed).toBe(true);
    await rawQuery("SET LOCAL lock_timeout='100ms'", { transaction: revokerTx });
    await expect(Assignment.update({ status: 'inactive' }, {
      where: { trainerId: 7, clientId: 42 }, transaction: revokerTx,
    })).rejects.toMatchObject({ original: { code: '55P03' } });
  } finally { await revokerTx.rollback(); await writerTx.rollback(); }
});
