/**
 * aiChatAccessHardening.r1.test.mjs
 * =================================
 * Whole-Coach hostile round 1 (2026-08-21). Three fixes in aiChatRoutes, each
 * found independently by 3+ seats and verified at source before fixing:
 *
 *   H2  AI_CHAT_CLIENT_ACCESS_SOFT=true converted a trainer->client IDOR denial
 *       into a logged allow, at conversation creation AND at send. It is now
 *       ignored in production (denial stands, loud error log) and honoured only
 *       outside production.
 *   H3  The send-time trainer->client re-check required conversation.role ===
 *       'trainer', so a trainer who opened the thread AS a client audience was
 *       never re-verified. The requester's role now drives the check.
 *   H4  The consent check was fail-OPEN on a query ERROR (.catch(() => [[]])).
 *       A DB outage now fails CLOSED with 503. The no-record-allows policy is
 *       deliberately unchanged (product decision, flagged on SWA-142).
 *
 * Harness is the one from aiChatConversationTargetGuard.test.mjs, duplicated
 * rather than imported because vi.mock hoisting is per-file.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  findConversation: vi.fn(),
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  buildPromptMessages: vi.fn(),
  enrichWithUserData: vi.fn(),
  checkClientAccess: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = {
      id: Number(req.get('x-test-user-id') || 7),
      role: req.get('x-test-user-role') || 'admin',
    };
    next();
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../middleware/requireSubscription.mjs', () => ({
  requireSubscription: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  strictPiiMiddleware: (_req, _res, next) => next(),
}));

vi.mock('../../database.mjs', () => ({
  default: {
    QueryTypes: { SELECT: 'SELECT' },
    query: mocks.query,
  },
}));

vi.mock('../../models/AiConversation.mjs', () => ({
  default: {
    create: mocks.createConversation,
    findAll: vi.fn(),
    findOne: mocks.findConversation,
  },
}));

vi.mock('../../services/aiChatService.mjs', () => ({
  getSystemPrompt: vi.fn(() => ''),
  buildPromptMessages: mocks.buildPromptMessages,
  sendChatMessage: mocks.sendChatMessage,
  enrichWithUserData: mocks.enrichWithUserData,
  getAIChatDiagnostics: vi.fn(),
  sanitizeAiChatMetadataForClient: vi.fn((value) => value),
  sanitizeAiFailoverTrace: vi.fn((value) => value),
}));

vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: vi.fn(),
  isAudioFile: vi.fn(() => true),
  checkAndRecordTranscription: vi.fn(),
}));

vi.mock('../../services/aiPrivacyService.mjs', () => ({
  stripIdentityFromMessage: vi.fn(async (message) => ({ sanitizedMessage: message, identitiesStripped: 0 })),
  stripIdentityFromResponse: vi.fn(async (message) => ({ sanitizedResponse: message, identitiesStripped: 0 })),
  scrubGenericPII: vi.fn(async (message) => ({ sanitizedText: message, piiRemoved: 0 })),
}));


vi.mock('../../services/ai/coachIntakeContextService.mjs', () => ({
  buildCoachIntakeContextPromptBlock: vi.fn(() => ''),
  buildCoachIntakeContextFromResult: vi.fn(() => null),
}));

vi.mock('../../services/nutrition/nutritionCareCopy.mjs', () => ({
  sanitizeNutritionChatCopy: vi.fn((value) => value),
}));

vi.mock('../../services/coachIntakeItemService.mjs', () => ({
  listUnifiedCoachIntakeItems: vi.fn(async () => []),
}));

vi.mock('../../services/coachIntakeHealthService.mjs', () => ({
  getCoachIntakeHealth: vi.fn(async () => null),
}));

vi.mock('../../services/coachIntakeRetentionPolicyService.mjs', () => ({
  getCoachIntakeRetentionReport: vi.fn(async () => null),
}));

vi.mock('../../services/coachIntakeRetentionPurgeService.mjs', () => ({
  purgeCoachIntakeRawArtifacts: vi.fn(async () => null),
}));

vi.mock('../../services/ai/coachActionProposalService.mjs', () => ({
  createCoachActionProposalsFromAiResponse: vi.fn(async () => ({ proposals: [], frontendActions: [] })),
}));

vi.mock('../../services/contentStudioCoverageService.mjs', () => ({
  buildSwanCoachCoveragePromptBlockFromModels: vi.fn(async () => ''),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: mocks.logger,
}));

const { default: aiChatRoutes } = await import('../../routes/aiChatRoutes.mjs');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-chat', aiChatRoutes);
  return app;
}

function mockCreatedConversation(payload) {
  return {
    id: 9001,
    title: payload.title,
    context: payload.context,
    role: payload.role,
    status: payload.status,
    targetUserId: payload.targetUserId ?? null,
    messageCount: payload.messageCount,
  };
}


vi.mock('../../services/ai/contextEngine/clientAccess.mjs', async () => {
  const actual = await vi.importActual('../../services/ai/contextEngine/clientAccess.mjs');
  return { ...actual, checkClientAccess: mocks.checkClientAccess };
});

function thread({ role }) {
  return {
    id: 9001, userId: 7, role, context: 'coach_assistant', targetUserId: 42,
    messages: [], messageCount: 0, status: 'active', metadata: {},
    update: vi.fn(async () => undefined),
  };
}

const asTrainer = (req) => req.set('x-test-user-id', '7').set('x-test-user-role', 'trainer');

describe('aiChatRoutes access hardening (hostile round 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_CHAT_CLIENT_ACCESS_SOFT;
    delete process.env.NODE_ENV;
    mocks.checkClientAccess.mockReset();
    mocks.findConversation.mockReset();
    mocks.query.mockReset();
    mocks.query.mockResolvedValue([]);
    mocks.sendChatMessage.mockReset();
    mocks.sendChatMessage.mockResolvedValue({ content: 'ok', provider: 't', model: 't', tokenUsage: null, failoverTrace: [] });
    mocks.buildPromptMessages.mockReset();
    mocks.buildPromptMessages.mockImplementation((_s, h, c) => [...h, { role: 'user', content: c }]);
    mocks.enrichWithUserData.mockReset();
    mocks.enrichWithUserData.mockResolvedValue('');
    mocks.createConversation.mockImplementation(async (payload) => mockCreatedConversation(payload));
  });

  it('H2-1: SOFT flag in PRODUCTION is ignored - unassigned trainer still denied at creation', async () => {
    process.env.AI_CHAT_CLIENT_ACCESS_SOFT = 'true';
    process.env.NODE_ENV = 'production';
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, reason: 'not_assigned' });

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations'))
      .send({ context: 'coach_assistant', targetUserId: '42' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CLIENT_ACCESS_DENIED');
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.logger.error).toHaveBeenCalledWith(expect.stringMatching(/IGNORED/));
  });

  it('H2-2: SOFT flag outside production still honours the legacy escape hatch (unchanged)', async () => {
    process.env.AI_CHAT_CLIENT_ACCESS_SOFT = 'true';
    process.env.NODE_ENV = 'development';
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, reason: 'not_assigned' });

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations'))
      .send({ context: 'coach_assistant', targetUserId: '42' });

    expect(res.status).toBe(201);
  });

  it('H3: send-time re-check fires for a trainer even when the thread speaks AS a client audience', async () => {
    mocks.findConversation.mockResolvedValue(thread({ role: 'client' }));
    mocks.checkClientAccess.mockResolvedValue({ allowed: false, reason: 'assignment_revoked' });

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations/9001/messages'))
      .send({ message: 'what did they log this week' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('CLIENT_ACCESS_DENIED');
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it('H4-1: a consent-query ERROR fails CLOSED with 503 and never reaches the model', async () => {
    mocks.findConversation.mockResolvedValue(thread({ role: 'trainer' }));
    mocks.checkClientAccess.mockResolvedValue({ allowed: true });
    mocks.query.mockRejectedValueOnce(new Error('relation ai_privacy_profiles does not exist'));

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations/9001/messages'))
      .send({ message: 'hello' });

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('AI_CONSENT_CHECK_UNAVAILABLE');
    expect(mocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it('H4-2: withdrawn consent is still refused with 403', async () => {
    mocks.findConversation.mockResolvedValue(thread({ role: 'trainer' }));
    mocks.checkClientAccess.mockResolvedValue({ allowed: true });
    mocks.query.mockResolvedValueOnce([{ aiEnabled: false, withdrawnAt: null }]);

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations/9001/messages'))
      .send({ message: 'hello' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('AI_CONSENT_WITHDRAWN');
  });

  it('H4-3: no consent record still allows (deliberate, flagged product policy - pins the current choice)', async () => {
    mocks.findConversation.mockResolvedValue(thread({ role: 'trainer' }));
    mocks.checkClientAccess.mockResolvedValue({ allowed: true });
    mocks.query.mockResolvedValue([]);

    const res = await asTrainer(request(buildApp()).post('/api/ai-chat/conversations/9001/messages'))
      .send({ message: 'hello' });

    expect(res.status).not.toBe(503);
    expect(res.status).not.toBe(403);
  });
});
