/**
 * aiChatMessageActorScopedGuard.test.mjs
 * ======================================
 * Regression cover for the Swan Coach message-send authorization bypass
 * (SWA-192, finding P0-2).
 *
 * THE DEFECT. Two adjacent lines in the message-send handler disagreed about
 * which variable identifies the actor:
 *
 *   :688  enrichUserId = requesterIsStaff ? (conversation.targetUserId || null) : ...
 *   :698  if (conversation.targetUserId && conversation.role === 'trainer' && req.user.role === 'trainer')
 *
 * Enrichment keys on the ACTOR (`requesterIsStaff`). Authorization keys on the
 * CONVERSATION's audience role. `resolveConversationAudienceRole` (:331)
 * explicitly permits a trainer to create a `role: 'client'` conversation, so for
 * that thread shape the authorization branch is never entered at all — while
 * `enrichWithUserData(enrichUserId, ...)` at :821 still loads that client's live
 * data into the system prompt on every message.
 *
 * WHAT THIS IS NOT. It is NOT "Coach access outlives unassignment". That
 * behaviour is deliberate: `clientAccess.mjs` grants access via an active
 * assignment OR a BOUNDED session-history fallback, which is Sean's explicit
 * ruling of 2026-07-30 (documented in that file's header). Fixing this bug
 * RESTORES that control on a path that skipped it; it does not reverse the
 * ruling. Nothing here narrows the session-history fallback.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  findConversation: vi.fn(),
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  buildPromptMessages: vi.fn(),
  enrichWithUserData: vi.fn(),
  checkClientAccess: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 7),
      role: req.get('x-test-user-role') || 'trainer',
    };
    next();
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({ aiRateLimiter: (_q, _s, next) => next() }));
vi.mock('../../middleware/requireSubscription.mjs', () => ({ requireSubscription: () => (_q, _s, next) => next() }));
vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({ strictPiiMiddleware: (_q, _s, next) => next() }));

vi.mock('../../database.mjs', () => ({
  default: { QueryTypes: { SELECT: 'SELECT' }, query: mocks.query },
}));

vi.mock('../../models/AiConversation.mjs', () => ({
  default: { create: vi.fn(), findAll: vi.fn(), findOne: mocks.findConversation },
}));

// Mock EVERY named export the route imports. Omitting CLIENT_ACCESS_DENIED_MESSAGE
// made the deny branch throw on an undefined binding, which the outer catch turned
// into a 500 — a harness artifact that looked exactly like a product bug.
vi.mock('../../services/ai/contextEngine/clientAccess.mjs', () => ({
  checkClientAccess: mocks.checkClientAccess,
  CLIENT_ACCESS_DENIED_MESSAGE: 'You are not assigned to this client.',
  parseContextClientId: (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
  },
  sessionHistoryCutoff: () => new Date(0),
  REAL_SESSION_STATUSES: ['completed', 'confirmed', 'scheduled', 'booked', 'assigned'],
}));

vi.mock('../../services/aiChatService.mjs', () => ({
  getSystemPrompt: vi.fn(() => ''),
  buildPromptMessages: mocks.buildPromptMessages,
  sendChatMessage: mocks.sendChatMessage,
  enrichWithUserData: mocks.enrichWithUserData,
  getAIChatDiagnostics: vi.fn(),
  sanitizeAiChatMetadataForClient: vi.fn((v) => v),
  sanitizeAiFailoverTrace: vi.fn((v) => v),
}));

vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: vi.fn(), isAudioFile: vi.fn(() => true), checkAndRecordTranscription: vi.fn(),
}));

vi.mock('../../services/aiPrivacyService.mjs', () => ({
  stripIdentityFromMessage: vi.fn(async (m) => ({ sanitizedMessage: m, identitiesStripped: 0 })),
  stripIdentityFromResponse: vi.fn(async (m) => ({ sanitizedResponse: m, identitiesStripped: 0 })),
  scrubGenericPII: vi.fn(async (m) => ({ sanitizedText: m, piiRemoved: 0 })),
}));

vi.mock('../../services/ai/coachIntakeContextService.mjs', () => ({
  buildCoachIntakeContextPromptBlock: vi.fn(() => ''),
  buildCoachIntakeContextFromResult: vi.fn(() => null),
}));
vi.mock('../../services/nutrition/nutritionCareCopy.mjs', () => ({ sanitizeNutritionChatCopy: vi.fn((v) => v) }));
vi.mock('../../services/coachIntakeItemService.mjs', () => ({ listUnifiedCoachIntakeItems: vi.fn(async () => []) }));
vi.mock('../../services/coachIntakeHealthService.mjs', () => ({ getCoachIntakeHealth: vi.fn(async () => null) }));
vi.mock('../../services/coachIntakeRetentionPolicyService.mjs', () => ({ getCoachIntakeRetentionReport: vi.fn(async () => null) }));
vi.mock('../../services/coachIntakeRetentionPurgeService.mjs', () => ({ purgeCoachIntakeRawArtifacts: vi.fn(async () => null) }));
vi.mock('../../services/ai/coachActionProposalService.mjs', () => ({
  createCoachActionProposalsFromAiResponse: vi.fn(async () => ({ proposals: [], frontendActions: [] })),
}));
vi.mock('../../services/contentStudioCoverageService.mjs', () => ({
  buildSwanCoachCoveragePromptBlockFromModels: vi.fn(async () => ''),
}));
vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const { default: aiChatRoutes } = await import('../../routes/aiChatRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-chat', aiChatRoutes);
  return app;
}

const TRAINER_ID = 101;
const TARGET_CLIENT = 5001;

/** A conversation created by a trainer but with a CLIENT audience role. */
function clientAudienceThread() {
  return {
    id: 9001,
    userId: TRAINER_ID,
    role: 'client',            // <- the shape that skipped the gate
    context: 'general',
    status: 'active',
    targetUserId: TARGET_CLIENT,
    messages: [],
    messageCount: 0,
    save: vi.fn(async () => {}),
    update: vi.fn(async () => {}),
  };
}

