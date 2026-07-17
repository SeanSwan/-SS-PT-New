/**
 * PROBE (rule 55) — B5: /tts + /transcribe middleware parity with the chat lane.
 *
 * `router.use(protect)` at aiChatRoutes.mjs:305 authenticates EVERY route below it, so
 * /tts and /transcribe are NOT open to the internet (a probe against prod returns 401 —
 * an earlier claim that they were an unauthenticated Gemini proxy was FALSE and is retracted).
 *
 * What they DO lack is the rest of the chat lane's chain. `/conversations/:id/messages`
 * (aiChatRoutes.mjs:540) carries:
 *     requireSubscription('pro', { feature: 'chat' })  +  strictPiiMiddleware
 * `/tts` (:1056) and `/transcribe` (:1000) carry neither. Consequences:
 *   1. Paywall: a CLIENT-role free-tier user gets premium Gemini TTS the chat lane charges
 *      pro for. (Scope note: requireSubscription no-ops for admin/trainer via its role
 *      bypass, so this only bites client-role users.)
 *   2. Rule 8: the text posted to /tts is the RENDERED reply body — i.e. post client-side
 *      name-mapping, so it can contain a real client name — and it reaches Gemini with no
 *      strictPiiMiddleware scrub.
 *
 * This probe asserts the CHAIN, not the response, so it is deterministic and never calls
 * Gemini: the spies below record which paths each middleware actually ran for. The chat
 * lane acts as the built-in control — if the control fails, the probe itself is broken.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mocks = vi.hoisted(() => ({
  paywallPaths: [],
  piiPaths: [],
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  findConversation: vi.fn(),
  createConversation: vi.fn(),
}));

// Free-tier CLIENT — the only role the paywall actually gates.
vi.mock('../../middleware/authMiddleware.mjs', () => ({
  protect: (req, _res, next) => {
    req.user = { id: 84, role: 'user', subscriptionTier: 'free' };
    next();
  },
}));

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (_req, _res, next) => next(),
}));

// Spies: record every path each guard actually runs for.
vi.mock('../../middleware/requireSubscription.mjs', () => ({
  requireSubscription: () => (req, _res, next) => {
    mocks.paywallPaths.push(req.path);
    next();
  },
}));

vi.mock('../../middleware/piiSanitizationMiddleware.mjs', () => ({
  strictPiiMiddleware: (req, _res, next) => {
    mocks.piiPaths.push(req.path);
    next();
  },
  piiSanitization: () => (_req, _res, next) => next(),
  permissivePiiMiddleware: (_req, _res, next) => next(),
  sanitizeText: vi.fn((v) => v),
}));

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
  transcribeAudio: vi.fn(async () => ({ text: 'stub' })),
  isAudioFile: vi.fn(() => true),
  checkAndRecordTranscription: vi.fn(async () => ({ allowed: true })),
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

vi.mock('../../services/nutrition/nutritionCareCopy.mjs', () => ({
  sanitizeNutritionChatCopy: vi.fn((v) => v),
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

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai-chat', aiChatRoutes);
  return app;
}

// SKIPPED ON PURPOSE — this is a live, reproduced gap awaiting a PRODUCT decision, not a bug
// with an obvious fix. Un-skip when Sean rules. Evidence (re-verified 2026-07-17): all three
// assertions below FAIL on main while the CONTROL passes, i.e. the chat lane runs both guards
// and /tts + /transcribe run neither.
//
// Why this is NOT auto-fixable:
//  1. PAYWALL — `requireSubscription('pro')` no-ops for admin/trainer (role bypass, see
//     requireSubscription.mjs), so adding it only gates CLIENT-role free-tier users. That is a
//     revenue/product call (do free clients get voice?), not a security fix.
//  2. PII — `strictPiiMiddleware` scans body.text. Post-Luhn-fix it no longer 400s workout logs,
//     but `contextual_name` (severity medium) still REDACTS, so /tts would occasionally speak
//     "[NAME-REDACTED] about her session tomorrow" out loud. Measured, not guessed.
//
// NOTE the related bug this probe surfaced and which IS fixed in this commit: the chat lane's
// own strictPiiMiddleware used to 400 legitimate barbell progressions as "credit card".
// See piiWorkoutFalsePositive.test.mjs + aiChatWorkoutPiiBlock.e2e.test.mjs.
describe.skip('B5 [AWAITING SEAN]: /tts + /transcribe carry the same guards as the chat lane', () => {
  beforeEach(() => {
    mocks.paywallPaths.length = 0;
    mocks.piiPaths.length = 0;
    // No key -> handler short-circuits 503 BEFORE any Gemini call. The middleware
    // chain has already run by then, which is all this probe measures.
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    mocks.query.mockResolvedValue([]);
    mocks.findConversation.mockResolvedValue({ id: 1, userId: 84, role: 'user', targetUserId: null });
  });

  // CONTROL: proves the spies work. If this fails, the probe is broken, not the product.
  it('CONTROL — the chat lane runs both guards', async () => {
    await request(buildApp())
      .post('/api/ai-chat/conversations/1/messages')
      .send({ message: 'hello' });

    expect(mocks.paywallPaths).toContain('/conversations/1/messages');
    expect(mocks.piiPaths).toContain('/conversations/1/messages');
  });

  it('/tts runs the pro paywall for a free-tier client', async () => {
    await request(buildApp()).post('/api/ai-chat/tts').send({ text: 'next set: 3x12' });
    expect(mocks.paywallPaths).toContain('/tts');
  });

  it('/tts scrubs PII before the text reaches Gemini', async () => {
    await request(buildApp()).post('/api/ai-chat/tts').send({ text: 'next set: 3x12' });
    expect(mocks.piiPaths).toContain('/tts');
  });

  it('/transcribe runs the pro paywall for a free-tier client', async () => {
    await request(buildApp())
      .post('/api/ai-chat/transcribe')
      .attach('audio', Buffer.from('fake-audio'), 'clip.webm');
    expect(mocks.paywallPaths).toContain('/transcribe');
  });
});
