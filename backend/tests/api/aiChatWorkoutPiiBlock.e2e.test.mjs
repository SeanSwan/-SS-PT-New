/**
 * PROBE (rule 55) — END-TO-END: the live chat lane 400s a legitimate workout log.
 *
 * Unlike the pure-detector probe (piiWorkoutFalsePositive.test.mjs), this mounts the REAL
 * router with the REAL strictPiiMiddleware and asserts what the TRAINER actually receives.
 * Only auth / rate-limit / downstream services are stubbed; the PII guard is untouched.
 *
 * Route under test: aiChatRoutes.mjs:540
 *   router.post('/conversations/:id/messages',
 *     requireSubscription('pro', { feature: 'chat' }), aiRateLimiter, strictPiiMiddleware, ...)
 *
 * Expected (Product Core Loop: "log the workout"): a barbell progression sends fine.
 * Actual: 400 { error: 'pii_blocked' } — the trainer is told their set log contains a
 * credit card. `credit_card` is /\b(?:\d[ -]*?){13,16}\b/g (severity 'critical'), and a
 * weight progression is 13-16 space-separated digits.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  findConversation: vi.fn(),
  createConversation: vi.fn(),
}));

vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 7, role: 'trainer' };
    next();
  },
}));
vi.mock('../../middleware/aiRateLimiter.mjs', () => ({ aiRateLimiter: (_q, _s, n) => n() }));
vi.mock('../../middleware/requireSubscription.mjs', () => ({ requireSubscription: () => (_q, _s, n) => n() }));
// NOTE: piiSanitizationMiddleware is deliberately NOT mocked — it is the subject.

vi.mock('../../database.mjs', () => ({
  default: { QueryTypes: { SELECT: 'SELECT' }, query: mocks.query },
}));
vi.mock('../../models/AiConversation.mjs', () => ({
  default: { create: mocks.createConversation, findAll: vi.fn(), findOne: mocks.findConversation },
}));
vi.mock('../../services/aiChatService.mjs', () => ({
  getSystemPrompt: vi.fn(() => ''),
  buildPromptMessages: vi.fn(() => []),
  sendChatMessage: mocks.sendChatMessage,
  enrichWithUserData: vi.fn(),
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
}));
vi.mock('../../services/ai/aiChatPromptPrivacy.mjs', () => ({
  CURRENT_MESSAGE_WITHHELD: '[message withheld]',
  RESPONSE_MESSAGE_WITHHELD: '[response withheld]',
  sanitizePromptHistory: vi.fn((m) => m),
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

describe('E2E: trainer logs a real barbell progression through the chat lane', () => {
  beforeEach(() => {
    mocks.query.mockResolvedValue([]);
    mocks.findConversation.mockResolvedValue({ id: 1, userId: 7, role: 'trainer', targetUserId: 84 });
    mocks.sendChatMessage.mockResolvedValue({
      content: 'Logged.', provider: 'test', model: 'test',
    });
  });

  it('does not reject a set log as sensitive personal information', async () => {
    const res = await request(buildApp())
      .post('/api/ai-chat/conversations/1/messages')
      .send({ message: 'Squat 135 135 185 185 225 225 245 for 3x5, then RDL 95 115 135.' });

    // The trainer must not be told their workout contains a credit card.
    expect(res.body?.error).not.toBe('pii_blocked');
    expect(res.status).not.toBe(400);
  });

  it('CONTROL — a real credit card IS still blocked', async () => {
    const res = await request(buildApp())
      .post('/api/ai-chat/conversations/1/messages')
      .send({ message: 'my card is 4111 1111 1111 1111' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pii_blocked');
  });
});
