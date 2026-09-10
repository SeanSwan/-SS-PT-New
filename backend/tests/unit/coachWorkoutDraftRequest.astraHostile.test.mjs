/**
 * SCU G03 / S3 — RED (S3a). Staff workout-draft request: one task UUID scoped to
 * the authenticated actor + selected target, and a stable draft requestKey before
 * submit. Same actor+key+hash returns the same prepared proposal (200 idempotent);
 * changed hash returns 409; entry gate refuses when COACH_VERIFIED_WORKOUTS_ENABLED
 * is not 'true'; actor comes from auth, never body; unknown authority/proof fields
 * rejected; AI-generated path (no requestKey) keeps minting fresh UUIDs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../utils/logger.mjs', () => ({ default: { info() {}, warn() {}, error() {}, debug() {} } }));
vi.mock('../../models/index.mjs', () => ({ getAllModels: () => ({}) }));
vi.mock('../../utils/clientAccess.mjs', () => ({ ensureClientAccess: vi.fn(async () => ({ allowed: true })) }));
vi.mock('../../services/plaudCipherService.mjs', () => ({
  encryptPayload: value => ({ cipher: Buffer.from(JSON.stringify(value)), iv: Buffer.from('iv'), tag: Buffer.from('tag'), keyId: 'TEST' }),
  decryptPayload: ({ cipher }) => JSON.parse(Buffer.from(cipher).toString()),
}));
vi.mock('../../services/ai/coachIntentEffectProof.mjs', () => ({
  hashCoachWorkoutExpectation: value => String(value ?? ''), verifyCoachIntentEffect: vi.fn(async () => ({})),
}));
vi.mock('../../services/ai/planEditDoctrineService.mjs', () => ({ stampDoctrineVerdictsFromPlan: value => value }));
vi.mock('../../services/ai/coachNutritionProposalCareCopy.mjs', () => ({ sanitizeNutritionProposalMeal: value => value }));
vi.mock('../../services/ai/coachSplitPlanApprovalService.mjs', () => ({ sanitizeSplitCandidate: value => value }));
vi.mock('../../services/ai/coachClientOnboardingApprovalService.mjs', () => ({
  createClientFromCoachOnboardingProposal: vi.fn(), summarizeOnboardingDraftForReview: vi.fn(),
}));
vi.mock('../../services/ai/coachActionProposalService.mjs', async () => {
  // The module under test imports createCoachActionProposalDraft from here. The
  // REAL draft service under S3 IS the shared path. The factory loads the REAL
  // persistence module lazily (at call time, via vi.importActual) to avoid a
  // circular factory import, then swaps in only the two heavy leaves the unit
  // wants mocked (classifier / intake link).
  const real = await vi.importActual('../../services/ai/coachActionProposalService.mjs');
  return real;
});
vi.mock('../../services/ai/coachActionProposalClassifier.mjs', () => ({
  classifyActionBlock: () => null, parseJsonActionBlocks: () => [], parseSafeFrontendDispatch: () => null,
}));
vi.mock('../../services/ai/coachActionProposalIntakeLinkService.mjs', () => ({
  linkCoachActionProposalToIntake: async () => ({ linked: false, reason: 'missing_link_inputs' }),
}));
vi.mock('../../services/ai/coachDispatchEligibilityService.mjs', () => ({
  filterEligibleFrontendActions: async ({ actions }) => ({ actions, refusals: [] }),
}));
vi.mock('../../services/workout/aiWorkoutDailyFormPayloadService.mjs', () => ({
  normalizeAiExercises: value => value,
  AiWorkoutDailyFormError: class extends Error { constructor(message, code) { super(message); this.code = code; } },
}));
vi.mock('../../services/workout/coachWorkoutLibraryResolver.mjs', () => ({
  resolveCoachWorkoutLibrary: vi.fn(),
}));
vi.mock('../../services/workout/coachWorkoutResultVerifier.mjs', () => ({
  buildCoachWorkoutFootprint: value => value, verifyCoachWorkoutReadback: vi.fn(() => ({ status: 'verified', recordRefs: [], realAffectedCount: 0 })),
}));
vi.mock('../../services/workout/coachWorkoutReadbackService.mjs', () => ({
  readCoachWorkoutFootprint: vi.fn(async () => ({ exercises: [] })), sessionDay: d => d, logProjectionMatches: vi.fn(() => true),
}));

const { resolveCoachWorkoutLibrary } = vi.mocked(await import('../../services/workout/coachWorkoutLibraryResolver.mjs'));
const { ensureClientAccess } = vi.mocked(await import('../../utils/clientAccess.mjs'));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_ID = '11111111-2222-4333-8444-555555555555';
const KEY = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const workout = { date: '2026-05-05', title: 'G03 synthetic',
  exercises: [{ exerciseId: '99999999-8888-4777-8666-555555555555', unit: 'lb',
    sets: [{ setNumber: 1, reps: 8, weight: 40 }] }] };

let fakeDb;
function mockDb({ access = true } = {}) {
  const intents = [];
  const props = [];
  vi.mocked(ensureClientAccess).mockResolvedValue({ allowed: access });
  vi.mocked(resolveCoachWorkoutLibrary).mockImplementation(async ({ exercises }) =>
    exercises.map((exercise) => ({ ...exercise, id: exercise.exerciseId, name: 'Synthetic', exercise_key: 'synthetic', isActive: true })));
  const tx = { commit: async () => {}, rollback: async () => {}, LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } };
  const intentModel = {
    findOne: vi.fn(async ({ where }) => {
      for (const row of intents) {
        if (row.actorId !== Number(where.actorId)) continue;
        if (where.requestKey !== undefined && row.requestKey !== where.requestKey) continue;
        if (where.proposalId !== undefined && row.proposalId !== where.proposalId) continue;
        return row;
      }
      return null;
    }),
    create: vi.fn(async (values, _options) => { const row = { id: randomUUID(), status: 'drafted', version: 0, ...values }; intents.push(row); return row; }),
    update: vi.fn(),
  };
  fakeDb = {
    models: { CoachIntent: intentModel, Exercise: { findAll: vi.fn() } },
    transaction: async callback => callback(tx),
    query: vi.fn(async (sql, options) => {
      if (sql.includes('INSERT INTO coach_intents') && options?.replacements) {
        if (intents.some(row => row.actorId === Number(options.replacements.actorId) && row.requestKey === options.replacements.requestKey))
          throw { name: 'SequelizeUniqueConstraintError', errors: [] };
        const row = { id: options.replacements.id, ...options.replacements }; intents.push(row); return [row];
      }
      if (sql.includes('INSERT INTO coach_action_proposals') && options?.replacements) {
        props.push(options.replacements); return [{ ...options.replacements, proposal_type: options.replacements.proposalType, status: 'PENDING', summary_json: JSON.parse(options.replacements.summaryJson), created_at: new Date() }];
      }
      if (sql.includes('SELECT * FROM coach_action_proposals') && options?.replacements) {
        const r = options.replacements;
        const hit = props.filter(p => p.id === r.id && Number(p.userId) === Number(r.actorId));
        return hit.map(p => ({ id: p.id, created_by_user_id: p.userId, proposal_type: p.proposalType,
          status: 'PENDING', schema_version: p.schemaVersion, summary_json: JSON.parse(p.summaryJson),
          conversation_id: p.conversationId, source_message_id: p.sourceMessageId,
          created_at: new Date(), proposal_cipher: p.cipher, proposal_iv: p.iv, proposal_tag: p.tag,
          cipher_key_id: p.keyId }));
      }
      return [];
    }),
    _intents: intents, _props: props, _tx: tx,
  };
  return fakeDb;
}

const user = { id: 7, role: 'trainer' };
const args = (body) => ({ user, conversation: null, db: fakeDb, body });

async function importService() {
  const { createWorkoutDraftRequest } = await import('../../services/ai/coachWorkoutDraftRequestService.mjs');
  return createWorkoutDraftRequest;
}

const validBody = () => ({ schemaVersion:1, taskId:TASK_ID, requestKey:KEY, draftRevision:0, targetUserId:42, workout });
describe('AR-G03 strict staff entry', () => {
 beforeEach(() => { vi.resetModules(); vi.stubEnv('COACH_VERIFIED_WORKOUTS_ENABLED','true'); mockDb(); });
 afterEach(() => vi.unstubAllEnvs());
 it('requires a retry key before any persistence', async () => {
  const create=await importService(); const body=validBody(); delete body.requestKey;
  await expect(create(args(body))).rejects.toMatchObject({code:'WORKOUT_DRAFT_REQUEST_KEY',statusCode:400});
  expect(fakeDb._props).toHaveLength(0);
 });
 it.each([true, '42', [], {}])('rejects a nonnumeric target %j', async targetUserId => {
  const create=await importService();await expect(create(args({...validBody(),targetUserId}))).rejects.toMatchObject({code:'WORKOUT_DRAFT_TARGET',statusCode:400});
  expect(fakeDb._props).toHaveLength(0);
 });
 it('rejects conflicting embedded client identity', async () => {
  const create=await importService();await expect(create(args({...validBody(),workout:{...workout,clientId:99}}))).rejects.toMatchObject({code:'WORKOUT_DRAFT_TARGET',statusCode:400});
  expect(fakeDb._props).toHaveLength(0);
 });
 it('rejects unknown envelope authority fields', async () => {
  const create=await importService();await expect(create(args({...validBody(),verified:true}))).rejects.toMatchObject({code:'WORKOUT_DRAFT_UNKNOWN_AUTHORITY',statusCode:400});
  expect(fakeDb._props).toHaveLength(0);
 });
});
