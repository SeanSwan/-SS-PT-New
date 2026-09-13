/**
 * POST /api/ai-chat/conversations vs the default self-registration role.
 *
 * Defect (hostile review, 2026-09-13): `resolveConversationAudienceRole`
 * (routes/aiChatRoutes.mjs:352-358) returns the RAW actor role when no
 * `audienceRole` is supplied, so a `'user'` actor — the default role minted by
 * public self-registration (models/User.mjs:135) — produced
 * `createPayload.role = 'user'` (:426). AiConversation rejects that value
 * (models/AiConversation.mjs:36 `isIn: [['client','trainer','admin']]`) and the
 * handler's catch-all mapped the failure to a generic 500 (:470). A public
 * authenticated endpoint answered 5xx for the most common account role, while
 * returning three different answers for the same role across the boundary.
 *
 * This suite mounts the REAL router (only `protect` is stubbed, so the handler
 * and the audience resolver under test are not replaced by stand-ins) and makes
 * the stubbed `AiConversation.create` run the REAL model's own validators via
 * `vi.importActual`, so a rejection here is the model's real contract and not a
 * paraphrase of it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  createConversation: vi.fn(),
  findConversation: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../middleware/authMiddleware.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    protect: (req, _res, next) => {
      req.user = {
        id: Number(req.get('x-test-user-id') || 7),
        role: req.get('x-test-user-role') || 'admin',
      };
      next();
    },
  };
});

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

vi.mock('../../middleware/requireSubscription.mjs', () => ({
  requireSubscription: () => (_req, _res, next) => next(),
}));

vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  strictPiiMiddleware: (_req, _res, next) => next(),
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
  buildPromptMessages: vi.fn(() => []),
  sendChatMessage: vi.fn(),
  getCoachProviderAdapter: vi.fn(),
  enrichWithUserData: vi.fn(async () => ''),
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

vi.mock('../../utils/logger.mjs', () => ({ default: mocks.logger }));

const { default: aiChatRoutes } = await import('../../routes/aiChatRoutes.mjs');
const { default: RealAiConversation } = await vi.importActual('../../models/AiConversation.mjs');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-chat', aiChatRoutes);
  return app;
};

const create = (role, body = { context: 'general' }) => request(buildApp())
  .post('/api/ai-chat/conversations')
  .set('x-test-user-id', '21')
  .set('x-test-user-role', role)
  .send(body);

describe('POST /api/ai-chat/conversations for the default self-registration role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_CHAT_CLIENT_ACCESS_SOFT;
    // The stubbed create runs the REAL model validators, so the handler sees
    // exactly what production sees when it hands `createPayload` to Sequelize.
    mocks.createConversation.mockImplementation(async (payload) => {
      const instance = RealAiConversation.build(payload);
      await instance.validate();
      // `targetUserId` must be an explicit null (not absent) or the handler's
      // target-integrity check treats the create as inconsistent and 503s.
      return {
        id: 9001,
        title: payload.title,
        context: payload.context,
        role: payload.role,
        status: payload.status,
        targetUserId: payload.targetUserId ?? null,
        messageCount: payload.messageCount,
        createdAt: new Date('2026-09-13T00:00:00.000Z'),
      };
    });
  });

  it('does not answer 5xx for a raw "user" actor', async () => {
    const response = await create('user');
    expect(response.status).toBeLessThan(500);
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ success: false });
    expect(String(response.body.code || '')).not.toBe('');
  });

  it('rejects the raw "user" actor BEFORE building a create payload', async () => {
    await create('user');
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it('does not depend on whether the caller supplied audienceRole to get a stable answer', async () => {
    const noAudience = await create('user');
    const asUser = await create('user', { context: 'general', audienceRole: 'user' });
    const asClient = await create('user', { context: 'general', audienceRole: 'client' });
    // One role, one answer: previously 500 / 500 / 403 respectively.
    expect([noAudience.status, asUser.status, asClient.status]).toEqual([403, 403, 403]);
    expect(mocks.createConversation).not.toHaveBeenCalled();
  });

  it('still creates conversations for the explicit client role', async () => {
    const response = await create('client');
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({ userId: 21, role: 'client' }));
  });

  it('still creates conversations for a trainer', async () => {
    const response = await create('trainer');
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({ userId: 21, role: 'trainer' }));
  });

  it('still creates conversations for an admin', async () => {
    const response = await create('admin');
    expect(response.status).toBe(201);
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({ userId: 21, role: 'admin' }));
  });
});
