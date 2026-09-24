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


test('AR-PG01: actual assignment status, coassignment, role and deletion govern access',async()=>{
 const {recheckEntityOwnership:check}=await import('../../services/ai/entityOwnershipRecheck.mjs');
 const args={operation:{clientId:42},user:trainerA,sequelize:db,mode:'enforce'};
 expect((await check(args)).refuse).toBe(false);
 await Assignment.update({status:'inactive'},{where:{trainerId:7}});
 expect((await check(args)).refuse).toBe(true);
 await Assignment.update({status:'active'},{where:{trainerId:7}});
 expect((await check(args)).refuse).toBe(false);
 await Assignment.destroy({where:{trainerId:7}});
 expect((await check(args)).refuse).toBe(true);
 await User.update({role:'client'},{where:{id:7}});
 expect((await check(args)).refuse).toBe(true);
 expect((await check({...args,user:{id:42,role:'client'}})).refuse).toBe(false);
});
test('AR-PG02: simultaneous reused key across different targets returns conflict, never aborted-transaction error',async()=>{
 await User.create({id:43,role:'client',availableSessions:3,clientSource:'swan'});
 let arrived=0,release;const barrier=new Promise(resolve=>{release=resolve;});
 const find=Intent.findOne.bind(Intent);
 vi.spyOn(Intent,'findOne').mockImplementation(async options=>{
   const row=await find(options);
   if(options.where.requestKey===KEY && !row && ++arrived<=2){if(arrived===2)release();await barrier;}
   return row;
 });
 const results=await Promise.allSettled([createDraft({user:admin,body:body(),db}),createDraft({user:admin,body:{...body(),targetUserId:43},db})]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const failed=results.find(r=>r.status==='rejected');
 expect(failed.reason).toMatchObject({code:'WORKOUT_DRAFT_HASH_MISMATCH',statusCode:409});
 expect(await Intent.count()).toBe(1);
 expect(Number((await rawQuery('SELECT COUNT(*) AS n FROM coach_action_proposals',{type:QueryTypes.SELECT}))[0].n)).toBe(1);
});

test('AR-PG03: a draft retry and actual approval share intent-first lock order', async () => {
  const { result, request: approvalRequest } = await reviewed();
  let releaseApproval, signalLocked, signalRetry;
  const holdApproval = new Promise(resolve => { releaseApproval = resolve; });
  const approvalLocked = new Promise(resolve => { signalLocked = resolve; });
  const retryEntering = new Promise(resolve => { signalRetry = resolve; });
  const find = Intent.findOne.bind(Intent);
  let held = false;
  vi.spyOn(Intent, 'findOne').mockImplementation(async options => {
    if (options.where.requestKey === KEY) signalRetry();
    const row = await find(options);
    if (!held && options.transaction && options.lock && options.where.proposalId === result.proposalId) {
      held = true; signalLocked(); await holdApproval;
    }
    return row;
  });
  const approving = approve(approvalRequest);
  await approvalLocked;
  const retrying = createDraft({ user: admin, body: body(), db });
  await retryEntering;
  releaseApproval();
  const outcomes = await Promise.allSettled([approving, retrying]);
  expect(outcomes.map(outcome => ({ status: outcome.status, databaseCode: outcome.reason?.original?.code }))).toEqual([{ status: 'fulfilled' }, { status: 'fulfilled' }]);
  expect(outcomes[0].value).toMatchObject({ status: 200 });
  expect(outcomes[1].value).toMatchObject({ status: 200, proposalId: result.proposalId, intentId: result.intentId });
  expect(await Intent.count()).toBe(1);
  expect(await Form.count()).toBe(1);
  expect(await Session.count()).toBe(1);
});
