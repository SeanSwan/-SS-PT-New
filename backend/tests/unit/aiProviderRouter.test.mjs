/**
 * AI Provider Router — Unit Tests
 * ================================
 * Tests for: adapters, circuit breaker, router, output validator, rate limiter, degraded response.
 * All provider calls are mocked — no real API calls.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Circuit Breaker ──────────────────────────────────────────────────────────

describe('circuitBreaker', () => {
  let cb;

  beforeEach(async () => {
    cb = await import('../../services/ai/circuitBreaker.mjs');
    cb.resetAll();
  });

  it('1 — allows requests when circuit is closed', () => {
    const result = cb.canRequest('openai');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('closed');
  });

  it('2 — opens circuit after 3 consecutive failures', () => {
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    const result = cb.canRequest('openai');
    expect(result.allowed).toBe(false);
    expect(result.state).toBe('open');
  });

  it('3 — resets circuit on success', () => {
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordSuccess('openai');
    // Third failure after reset — not at threshold yet
    cb.recordFailure('openai');
    const result = cb.canRequest('openai');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('closed');
  });

  it('4 — transitions to half-open after cooldown', async () => {
    // Force open by failing 3 times
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordFailure('openai');

    // Simulate time passage (mock Date.now)
    const realNow = Date.now;
    Date.now = () => realNow() + 61_000; // 61 seconds later

    const result = cb.canRequest('openai');
    expect(result.allowed).toBe(true);
    expect(result.state).toBe('half_open');

    Date.now = realNow; // Restore
  });

  it('5 — half-open probe failure re-opens circuit', async () => {
    cb.recordFailure('openai');
    cb.recordFailure('openai');
    cb.recordFailure('openai');

    const realNow = Date.now;
    Date.now = () => realNow() + 61_000;
    cb.canRequest('openai'); // transitions to half_open
    Date.now = realNow;

    cb.recordFailure('openai'); // half-open probe failed
    expect(cb.getState('openai')).toBe('open');
  });
});

// ── Output Validator ─────────────────────────────────────────────────────────

describe('outputValidator', () => {
  let validator;

  beforeEach(async () => {
    validator = await import('../../services/ai/outputValidator.mjs');
  });

  it('6 — detectPii catches email patterns', () => {
    const result = validator.detectPii('Plan for john@example.com');
    expect(result).not.toBeNull();
    expect(result.piiType).toBe('email');
  });

  it('7 — detectPii catches phone patterns', () => {
    const result = validator.detectPii('Call 555-123-4567 for help');
    expect(result).not.toBeNull();
    expect(result.piiType).toBe('phone');
  });

  it('8 — detectPii catches user name', () => {
    const result = validator.detectPii('Workout plan for John Smith', { userName: 'John Smith' });
    expect(result).not.toBeNull();
    expect(result.piiType).toBe('name');
  });

  it('9 — detectPii returns null for clean text', () => {
    const result = validator.detectPii('Workout plan for Client with push-ups and squats');
    expect(result).toBeNull();
  });

  const validPlan = JSON.stringify({
    planName: 'Test Plan',
    durationWeeks: 4,
    summary: 'A test workout plan',
    days: [
      {
        dayNumber: 1,
        name: 'Day 1',
        focus: 'Upper Body',
        dayType: 'training',
        estimatedDuration: 60,
        exercises: [
          { name: 'Push-ups', setScheme: '3x10', repGoal: '10', restPeriod: 60 },
        ],
      },
    ],
  });

  it('10 — validateSchema accepts valid plan', () => {
    const result = validator.validateSchema(validPlan);
    expect(result.ok).toBe(true);
    expect(result.data.planName).toBe('Test Plan');
  });

  it('11 — validateSchema rejects invalid JSON', () => {
    const result = validator.validateSchema('not json {{{');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/JSON parse/);
  });

  it('12 — validateSchema rejects missing planName', () => {
    const result = validator.validateSchema(JSON.stringify({ durationWeeks: 4, days: [{ dayNumber: 1, name: 'Day 1', exercises: [] }] }));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/planName/);
  });

  it('13 — validateSchema rejects empty days array', () => {
    const result = validator.validateSchema(JSON.stringify({ planName: 'X', durationWeeks: 1, days: [] }));
    expect(result.ok).toBe(false);
  });

  it('14 — validateRules rejects duplicate day numbers', () => {
    const plan = {
      planName: 'Test', durationWeeks: 4, summary: '',
      days: [
        { dayNumber: 1, name: 'A', exercises: [] },
        { dayNumber: 1, name: 'B', exercises: [] },
      ],
    };
    const result = validator.validateRules(plan);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Duplicate day numbers/);
  });

  it('15 — validateRules rejects too many days for duration', () => {
    const days = Array.from({ length: 10 }, (_, i) => ({
      dayNumber: i + 1, name: `Day ${i + 1}`, exercises: [],
    }));
    const plan = { planName: 'Test', durationWeeks: 1, summary: '', days };
    const result = validator.validateRules(plan);
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/Too many days/);
  });

  it('16 — runValidationPipeline rejects PII in output', () => {
    const rawText = JSON.stringify({
      planName: 'Plan for john@example.com',
      durationWeeks: 4,
      days: [{ dayNumber: 1, name: 'Day 1', exercises: [] }],
    });
    const result = validator.runValidationPipeline(rawText);
    expect(result.ok).toBe(false);
    expect(result.failStage).toBe('pii_leak');
  });

  it('17 — runValidationPipeline succeeds for valid clean plan', () => {
    const result = validator.runValidationPipeline(validPlan);
    expect(result.ok).toBe(true);
    expect(result.data.planName).toBe('Test Plan');
  });
});

// ── Rate Limiter ─────────────────────────────────────────────────────────────

describe('rateLimiter', () => {
  let limiter;

  beforeEach(async () => {
    limiter = await import('../../services/ai/rateLimiter.mjs');
    limiter.resetAll();
  });

  it('18 — allows first request', () => {
    const result = limiter.checkRateLimit(1);
    expect(result.allowed).toBe(true);
  });

  it('19 — blocks 4th request in 1 minute (per-user limit)', () => {
    limiter.checkRateLimit(1);
    limiter.releaseConcurrent(1);
    limiter.checkRateLimit(1);
    limiter.releaseConcurrent(1);
    limiter.checkRateLimit(1);
    limiter.releaseConcurrent(1);
    const result = limiter.checkRateLimit(1);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('AI_USER_RATE_LIMITED');
  });

  it('20 — blocks concurrent requests for same user', () => {
    limiter.checkRateLimit(1); // In-flight (not released)
    const result = limiter.checkRateLimit(1);
    expect(result.allowed).toBe(false);
    expect(result.code).toBe('AI_CONCURRENT_LIMIT');
  });

  it('21 — allows concurrent requests for different users', () => {
    limiter.checkRateLimit(1);
    const result = limiter.checkRateLimit(2);
    expect(result.allowed).toBe(true);
  });

  it('22 — release allows next request', () => {
    limiter.checkRateLimit(1);
    limiter.releaseConcurrent(1);
    const result = limiter.checkRateLimit(1);
    expect(result.allowed).toBe(true);
  });
});

// ── Degraded Response ────────────────────────────────────────────────────────

describe('degradedResponse', () => {
  let builder;

  beforeEach(async () => {
    builder = await import('../../services/ai/degradedResponse.mjs');
  });

  it('23 — builds correct degraded response shape', () => {
    const errors = [
      { provider: 'openai', code: 'PROVIDER_TIMEOUT', message: 'timeout', retryable: true, statusCode: null },
    ];
    const trace = ['openai:PROVIDER_TIMEOUT'];
    const response = builder.buildDegradedResponse(errors, trace);

    expect(response.success).toBe(true);
    expect(response.degraded).toBe(true);
    expect(response.code).toBe('AI_DEGRADED_MODE');
    expect(response.fallback.type).toBe('manual_template_only');
    expect(response.fallback.templateSuggestions.length).toBeGreaterThan(0);
    expect(response.fallback.reasons).toContain('Openai: request timed out');
    expect(response.failoverTrace).toEqual(trace);
  });
});

// ── Prompt Builder ───────────────────────────────────────────────────────────

describe('promptBuilder', () => {
  let builder;

  beforeEach(async () => {
    builder = await import('../../services/ai/promptBuilder.mjs');
  });

  it('24 — builds prompt with de-identified payload', () => {
    const payload = { client: { alias: 'Client', goals: { primary: 'strength' } } };
    const constraints = { nasm: { optPhase: 'hypertrophy' } };
    const prompt = builder.buildWorkoutPrompt(payload, constraints);

    expect(prompt).toContain('Client');
    expect(prompt).toContain('hypertrophy');
    expect(prompt).toContain('certified personal trainer');
  });

  it('25 — prompt does not contain userId', () => {
    const payload = { client: { alias: 'Client' } };
    const prompt = builder.buildWorkoutPrompt(payload, {});
    expect(prompt).not.toContain('userId');
  });
});

// ── Provider Router (with mocked adapters) ───────────────────────────────────

describe('providerRouter', () => {
  let router;
  let cb;

  beforeEach(async () => {
    // Fresh import to reset adapter registry
    router = await import('../../services/ai/providerRouter.mjs');
    cb = await import('../../services/ai/circuitBreaker.mjs');
    cb.resetAll();
  });

  const makeCtx = () => ({
    requestType: 'workout_generation',
    userId: 1,
    deidentifiedPayload: { client: { alias: 'Client' } },
    serverConstraints: {},
    payloadHash: 'abc123',
    promptVersion: '1.0.0',
  });

  const mockSuccessAdapter = (name) => ({
    name,
    isConfigured: () => true,
    generateWorkoutDraft: vi.fn().mockResolvedValue({
      provider: name,
      model: 'test-model',
      rawText: '{"planName":"Test","durationWeeks":4,"days":[{"dayNumber":1,"name":"Day 1","exercises":[]}]}',
      latencyMs: 100,
      finishReason: 'stop',
      tokenUsage: { inputTokens: 50, outputTokens: 100, totalTokens: 150, estimatedCostUsd: null },
    }),
  });

  const mockFailAdapter = (name, code = 'PROVIDER_TIMEOUT') => ({
    name,
    isConfigured: () => true,
    generateWorkoutDraft: vi.fn().mockRejectedValue({
      provider: name,
      code,
      message: 'Test error',
      retryable: code === 'PROVIDER_TIMEOUT',
      statusCode: null,
    }),
  });

  it('26 — routes to first successful provider', async () => {
    process.env.AI_PROVIDER_ORDER = 'testprovider';
    const adapter = mockSuccessAdapter('testprovider');
    router.registerAdapter(adapter);

    const result = await router.routeAiGeneration(makeCtx());

    expect(result.ok).toBe(true);
    expect(result.result.provider).toBe('testprovider');
    expect(result.failoverTrace).toContain('testprovider:success');

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('27 — returns degraded when all providers fail', async () => {
    process.env.AI_PROVIDER_ORDER = 'failprovider';
    router.registerAdapter(mockFailAdapter('failprovider', 'PROVIDER_AUTH'));

    const result = await router.routeAiGeneration(makeCtx());

    expect(result.ok).toBe(false);
    expect(result.degraded).toBe(true);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.failoverTrace).toContain('failprovider:PROVIDER_AUTH');

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('28 — skips unconfigured providers', async () => {
    process.env.AI_PROVIDER_ORDER = 'unconfigured,configured';
    router.registerAdapter({ name: 'unconfigured', isConfigured: () => false, generateWorkoutDraft: vi.fn() });
    router.registerAdapter(mockSuccessAdapter('configured'));

    const result = await router.routeAiGeneration(makeCtx());

    expect(result.ok).toBe(true);
    expect(result.failoverTrace).toContain('unconfigured:not_configured');
    expect(result.failoverTrace).toContain('configured:success');

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('29 — skips providers with open circuit', async () => {
    process.env.AI_PROVIDER_ORDER = 'broken,fallback';
    cb.recordFailure('broken');
    cb.recordFailure('broken');
    cb.recordFailure('broken');
    router.registerAdapter(mockSuccessAdapter('broken'));
    router.registerAdapter(mockSuccessAdapter('fallback'));

    const result = await router.routeAiGeneration(makeCtx());

    expect(result.ok).toBe(true);
    expect(result.failoverTrace).toContain('broken:circuit_open');
    expect(result.failoverTrace).toContain('fallback:success');

    delete process.env.AI_PROVIDER_ORDER;
  });

  it('30 — default provider order includes venice fallback', async () => {
    delete process.env.AI_PROVIDER_ORDER;
    router.resetAdapters();
    router.registerAdapter(mockSuccessAdapter('venice'));

    const result = await router.routeAiGeneration(makeCtx());

    expect(result.ok).toBe(true);
    expect(result.result.provider).toBe('venice');
    expect(result.failoverTrace).toContain('openai:not_registered');
    expect(result.failoverTrace).toContain('anthropic:not_registered');
    expect(result.failoverTrace).toContain('gemini:not_registered');
    expect(result.failoverTrace).toContain('venice:success');
  });
});
