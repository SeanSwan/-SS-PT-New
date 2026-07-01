import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  query: vi.fn(),
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
    findOne: vi.fn(),
  },
}));

vi.mock('../../services/aiChatService.mjs', () => ({
  getSystemPrompt: vi.fn(() => ''),
  buildPromptMessages: vi.fn(() => []),
  sendChatMessage: vi.fn(),
  enrichWithUserData: vi.fn(),
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
}));

vi.mock('../../services/ai/aiChatPromptPrivacy.mjs', () => ({
  CURRENT_MESSAGE_WITHHELD: '[message withheld]',
  RESPONSE_MESSAGE_WITHHELD: '[response withheld]',
  sanitizePromptHistory: vi.fn((messages) => messages),
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
  createCoachActionProposalsFromAiResponse: vi.fn(async () => []),
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
    status: payload.status,
    targetUserId: payload.targetUserId ?? null,
    messageCount: payload.messageCount,
  };
}

describe('AI chat conversation target guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_CHAT_CLIENT_ACCESS_SOFT;
    mocks.createConversation.mockImplementation(async (payload) => mockCreatedConversation(payload));
    mocks.query.mockResolvedValue([]);
  });

  it('rejects malformed admin targetUserId before model or access queries', async () => {
    const malformedTargets = [' 42', '042', '1e2', '42abc', 0, -1, true, [], {}];

    for (const targetUserId of malformedTargets) {
      vi.clearAllMocks();
      mocks.createConversation.mockImplementation(async (payload) => mockCreatedConversation(payload));
      mocks.query.mockResolvedValue([]);

      const response = await request(buildApp())
        .post('/api/ai-chat/conversations')
        .set('x-test-user-role', 'admin')
        .send({ context: 'coach_assistant', targetUserId });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TARGET_USER_ID');
      expect(mocks.createConversation).not.toHaveBeenCalled();
      expect(mocks.query).not.toHaveBeenCalled();
    }
  });

  it('normalizes an admin targetUserId before creating the conversation', async () => {
    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-role', 'admin')
      .send({ context: 'coach_assistant', targetUserId: '42' });

    expect(response.status).toBe(201);
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      context: 'coach_assistant',
      targetUserId: 42,
    }));
    expect(response.body.conversation.targetUserId).toBe(42);
  });

  it('allows an assigned trainer to create a target-bound Coach conversation', async () => {
    mocks.query.mockImplementation(async (sql) => (
      sql.includes('client_trainer_assignments') ? [{ ok: 1 }] : []
    ));

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .send({ context: 'coach_assistant', targetUserId: '42' });

    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      userId: 7,
      role: 'trainer',
      targetUserId: 42,
    }));
  });

  it('rejects an unassigned trainer target before creating the conversation row', async () => {
    mocks.query.mockResolvedValue([]);

    const response = await request(buildApp())
      .post('/api/ai-chat/conversations')
      .set('x-test-user-id', '7')
      .set('x-test-user-role', 'trainer')
      .send({ context: 'coach_assistant', targetUserId: '42' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CLIENT_ACCESS_DENIED');
    expect(mocks.createConversation).not.toHaveBeenCalled();
    expect(mocks.query).toHaveBeenCalledTimes(2);
  });
});