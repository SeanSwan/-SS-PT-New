/**
 * Speech access contract — /api/ai-chat/tts and /api/ai-chat/transcribe.
 * ======================================================================
 * Sean's ruling (packet 66, decision receipt 2026-09-12) was **keep current
 * speech access**. This file asserts what is MOUNTED today; it does not ask for
 * chat-lane tier parity, does not introduce a 402/tier gate, and does not change
 * generation policy.
 *
 * Current mounted chain (aiChatRoutes.mjs):
 *   POST /conversations/:id/messages  requireSubscription('pro', {feature:'chat'})       → aiRateLimiter → strictPiiMiddleware
 *   POST /transcribe                  requireSubscription('pro', {feature:'generation'}) → aiRateLimiter → audioUpload → strictPiiMiddleware
 *   POST /tts                         requireSubscription('pro', {feature:'generation'}) → aiRateLimiter → strictPiiMiddleware
 *
 * `requireSubscription` has NO minimum-tier comparison: `pro` is part of the
 * mounted contract, while `feature` selects which usage counter moves.
 * admin/trainer bypass its tracking; every other role is anomaly-tracked and
 * allowed — free/trial/paid/past_due all continue. That allow-on-error,
 * never-deny-free policy is the existing behaviour being pinned, not endorsed
 * as payment enforcement.
 *
 * The subscription factory and strict PII middleware are the REAL modules (wrapped
 * only to record registration arguments / invocation order). Only external work is
 * stubbed: the auth account store, the Subscription/User models, the transcription
 * service, and global fetch. No provider, network or database call is made.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';

const mocks = vi.hoisted(() => ({
  stage: [],                 // ordered trails for the current request
  subscriptionArgs: [],      // [minimumTier, feature] captured when the router registers each lane
  accounts: new Map(),       // auth account store (id -> synthetic account)
  query: vi.fn(),
  sendChatMessage: vi.fn(),
  findConversation: vi.fn(),
  createConversation: vi.fn(),
  subscriptionFindOne: vi.fn(),
  subscriptionCreate: vi.fn(),
  userFindByPk: vi.fn(),
  transcribeAudio: vi.fn(),
  checkAndRecordTranscription: vi.fn(),
  fetchMock: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Real protect/JWT with only the account store mocked (pattern from
// tests/api/coachConversationReadAuthorization.test.mjs). The waiver gate is an
// unrelated pre-existing gate, stubbed so it cannot mask the speech chain.
vi.mock('../../middleware/waiverGate.mjs', () => ({
  requireLinkedWaiver: (_req, _res, next) => next(),
}));
vi.mock('../../models/index.mjs', () => ({
  getUser: () => ({ findByPk: mocks.userFindByPk }),
  getModel: () => ({ findOne: vi.fn(async () => ({ status: 'linked' })) }),
  getAllModels: () => ({}),
}));
vi.mock('../../models/User.mjs', () => ({ default: { findByPk: mocks.userFindByPk } }));
vi.mock('../../models/Subscription.mjs', () => ({
  default: { findOne: mocks.subscriptionFindOne, create: mocks.subscriptionCreate },
}));

// Real subscription factory: record the mounted arguments, then run the real
// middleware so its role/usage semantics are exercised rather than described.
vi.mock('../../middleware/requireSubscription.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requireSubscription: (minimumTier, options = {}) => {
      const feature = options.feature ?? 'chat';
      mocks.subscriptionArgs.push([minimumTier, feature]);
      const real = actual.requireSubscription(minimumTier, options);
      return (req, res, next) => {
        mocks.stage.push(`subscription:${feature}:${req.path}`);
        return real(req, res, next);
      };
    },
  };
});

vi.mock('../../middleware/aiRateLimiter.mjs', () => ({
  aiRateLimiter: (req, _res, next) => { mocks.stage.push(`rate:${req.path}`); next(); },
}));

// Real strict PII: the recorded call is chain evidence, the transformed/blocked
// body is the behavioural evidence.
vi.mock('../../middleware/piiSanitizationMiddleware.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    strictPiiMiddleware: (req, res, next) => {
      mocks.stage.push(`pii:${req.path}`);
      return actual.strictPiiMiddleware(req, res, next);
    },
  };
});

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
  getCoachProviderAdapter: vi.fn(),
  enrichWithUserData: vi.fn(),
  getAIChatDiagnostics: vi.fn(),
  sanitizeAiChatMetadataForClient: vi.fn((v) => v),
  sanitizeAiFailoverTrace: vi.fn((v) => v),
}));
vi.mock('../../services/voiceTranscriptionService.mjs', () => ({
  transcribeAudio: mocks.transcribeAudio,
  isAudioFile: vi.fn(() => true),
  // Synchronous by contract: the route destructures its result before awaiting.
  checkAndRecordTranscription: mocks.checkAndRecordTranscription,
}));
vi.mock('../../services/aiPrivacyService.mjs', () => ({
  stripIdentityFromMessage: vi.fn(async (m) => ({ sanitizedMessage: m, identitiesStripped: 0 })),
  stripIdentityFromResponse: vi.fn(async (m) => ({ sanitizedResponse: m, identitiesStripped: 0 })),
  scrubGenericPII: vi.fn(async (m) => ({ sanitizedText: m, piiRemoved: 0 })),
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

const app = express();
app.use(express.json());
app.use('/api/ai-chat', aiChatRoutes);

const originalFetch = globalThis.fetch;
const TTS_TEXT = 'next set is 3 by 12 at 135';
const CLIENT_NAME = 'Sarah Johnson';

function makeAccount(id, role, extra = {}) {
  const account = { id, role, isActive: true, isLocked: false, username: `synthetic-${id}`,
    email: `synthetic-${id}@example.test`, subscriptionTier: 'free',
    update: vi.fn(async () => {}), increment: vi.fn(async () => {}), ...extra };
  mocks.accounts.set(String(id), account);
  return account;
}
const auth = (id) => 'Bearer ' + jwt.sign({ id, tokenType: 'access' }, process.env.JWT_SECRET, { expiresIn: '1h' });
const tts = (id, body) => request(app).post('/api/ai-chat/tts').set('Authorization', auth(id)).send(body);
const transcribe = (id) => request(app).post('/api/ai-chat/transcribe').set('Authorization', auth(id));
const stages = (kind) => mocks.stage.filter((s) => s.startsWith(kind + ':')).map((s) => s.slice(kind.length + 1));

function stubTtsProvider() {
  mocks.fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ inlineData: {
      data: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]).toString('base64'), mimeType: 'audio/L16;rate=24000' } }] } }] }),
    text: async () => '',
  });
}

beforeEach(() => {
  mocks.stage.length = 0;
  mocks.accounts.clear();
  mocks.query.mockReset().mockResolvedValue([]);
  mocks.findConversation.mockReset().mockResolvedValue(null);
  mocks.subscriptionFindOne.mockReset().mockResolvedValue({ tier: 'free', status: 'active', isInTrial: () => false });
  mocks.subscriptionCreate.mockReset();
  mocks.userFindByPk.mockReset().mockImplementation(async (id) => {
    const account = mocks.accounts.get(String(id));
    return account ? { ...account } : null;
  });
  mocks.transcribeAudio.mockReset().mockResolvedValue('synthetic transcript');
  mocks.checkAndRecordTranscription.mockReset().mockReturnValue({ allowed: true, remaining: 9 });
  mocks.fetchMock.mockReset();
  globalThis.fetch = mocks.fetchMock;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
});

describe('current speech access contract', () => {
  it('mounts pro/generation on both speech lanes and pro/chat on the chat lane', () => {
    expect(mocks.subscriptionArgs).toEqual([['pro', 'chat'], ['pro', 'generation'], ['pro', 'generation']]);
  });

  it('/tts runs subscription, then the rate limiter, then strict PII', async () => {
    makeAccount(101, 'client');
    await tts(101, { text: TTS_TEXT });
    expect(mocks.stage).toEqual(['subscription:generation:/tts', 'rate:/tts', 'pii:/tts']);
  });

  it('/transcribe runs subscription, rate limiter, the upload parser, then strict PII', async () => {
    makeAccount(102, 'client');
    const res = await transcribe(102).attach('audio', Buffer.from('fake-audio'), 'clip.webm');
    expect(res.status).toBe(200);
    expect(mocks.stage).toEqual(['subscription:generation:/transcribe', 'rate:/transcribe', 'pii:/transcribe']);
    // The parser ran before PII: the handler saw a real memory buffer, not a path.
    expect(mocks.transcribeAudio.mock.calls[0][0]).toBeInstanceOf(Buffer);
  });

  it('does not deny a free client, and tracks the feature the lane actually is', async () => {
    const speech = makeAccount(103, 'client');
    await tts(103, { text: TTS_TEXT });
    expect(speech.increment.mock.calls).toEqual([['aiGenerationsUsedThisMonth']]);
    expect(mocks.subscriptionFindOne).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: '103' } }));

    const chat = makeAccount(104, 'client');
    const res = await request(app).post('/api/ai-chat/conversations/999/messages')
      .set('Authorization', auth(104)).send({ message: 'hello' });
    expect(res.status).toBe(404); // No conversation fixture: the control still reached the handler.
    expect(chat.increment.mock.calls).toEqual([['aiMessagesUsedThisMonth']]);
  });

  it('lets admin and trainer bypass subscription tracking while rate and PII still run', async () => {
    for (const [id, role] of [[105, 'admin'], [106, 'trainer']]) {
      makeAccount(id, role);
      mocks.stage.length = 0;
      const res = await tts(id, { text: TTS_TEXT });
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('TTS_NOT_CONFIGURED');
      expect(mocks.stage).toEqual([`subscription:generation:/tts`, 'rate:/tts', 'pii:/tts']);
    }
    expect(mocks.subscriptionFindOne).not.toHaveBeenCalled();
  });

  it('real auth stops an unauthenticated or invalid speech request before downstream work', async () => {
    makeAccount(107, 'client');
    expect((await request(app).post('/api/ai-chat/tts').send({ text: TTS_TEXT })).status).toBe(401);
    expect((await request(app).post('/api/ai-chat/transcribe')
      .set('Authorization', 'Bearer not-a-jwt').attach('audio', Buffer.from('x'), 'c.webm')).status).toBe(401);
    expect(mocks.stage).toEqual([]);
    expect(mocks.subscriptionFindOne).not.toHaveBeenCalled();
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });
});

describe('current speech body-privacy contract (real strict PII)', () => {
  it('blocks critical PII on /tts before the provider is called', async () => {
    makeAccount(201, 'client');
    process.env.GEMINI_API_KEY = 'synthetic-not-a-real-key';
    stubTtsProvider();

    const res = await tts(201, { text: 'my ssn is 123-45-6789' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pii_blocked');
    expect(mocks.stage).toContain('pii:/tts');
    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  it('redacts a contextual client name in the real provider-bound TTS body', async () => {
    makeAccount(202, 'client');
    process.env.GEMINI_API_KEY = 'synthetic-not-a-real-key';
    stubTtsProvider();

    const res = await tts(202, { text: `Remind ${CLIENT_NAME} about her session tomorrow` });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/wav');

    const body = JSON.parse(mocks.fetchMock.mock.calls[0][1].body);
    const spoken = body.contents[0].parts[0].text;
    expect(spoken).not.toContain(CLIENT_NAME);
    expect(spoken).not.toContain('Sarah');
    expect(spoken).toContain('[NAME-REDACTED]');
    // Safe training content still survives redaction.
    mocks.fetchMock.mockClear();
    const safe = await tts(202, { text: 'next set is 3 by 12 at 135' });
    expect(safe.status).toBe(200);
    expect(JSON.parse(mocks.fetchMock.mock.calls[0][1].body).contents[0].parts[0].text).toBe('next set is 3 by 12 at 135');
  });

  it('blocks critical multipart text after the upload parser and before transcription', async () => {
    makeAccount(203, 'client');
    const res = await transcribe(203)
      .field('text', 'my ssn is 123-45-6789')
      .attach('audio', Buffer.from('fake-audio'), 'clip.webm');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('pii_blocked');
    expect(mocks.stage).toContain('pii:/transcribe');
    expect(mocks.checkAndRecordTranscription).not.toHaveBeenCalled();
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();
  });
});

describe('current speech handler contracts (no provider, no database)', () => {
  it('keeps TTS validation, unconfigured and success responses as mounted', async () => {
    makeAccount(301, 'client');
    expect((await tts(301, {})).status).toBe(400);
    expect((await tts(301, { text: 42 })).status).toBe(400);
    expect((await tts(301, { text: 'x'.repeat(5001) })).status).toBe(400);

    const unconfigured = await tts(301, { text: TTS_TEXT });
    expect(unconfigured.status).toBe(503);
    expect(unconfigured.body.code).toBe('TTS_NOT_CONFIGURED');
    expect(mocks.fetchMock).not.toHaveBeenCalled();

    process.env.GEMINI_API_KEY = 'synthetic-not-a-real-key';
    stubTtsProvider();
    const ok = await tts(301, { text: TTS_TEXT });
    expect(ok.status).toBe(200);
    expect(mocks.fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps transcribe audio validation and the synchronous quota refusal', async () => {
    makeAccount(302, 'client');
    const missing = await transcribe(302);
    expect(missing.status).toBe(400);
    expect(mocks.checkAndRecordTranscription).not.toHaveBeenCalled();

    mocks.checkAndRecordTranscription.mockReturnValueOnce({ allowed: false, remaining: 0 });
    const refused = await transcribe(302).attach('audio', Buffer.from('fake-audio'), 'clip.webm');
    expect(refused.status).toBe(429);
    expect(mocks.transcribeAudio).not.toHaveBeenCalled();

    const accepted = await transcribe(302).attach('audio', Buffer.from('fake-audio'), 'clip.webm');
    expect(accepted.status).toBe(200);
    expect(accepted.body).toMatchObject({ success: true, text: 'synthetic transcript', remaining: 9 });
    expect(accepted.body.metadata.filename).toBe('clip.webm');
    expect(mocks.transcribeAudio).toHaveBeenCalledTimes(1);
  });
});