function trainerAudienceThread() {
  return { ...clientAudienceThread(), role: 'trainer' };
}

function post(app, body = { message: 'hello' }) {
  return request(app)
    .post('/api/ai-chat/conversations/9001/messages')
    .set('x-test-user-id', String(TRAINER_ID))
    .set('x-test-user-role', 'trainer')
    .send(body);
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AI_CHAT_CLIENT_ACCESS_SOFT;
  mocks.query.mockResolvedValue([]);
  mocks.enrichWithUserData.mockResolvedValue('');
  mocks.buildPromptMessages.mockReturnValue([]);
  mocks.sendChatMessage.mockResolvedValue({ content: 'ok', metadata: {} });
});

describe('Swan Coach message send — the gate must key on the ACTOR', () => {
  it('consults clientAccess for a trainer-created CLIENT-audience thread', async () => {
    // This is the bypass. Before the fix checkClientAccess was never called
    // here, because the branch required conversation.role === 'trainer'.
    mocks.findConversation.mockResolvedValue(clientAudienceThread());
    mocks.checkClientAccess.mockResolvedValue({ allowed: true, via: 'assignment', reason: null });

    await post(buildApp());

    expect(mocks.checkClientAccess).toHaveBeenCalled();
    const [actor, subjectId] = mocks.checkClientAccess.mock.calls[0];
    expect(actor.id).toBe(TRAINER_ID);
    expect(Number(subjectId)).toBe(TARGET_CLIENT);
  });

  it('denies with 403 when access is refused on a CLIENT-audience thread', async () => {
    mocks.findConversation.mockResolvedValue(clientAudienceThread());
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, via: null, reason: 'no_assignment' });

    const res = await post(buildApp());

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CLIENT_ACCESS_DENIED');
  });

  it('does not enrich with the client when access is refused', async () => {
    mocks.findConversation.mockResolvedValue(clientAudienceThread());
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, via: null, reason: 'no_assignment' });

    await post(buildApp());

    // The real damage was live client data reaching the prompt.
    expect(mocks.enrichWithUserData).not.toHaveBeenCalled();
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it('still guards the trainer-audience thread it already guarded', async () => {
    mocks.findConversation.mockResolvedValue(trainerAudienceThread());
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, via: null, reason: 'no_assignment' });

    const res = await post(buildApp());

    expect(res.status).toBe(403);
  });

  it('allows the send when clientAccess grants via the bounded session-history fallback', async () => {
    // Sean's 2026-07-30 ruling: session history is a legitimate grant path.
    // The fix must not narrow it.
    mocks.findConversation.mockResolvedValue(clientAudienceThread());
    mocks.checkClientAccess.mockResolvedValue({ allowed: true, via: 'session_history', reason: null });

    const res = await post(buildApp());

    expect(res.status).toBeLessThan(400);
    expect(mocks.sendChatMessage).toHaveBeenCalled();
  });
});
