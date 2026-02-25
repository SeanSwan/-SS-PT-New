/**
 * AI Provider Router — Integration & Privacy Regression Tests
 * =============================================================
 * Tests the full pipeline from router → validation → audit log.
 * All provider calls mocked. No real API calls.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Integration: Router → Validator Pipeline ─────────────────────────────────

describe('Router → Validator integration', () => {
  let router, validator, degraded, cb;

  beforeEach(async () => {
    router = await import('../../services/ai/providerRouter.mjs');
    validator = await import('../../services/ai/outputValidator.mjs');
    degraded = await import('../../services/ai/degradedResponse.mjs');
    cb = await import('../../services/ai/circuitBreaker.mjs');
    cb.resetAll();
  });

  const validAiOutput = JSON.stringify({
    planName: 'Full Body Strength',
    durationWeeks: 4,
    summary: 'A comprehensive strength program',
    days: [
      {
        dayNumber: 1,
        name: 'Day 1 - Push',
        focus: 'Chest and Shoulders',
        dayType: 'training',
        estimatedDuration: 60,
        exercises: [
          { name: 'Bench Press', setScheme: '4x8', repGoal: '8', restPeriod: 90, tempo: '2-1-2', intensityGuideline: '75% 1RM' },
          { name: 'Overhead Press', setScheme: '3x10', repGoal: '10', restPeriod: 60 },
        ],
      },
      {
        dayNumber: 2,
        name: 'Day 2 - Pull',
        focus: 'Back and Biceps',
        dayType: 'training',
        estimatedDuration: 55,
        exercises: [
          { name: 'Deadlift', setScheme: '3x5', repGoal: '5', restPeriod: 120 },
        ],
      },
    ],
  });

  const makeCtx = () => ({
    requestType: 'workout_generation',
    userId: 42,
    deidentifiedPayload: { client: { alias: 'Client', goals: { primary: 'strength' } }, training: { level: 'intermediate' } },
    serverConstraints: { nasm: { optPhase: 'hypertrophy' } },
    payloadHash: 'testhash123',
    promptVersion: '1.0.0',
  });

  it('I1 — success path: router result passes validation pipeline', async () => {
    process.env.AI_PROVIDER_ORDER = 'mock_success';
    router.registerAdapter({
      name: 'mock_success',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'mock_success',
        model: 'test-model',
        rawText: validAiOutput,
        latencyMs: 200,
        finishReason: 'stop',
        tokenUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, estimatedCostUsd: 0.01 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);

    const val = validator.runValidationPipeline(outcome.result.rawText);
    expect(val.ok).toBe(true);
    expect(val.data.planName).toBe('Full Body Strength');
    expect(val.data.days).toHaveLength(2);

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('I2 — failover: first provider fails, second succeeds', async () => {
    process.env.AI_PROVIDER_ORDER = 'failing,backup';
    router.registerAdapter({
      name: 'failing',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'failing', code: 'PROVIDER_TIMEOUT', message: 'timeout', retryable: true, statusCode: null,
      }),
    });
    router.registerAdapter({
      name: 'backup',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'backup', model: 'backup-model', rawText: validAiOutput,
        latencyMs: 300, finishReason: 'stop',
        tokenUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, estimatedCostUsd: null },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('backup');
    expect(outcome.failoverTrace).toContain('failing:PROVIDER_TIMEOUT');
    expect(outcome.failoverTrace).toContain('backup:success');

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('I3 — all providers fail → degraded response has correct shape', async () => {
    process.env.AI_PROVIDER_ORDER = 'dead1,dead2';
    router.registerAdapter({
      name: 'dead1', isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'dead1', code: 'PROVIDER_UNAVAILABLE', message: 'down', retryable: false, statusCode: 503,
      }),
    });
    router.registerAdapter({
      name: 'dead2', isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'dead2', code: 'PROVIDER_NETWORK', message: 'network', retryable: true, statusCode: null,
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(false);
    expect(outcome.degraded).toBe(true);

    const response = degraded.buildDegradedResponse(outcome.errors, outcome.failoverTrace);
    expect(response.success).toBe(true);
    expect(response.degraded).toBe(true);
    expect(response.code).toBe('AI_DEGRADED_MODE');
    expect(response.fallback.templateSuggestions.length).toBeGreaterThanOrEqual(5);
    expect(response.fallback.reasons).toHaveLength(2);

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('I4 — malformed provider output fails parse validation', async () => {
    const malformedOutput = 'This is not JSON at all. Here is your workout plan...';

    const val = validator.runValidationPipeline(malformedOutput);
    expect(val.ok).toBe(false);
    expect(val.failStage).toBe('parse_error');
  });

  it('I5 — valid JSON but fails Zod schema', async () => {
    const badSchema = JSON.stringify({ planName: '', durationWeeks: 0, days: [] });
    const val = validator.runValidationPipeline(badSchema);
    expect(val.ok).toBe(false);
    expect(val.failStage).toBe('validation_error');
  });

  it('I6 — valid JSON but fails rule engine (duplicate days)', async () => {
    const duplicateDays = JSON.stringify({
      planName: 'Test',
      durationWeeks: 4,
      days: [
        { dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Push-ups' }] },
        { dayNumber: 1, name: 'Day 1 again', exercises: [{ name: 'Squats' }] },
      ],
    });
    const val = validator.runValidationPipeline(duplicateDays);
    expect(val.ok).toBe(false);
    expect(val.failStage).toBe('validation_error');
    expect(val.failReason).toMatch(/Duplicate day numbers/);
  });

  it('I7 — PII in provider output causes rejection', async () => {
    const piiOutput = JSON.stringify({
      planName: 'Plan for john@example.com',
      durationWeeks: 4,
      days: [{ dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Push-ups' }] }],
    });
    const val = validator.runValidationPipeline(piiOutput);
    expect(val.ok).toBe(false);
    expect(val.failStage).toBe('pii_leak');
  });

  it('I8 — token usage flows through provider result', async () => {
    process.env.AI_PROVIDER_ORDER = 'token_test';
    router.registerAdapter({
      name: 'token_test',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'token_test', model: 'gpt-4', rawText: validAiOutput,
        latencyMs: 150, finishReason: 'stop',
        tokenUsage: { inputTokens: 500, outputTokens: 800, totalTokens: 1300, estimatedCostUsd: 0.045 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.tokenUsage.totalTokens).toBe(1300);
    expect(outcome.result.tokenUsage.estimatedCostUsd).toBe(0.045);

    delete process.env.AI_PROVIDER_ORDER;
  });
});

// ── Multi-Provider Failover (Phase 3B) ──────────────────────────────────────

describe('Multi-provider failover (Phase 3B)', () => {
  let router, cb;

  beforeEach(async () => {
    router = await import('../../services/ai/providerRouter.mjs');
    cb = await import('../../services/ai/circuitBreaker.mjs');
    router.resetAdapters();
    cb.resetAll();
  });

  afterEach(async () => {
    const router = await import('../../services/ai/providerRouter.mjs');
    router.resetAdapters();
    delete process.env.AI_PROVIDER_ORDER;
  });

  const validAiOutput = JSON.stringify({
    planName: 'Failover Plan',
    durationWeeks: 4,
    summary: 'Multi-provider test plan',
    days: [
      {
        dayNumber: 1, name: 'Day 1', focus: 'Full Body', dayType: 'training',
        estimatedDuration: 45,
        exercises: [{ name: 'Squat', setScheme: '3x10', repGoal: '10', restPeriod: 60 }],
      },
    ],
  });

  const makeCtx = () => ({
    requestType: 'workout_generation',
    userId: 42,
    deidentifiedPayload: { client: { alias: 'Client', goals: { primary: 'strength' } } },
    serverConstraints: {},
    payloadHash: 'hash',
    promptVersion: '1.0.0',
  });

  it('F1 — openai fails → anthropic succeeds', async () => {
    process.env.AI_PROVIDER_ORDER = 'openai,anthropic';

    router.registerAdapter({
      name: 'openai',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'openai', code: 'PROVIDER_UNAVAILABLE', message: 'down', retryable: false, statusCode: 503,
      }),
    });
    router.registerAdapter({
      name: 'anthropic',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'anthropic', model: 'claude-sonnet-4-6', rawText: validAiOutput,
        latencyMs: 250, finishReason: 'stop',
        tokenUsage: { inputTokens: 150, outputTokens: 250, totalTokens: 400, estimatedCostUsd: 0.004 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('anthropic');
    expect(outcome.failoverTrace).toContain('openai:PROVIDER_UNAVAILABLE');
    expect(outcome.failoverTrace).toContain('anthropic:success');
  });

  it('F2 — openai + anthropic fail → gemini succeeds', async () => {
    process.env.AI_PROVIDER_ORDER = 'openai,anthropic,gemini';

    router.registerAdapter({
      name: 'openai',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'openai', code: 'PROVIDER_TIMEOUT', message: 'timeout', retryable: true, statusCode: null,
      }),
    });
    router.registerAdapter({
      name: 'anthropic',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'anthropic', code: 'PROVIDER_RATE_LIMIT', message: 'rate limited', retryable: true, statusCode: 429,
      }),
    });
    router.registerAdapter({
      name: 'gemini',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'gemini', model: 'gemini-2.0-flash', rawText: validAiOutput,
        latencyMs: 180, finishReason: 'stop',
        tokenUsage: { inputTokens: 80, outputTokens: 160, totalTokens: 240, estimatedCostUsd: 0.0001 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('gemini');
    expect(outcome.failoverTrace).toContain('openai:PROVIDER_TIMEOUT');
    expect(outcome.failoverTrace).toContain('anthropic:PROVIDER_RATE_LIMIT');
    expect(outcome.failoverTrace).toContain('gemini:success');
  });

  it('F3 — all 3 providers fail → degraded with full trace', async () => {
    process.env.AI_PROVIDER_ORDER = 'openai,anthropic,gemini';

    router.registerAdapter({
      name: 'openai',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'openai', code: 'PROVIDER_UNAVAILABLE', message: 'down', retryable: false, statusCode: 503,
      }),
    });
    router.registerAdapter({
      name: 'anthropic',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'anthropic', code: 'PROVIDER_AUTH', message: 'bad key', retryable: false, statusCode: 401,
      }),
    });
    router.registerAdapter({
      name: 'gemini',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockRejectedValue({
        provider: 'gemini', code: 'PROVIDER_NETWORK', message: 'network', retryable: true, statusCode: null,
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(false);
    expect(outcome.degraded).toBe(true);
    expect(outcome.failoverTrace).toHaveLength(3);
    expect(outcome.failoverTrace).toContain('openai:PROVIDER_UNAVAILABLE');
    expect(outcome.failoverTrace).toContain('anthropic:PROVIDER_AUTH');
    expect(outcome.failoverTrace).toContain('gemini:PROVIDER_NETWORK');
    expect(outcome.errors).toHaveLength(3);
  });

  it('F4 — not_configured skip: openai unconfigured → anthropic succeeds', async () => {
    process.env.AI_PROVIDER_ORDER = 'openai,anthropic';

    router.registerAdapter({
      name: 'openai',
      isConfigured: () => false, // No API key
      generateWorkoutDraft: vi.fn(),
    });
    router.registerAdapter({
      name: 'anthropic',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'anthropic', model: 'claude-sonnet-4-6', rawText: validAiOutput,
        latencyMs: 200, finishReason: 'stop',
        tokenUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, estimatedCostUsd: 0.003 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('anthropic');
    expect(outcome.failoverTrace).toContain('openai:not_configured');
    expect(outcome.failoverTrace).toContain('anthropic:success');
  });

  it('F5 — cost tracking flows through multi-provider result', async () => {
    process.env.AI_PROVIDER_ORDER = 'gemini';

    router.registerAdapter({
      name: 'gemini',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'gemini', model: 'gemini-2.0-flash', rawText: validAiOutput,
        latencyMs: 100, finishReason: 'stop',
        tokenUsage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500, estimatedCostUsd: 0.0003 },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.tokenUsage.estimatedCostUsd).toBeCloseTo(0.0003, 6);
    expect(outcome.result.tokenUsage.inputTokens).toBe(1000);
    expect(outcome.result.tokenUsage.outputTokens).toBe(500);
  });

  it('F6 — circuit_open skip in failover trace', async () => {
    process.env.AI_PROVIDER_ORDER = 'openai,anthropic';

    // Trip the circuit for openai
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordFailure('openai');

    router.registerAdapter({
      name: 'openai',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn(),
    });
    router.registerAdapter({
      name: 'anthropic',
      isConfigured: () => true,
      generateWorkoutDraft: vi.fn().mockResolvedValue({
        provider: 'anthropic', model: 'claude-sonnet-4-6', rawText: validAiOutput,
        latencyMs: 200, finishReason: 'stop',
        tokenUsage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, estimatedCostUsd: null },
      }),
    });

    const outcome = await router.routeAiGeneration(makeCtx());
    expect(outcome.ok).toBe(true);
    expect(outcome.result.provider).toBe('anthropic');
    expect(outcome.failoverTrace).toContain('openai:circuit_open');
  });
});

// ── Privacy Regression Tests ─────────────────────────────────────────────────

describe('Privacy regression', () => {
  let promptBuilder;

  beforeEach(async () => {
    promptBuilder = await import('../../services/ai/promptBuilder.mjs');
  });

  it('R1 — prompt uses deidentifiedPayload only (no raw PII fields)', () => {
    const safePayload = {
      client: { alias: 'Client', goals: { primary: 'strength' } },
      training: { level: 'intermediate' },
    };
    const prompt = promptBuilder.buildWorkoutPrompt(safePayload, {});

    // Should contain de-identified alias
    expect(prompt).toContain('Client');
    // Should NOT contain any PII patterns
    expect(prompt).not.toMatch(/john|jane|@.*\.com|\d{3}[-.]?\d{3}[-.]?\d{4}/i);
  });

  it('R2 — promptBuilder does not inject ctx.userId into the prompt', () => {
    // The prompt builder receives ONLY (deidentifiedPayload, serverConstraints).
    // It does NOT receive the AiGenerationContext object, so ctx.userId
    // is architecturally excluded. This test verifies the builder's function
    // signature prevents accidental userId injection.
    const safePayload = { client: { alias: 'Client', goals: { primary: 'strength' } } };
    const prompt = promptBuilder.buildWorkoutPrompt(safePayload, { nasm: { optPhase: 'hypertrophy' } });

    // The de-identified payload should never contain userId
    expect(prompt).not.toMatch(/\buserId\b/);
    // And should not contain any numeric IDs that could be user IDs
    expect(prompt).not.toMatch(/"userId":\s*\d+/);
  });

  it('R3 — user-supplied constraints are not in prompt (only serverConstraints)', () => {
    const payload = { client: { alias: 'Client' } };
    const serverConstraints = { nasm: { optPhase: 'hypertrophy' } };
    const prompt = promptBuilder.buildWorkoutPrompt(payload, serverConstraints);

    expect(prompt).toContain('hypertrophy');
    // If someone tried to inject "userConstraints" it wouldn't appear
    expect(prompt).not.toContain('userConstraints');
  });

  it('R4 — PII detection catches email in mock AI response', async () => {
    const validator = await import('../../services/ai/outputValidator.mjs');
    const taintedOutput = JSON.stringify({
      planName: 'Custom Plan',
      durationWeeks: 4,
      summary: 'Contact trainer at trainer@gym.com for questions',
      days: [{ dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Squats' }] }],
    });

    const result = validator.runValidationPipeline(taintedOutput);
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });

  it('R5 — PII detection catches user name in AI response', async () => {
    const validator = await import('../../services/ai/outputValidator.mjs');
    const taintedOutput = JSON.stringify({
      planName: 'Workout for Sarah Johnson',
      durationWeeks: 4,
      days: [{ dayNumber: 1, name: 'Day 1', exercises: [{ name: 'Lunges' }] }],
    });

    const result = validator.runValidationPipeline(taintedOutput, { userName: 'Sarah Johnson' });
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });
});

// ── Rate Limiter Middleware ──────────────────────────────────────────────────

describe('aiRateLimiter middleware', () => {
  let middleware, limiter;

  beforeEach(async () => {
    middleware = await import('../../middleware/aiRateLimiter.mjs');
    limiter = await import('../../services/ai/rateLimiter.mjs');
    limiter.resetAll();
  });

  const mockReq = (userId) => ({ user: { id: userId } });
  const mockRes = () => {
    const res = { statusCode: null, body: null };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.body = data; return res; };
    return res;
  };

  it('M1 — allows request and calls next', () => {
    const req = mockReq(99);
    const res = mockRes();
    const next = vi.fn();

    middleware.aiRateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('M2 — blocks concurrent request with 429', () => {
    const req = mockReq(99);
    const res1 = mockRes();
    const res2 = mockRes();

    middleware.aiRateLimiter(req, res1, vi.fn());
    middleware.aiRateLimiter(req, res2, vi.fn());

    expect(res2.statusCode).toBe(429);
    expect(res2.body.code).toBe('AI_CONCURRENT_LIMIT');
  });
});
