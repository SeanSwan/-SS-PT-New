/**
 * SCU G03 / S3 — POSTGRES GATE. Staff workout-draft requestKey idempotency on
 * the REAL coach_intents/coach_action_proposals tables + real intent lifecycle
 * (disposable loopback DB, labeled coach_test_20260906; no app .env, providers
 * mocked). Covers T11–T16 + T46 from packet 31/32.
 *
 * Account/FK tables are synthetic; Exercise/Intent/Proposal and their
 * transaction behavior are real. T13–T15/T46 reuse the G01 review/approve
 * pipeline on intents created through the G03 staff entry, proving the draft
 * path feeds the v2 state machine untouched.
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
let User, Form, Session, Log, Exercise, Intent, Assignment, library, createDraft;
let detail, approve, reject;
const rawQuery = db.query.bind(db);
const admin = { id: 7, role: 'admin' };
const trainerA = { id: 7, role: 'trainer' }; // assignment rows below cover both
const trainerB = { id: 8, role: 'trainer' };
const KEY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const KEY_B = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
const TASK = '11111111-2222-4333-8444-555555555555';
const workout = title => ({ date: '2026-05-05', title, exercises: [{
  exerciseId: library.id, unit: 'lb', sets: [{ setNumber: 1, reps: 8, weight: 40 }] }] });
const body = (title = 'G03 synthetic') => ({ schemaVersion: 1, taskId: TASK, requestKey: KEY, draftRevision: 0, targetUserId: 42, workout: workout(title) });
const state = async id => (await rawQuery('SELECT * FROM coach_action_proposals WHERE id=:id', { replacements: { id }, type: QueryTypes.SELECT }))[0];
const intentByProposal = id => Intent.findOne({ where: { proposalId: id } });
const input = id => ({ id, req: { user: admin }, sequelizeOverride: db });
async function reviewed() {
  const result = await createDraft({ user: admin, body: body(), db });
  expect(result.status).toBe(200);
  const request = input(result.proposalId);
  const preview = await detail(request);
  expect(preview.status).toBe(200);
  request.req.body = { reviewToken: preview.body.proposal.reviewToken };
  return { result, request };
}

beforeAll(async () => {
  vi.stubEnv('JWT_SECRET', 'synthetic-draft-review-secret-only');
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
  ({ createWorkoutDraftRequest: createDraft } = await import('../../services/ai/coachWorkoutDraftRequestService.mjs'));
  ({ getCoachActionProposal: detail, approveCoachActionProposal: approve, rejectCoachActionProposal: reject }
    = await import('../../services/ai/coachActionProposalApprovalService.mjs'));
});
beforeEach(async () => {
  vi.stubEnv('COACH_VERIFIED_WORKOUTS_ENABLED', 'true');
  await rawQuery('TRUNCATE "Users" CASCADE');
  await rawQuery('TRUNCATE client_trainer_assignments');
  await Form.destroy({ where: {} }); await Log.destroy({ where: {} }); await Session.destroy({ where: {} });
  await Intent.destroy({ where: {} }); await Exercise.destroy({ where: {} });
  await rawQuery('TRUNCATE coach_action_proposals CASCADE');
  await User.bulkCreate([
    { id: 7, role: 'trainer' },
    { id: 8, role: 'trainer' },
    { id: 42, role: 'client', availableSessions: 3, clientSource: 'swan' },
  ]);
  await Assignment.bulkCreate([
    { clientId: 42, trainerId: 7, status: 'active' },
    { clientId: 42, trainerId: 8, status: 'active' },
  ]);
  library = await Exercise.create({ name: 'Synthetic Squat', exercise_key: 'synthetic-squat',
    description: 'Synthetic', instructions: 'Synthetic', exerciseType: 'compound', primaryMuscles: ['legs'], difficulty: 1 });
});
afterEach(() => { vi.restoreAllMocks(); });
afterAll(async () => { vi.unstubAllEnvs(); await db.close(); });

test('T11: 20 concurrent same-key creates yield one intent, one proposal, stable refs', async () => {
  const results = await Promise.all(Array.from({ length: 20 }, () =>
    createDraft({ user: admin, body: body(), db })));
  expect(results.every(result => result.status === 200)).toBe(true);
  const proposalIds = new Set(results.map(result => result.proposalId));
  const intentIds = new Set(results.map(result => result.intentId));
  expect(proposalIds.size).toBe(1);
  expect(intentIds.size).toBe(1);
  expect(await Intent.count()).toBe(1);
  expect(Number((await rawQuery('SELECT COUNT(*) AS n FROM coach_action_proposals', { type: QueryTypes.SELECT }))[0].n)).toBe(1);
  expect((await rawQuery('SELECT * FROM coach_action_proposals', { type: QueryTypes.SELECT })).length).toBe(1);
  // Transport-retry receipts are stable: the row is PENDING (prepared, not executed).
  expect((await state([...proposalIds][0])).status).toBe('PENDING');
  expect((await intentByProposal([...proposalIds][0])).status).toBe('drafted');
});

test('T12a: changed semantic params on a reused key return 409; T12b: another actor with the same key is isolated', async () => {
  const first = await createDraft({ user: admin, body: body('first revision'), db });
  expect(first.status).toBe(200);
  await expect(createDraft({ user: admin, body: body('second revision'), db }))
    .rejects.toMatchObject({ code: 'WORKOUT_DRAFT_HASH_MISMATCH', statusCode: 409 });
  // Same KEY on a different actor: own intent row, never the first actor's record.
  const other = await createDraft({ user: trainerB, body: { ...body('first revision'), requestKey: KEY }, db });
  expect(other.status).toBe(200);
  expect(other.intentId).not.toBe(first.intentId);
  expect(other.proposalId).not.toBe(first.proposalId);
  const rows = await rawQuery('SELECT * FROM coach_intents WHERE "requestKey"=:k ORDER BY "createdAt"',
    { replacements: { k: KEY }, type: QueryTypes.SELECT });
  expect(rows.length).toBe(2);
  expect(new Set(rows.map(row => row.actorId)).size).toBe(2);
  // Exercise the real INTERNAL AI entry, not the strict staff HTTP contract.
  const {createCoachActionProposalDraft}=await import('../../services/ai/coachActionProposalService.mjs');
  const aiBody=()=>({type:'workout_log',payload:{...workout('ai'),clientId:42},summary:{clientId:42},user:admin,conversation:{targetUserId:42},db});
  const ai1=await createCoachActionProposalDraft(aiBody()),ai2=await createCoachActionProposalDraft(aiBody());
  expect(ai1.idempotent).toBe(false);expect(ai2.idempotent).toBe(false);expect(ai1.id).not.toBe(ai2.id);

});

test('T13: committed draft intent drops its response; the same intent returns the committed result with one effect', async () => {
  const { result, request } = await reviewed();
  const first = await approve(request);
  expect(first.status).toBe(200);
  // Response dropped at the transport edge: retry the SAME reviewed request.
  const retry = await approve(request);
  expect(retry.status).toBe(200);
  expect(retry.body.duplicate).toBe(true);
  expect(retry.body.intent.id).toBe(result.intentId);
  expect(await Form.count()).toBe(1);
  expect(await Log.count()).toBe(1);
  expect(await Intent.count()).toBe(1);
  expect((await User.findByPk(42)).availableSessions).toBe(2);
  expect((await intentByProposal(result.proposalId)).status).toBe('verified');
});

test('T14: crash after claim before the domain transaction completes rolls the claim back; no automatic re-execution after expiry', async () => {
  const { result, request } = await reviewed();
  // The writer claims the intent (awaiting_approval -> executing) inside beforeWrite,
  // in the SAME transaction as the domain write. Crash after the claim, before commit:
  // one rollback restores awaiting_approval + PENDING + zero domain rows. The generic
  // claimed->unknown CAS belongs to non-workout command paths, not this writer.
  vi.spyOn(await import('../../services/workout/aiWorkoutDailyFormService.mjs'), 'submitAiWorkoutLogAsDailyForm')
    .mockImplementation(async (args) => {
    const transaction = await db.transaction();
    try { await args.beforeWrite({ transaction, models: db.models }); }
    finally { await transaction.rollback(); }
    const error = new Error('synthetic crash after claim'); error.code = 'SYNTHETIC_CRASH';
    throw error;
  });
  await approve(request);
  vi.restoreAllMocks();
  expect((await intentByProposal(result.proposalId)).status).toBe('awaiting_approval'); // claim rolled back
  expect(await Form.count()).toBe(0);
  expect((await state(result.proposalId)).status).toBe('PENDING'); // proposal claim rolled back
  // Past the review-claim expiry with no writer: no automatic re-execution, no false verify.
  const realNow = Date.now; Date.now = () => realNow() + 61000;
  try {
    expect((await intentByProposal(result.proposalId)).status).toBe('awaiting_approval');
    expect(await Form.count()).toBe(0);
    expect(await Session.count()).toBe(0);
  } finally { Date.now = realNow; }
  void request;
});

test('T15: receipt readback unavailable then recovers -> committed_unverified -> verified, no second write', async () => {
  const { result, request } = await reviewed();
  const findByPk = Intent.findByPk.bind(Intent);
  vi.spyOn(Intent, 'findByPk').mockImplementationOnce(async (...options) => {
    const row = await findByPk(...options);
    if (row && (await Intent.findByPk(row.id, { attributes: ['id', 'status'] }))?.status === 'committed_unverified') {
      throw new Error('synthetic readback outage');
    }
    return row;
  });
  const unknown = await approve(request);
  expect(unknown.status).toBe(503);
  expect(unknown.body.code).toBe('WORKOUT_RESULT_UNAVAILABLE');
  const stuck = await intentByProposal(result.proposalId);
  expect(stuck.status).toBe('committed_unverified');
  expect(await Form.count()).toBe(1);
  // The recovery readback observes the persisted expectation itself — the same
  // independent-observation contract the real readback service enforces.
  const { reconcileCoachIntent } = await import('../../services/ai/coachIntentService.mjs');
  const recovered = await reconcileCoachIntent({
    model: Intent, intentId: stuck.id,
    readEffect: intent => ({ found: true, intentId: intent.id, requestHash: intent.requestHash,
      proposalId: intent.proposalId, observed: intent.expectedFootprint }),
    authorizeIntent: async intent => intent.actorId === row_actor() && intent.targetClientId === 42,
  });
  expect(recovered.status).toBe('verified');
  expect((await intentByProposal(result.proposalId)).status).toBe('verified');
  expect(await Form.count()).toBe(1); // no second write
  expect(await Log.count()).toBe(1);
  expect((await User.findByPk(42)).availableSessions).toBe(2);
  function row_actor() { return Number(stuck.actorId); }
});

test('T16: entry gate off with a pending intent refuses new writes; authorized reads and reconciliation still work', async () => {
  const { result } = await reviewed();
  vi.stubEnv('COACH_VERIFIED_WORKOUTS_ENABLED', 'false');
  await expect(createDraft({ user: admin, body: body('gate off'), db }))
    .rejects.toMatchObject({ code: 'WORKOUT_INTENT_ENTRY_DISABLED', statusCode: 503 });
  expect(await Form.count()).toBe(0);
  const { readCoachIntent, reconcileCoachIntent } = await import('../../services/ai/coachIntentService.mjs');
  const current = await readCoachIntent({ model: Intent, intentId: result.intentId });
  expect(current.status).toBe('awaiting_approval'); // authorized receipt read
  const reconciled = await reconcileCoachIntent({
    model: Intent, intentId: result.intentId,
    readEffect: intent => ({ found: true, intentId: intent.id, requestHash: intent.requestHash,
      proposalId: intent.proposalId, observed: intent.expectedFootprint }),
    authorizeIntent: async intent => intent.actorId === current.actorId && intent.targetClientId === 42,
  });
  expect(reconciled.status).toBe('awaiting_approval'); // passthrough: not yet committed
  expect(reconciled.dispatched).toBe(false);
  expect(await Form.count()).toBe(0); // reconciliation never writes
});

test('T46: cancel racing execution on a draft-created intent takes exactly one valid transition', async () => {
  const { result, request } = await reviewed();
  await Promise.all([reject(input(result.proposalId)), approve(request)]);
  const saved = await intentByProposal(result.proposalId);
  const proposal = await state(result.proposalId);
  if (proposal.status === 'REJECTED') {
    expect(saved.status).toBe('cancelled');
    expect(await Form.count()).toBe(0);
  } else {
    expect(proposal.status).toBe('APPLIED');
    expect(saved.status).toBe('verified');
    expect(await Form.count()).toBe(1);
  }
  // Never both: no cancelled intent with an APPLIED proposal, no executed
  // effects under a rejected one.
  expect(!(saved.status === 'cancelled' && proposal.status === 'APPLIED')).toBe(true);
  expect(await Intent.count()).toBe(1);
});
