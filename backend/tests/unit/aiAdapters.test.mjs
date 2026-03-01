/**
 * AI Provider Adapters — Unit Tests
 * ==================================
 * Tests for all provider adapters: OpenAI, Anthropic, Gemini, Venice.
 * SDK calls are mocked at module level. No real API calls.
 *
 * Phase 3B — Provider Router Completion
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock SDK factories ──────────────────────────────────────────────────────

const { mockOpenAICreate, mockAnthropicCreate, mockGeminiGenerate } = vi.hoisted(() => ({
  mockOpenAICreate: vi.fn(),
  mockAnthropicCreate: vi.fn(),
  mockGeminiGenerate: vi.fn(),
}));

vi.mock('openai', () => ({
  OpenAI: class MockOpenAI {
    constructor() {
      this.chat = { completions: { create: mockOpenAICreate } };
    }
  },
}));

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() {
      this.messages = { create: mockAnthropicCreate };
    }
  },
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    constructor() {}
    getGenerativeModel() {
      return { generateContent: mockGeminiGenerate };
    }
  },
}));

// Mock promptBuilder (shared across all adapters)
vi.mock('../../services/ai/promptBuilder.mjs', () => ({
  buildWorkoutPrompt: vi.fn().mockReturnValue('Test prompt'),
  WORKOUT_SYSTEM_MESSAGE: 'You are a personal training assistant.',
}));

// Mock logger
vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Shared test context ─────────────────────────────────────────────────────

const makeCtx = (overrides = {}) => ({
  requestType: 'workout_generation',
  userId: 42,
  deidentifiedPayload: { client: { alias: 'Client', goals: { primary: 'strength' } } },
  serverConstraints: { nasm: { optPhase: 'hypertrophy' } },
  payloadHash: 'hash123',
  promptVersion: '1.0.0',
  timeoutMs: 5000,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI Adapter
// ═══════════════════════════════════════════════════════════════════════════════

describe('openaiAdapter', () => {
  let openaiAdapter;

  beforeEach(async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test-key');
    mockOpenAICreate.mockReset();
    const mod = await import('../../services/ai/adapters/openaiAdapter.mjs');
    openaiAdapter = mod.default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── isConfigured ────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('should return true when OPENAI_API_KEY is set', () => {
      expect(openaiAdapter.isConfigured()).toBe(true);
    });

    it('should return true when AI_API_KEY is set (even without OPENAI_API_KEY)', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('AI_API_KEY', 'openrouter-key');
      expect(openaiAdapter.isConfigured()).toBe(true);
    });

    it('should return false when both AI_API_KEY and OPENAI_API_KEY are missing', () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('AI_API_KEY', '');
      expect(openaiAdapter.isConfigured()).toBe(false);
    });
  });

  // ── Success path ────────────────────────────────────────────────────────

  describe('generateWorkoutDraft — success', () => {
    it('should return normalized result on success', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{"planName":"Test"}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
      });

      const result = await openaiAdapter.generateWorkoutDraft(makeCtx());

      expect(result.provider).toBe('openai');
      expect(result.rawText).toBe('{"planName":"Test"}');
      expect(result.finishReason).toBe('stop');
      expect(result.tokenUsage.inputTokens).toBe(100);
      expect(result.tokenUsage.outputTokens).toBe(200);
      expect(result.tokenUsage.totalTokens).toBe(300);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should map finish_reason=length correctly', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'truncated output' }, finish_reason: 'length' }],
        usage: {},
      });

      const result = await openaiAdapter.generateWorkoutDraft(makeCtx());
      expect(result.finishReason).toBe('length');
    });

    it('should populate estimatedCostUsd for known models', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'output' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
      });

      const result = await openaiAdapter.generateWorkoutDraft(makeCtx());
      expect(result.tokenUsage.estimatedCostUsd).toBeTypeOf('number');
      expect(result.tokenUsage.estimatedCostUsd).toBeGreaterThan(0);
    });
  });

  // ── Error normalization ─────────────────────────────────────────────────

  describe('generateWorkoutDraft — errors', () => {
    it('should throw PROVIDER_AUTH when API key missing', async () => {
      vi.stubEnv('OPENAI_API_KEY', '');
      vi.stubEnv('AI_API_KEY', '');
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.provider).toBe('openai');
      }
    });

    it('should normalize 429 → PROVIDER_RATE_LIMIT', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('rate limit'), { status: 429 }));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_RATE_LIMIT');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize 401 → PROVIDER_AUTH', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.retryable).toBe(false);
      }
    });

    it('should normalize 500 → PROVIDER_UNAVAILABLE', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('server error'), { status: 500 }));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_UNAVAILABLE');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize ECONNREFUSED → PROVIDER_NETWORK', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_NETWORK');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize AbortError → PROVIDER_TIMEOUT', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_TIMEOUT');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize content_filter error → PROVIDER_CONTENT_FILTER', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('content_filter triggered'));
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_CONTENT_FILTER');
        expect(err.retryable).toBe(false);
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for empty content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '' }, finish_reason: 'stop' }],
        usage: {},
      });
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
        expect(err.provider).toBe('openai');
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for null content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null }, finish_reason: 'stop' }],
        usage: {},
      });
      try {
        await openaiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Anthropic Adapter
// ═══════════════════════════════════════════════════════════════════════════════

describe('anthropicAdapter', () => {
  let anthropicAdapter;

  beforeEach(async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    mockAnthropicCreate.mockReset();
    const mod = await import('../../services/ai/adapters/anthropicAdapter.mjs');
    anthropicAdapter = mod.default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── isConfigured ────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('should return true when ANTHROPIC_API_KEY is set', () => {
      expect(anthropicAdapter.isConfigured()).toBe(true);
    });

    it('should return false when ANTHROPIC_API_KEY is missing', () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      expect(anthropicAdapter.isConfigured()).toBe(false);
    });
  });

  // ── Success path ────────────────────────────────────────────────────────

  describe('generateWorkoutDraft — success', () => {
    it('should return normalized result on success', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: '{"planName":"Anthropic Plan"}' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 150, output_tokens: 250 },
      });

      const result = await anthropicAdapter.generateWorkoutDraft(makeCtx());

      expect(result.provider).toBe('anthropic');
      expect(result.rawText).toBe('{"planName":"Anthropic Plan"}');
      expect(result.finishReason).toBe('stop');
      expect(result.tokenUsage.inputTokens).toBe(150);
      expect(result.tokenUsage.outputTokens).toBe(250);
      expect(result.tokenUsage.totalTokens).toBe(400);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should map stop_sequence → stop', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'output' }],
        stop_reason: 'stop_sequence',
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const result = await anthropicAdapter.generateWorkoutDraft(makeCtx());
      expect(result.finishReason).toBe('stop');
    });

    it('should map max_tokens → length', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'truncated' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 100, output_tokens: 2000 },
      });

      const result = await anthropicAdapter.generateWorkoutDraft(makeCtx());
      expect(result.finishReason).toBe('length');
    });

    it('should extract text from multi-block content', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          { type: 'thinking', text: 'internal reasoning' },
          { type: 'text', text: 'the actual output' },
        ],
        stop_reason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 100 },
      });

      const result = await anthropicAdapter.generateWorkoutDraft(makeCtx());
      expect(result.rawText).toBe('the actual output');
    });
  });

  // ── Error normalization ─────────────────────────────────────────────────

  describe('generateWorkoutDraft — errors', () => {
    it('should throw PROVIDER_AUTH when API key missing', async () => {
      vi.stubEnv('ANTHROPIC_API_KEY', '');
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.provider).toBe('anthropic');
      }
    });

    it('should normalize 429 / RateLimitError → PROVIDER_RATE_LIMIT', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('rate limited'), { name: 'RateLimitError', status: 429 }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_RATE_LIMIT');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize 529 / OverloadedError → PROVIDER_UNAVAILABLE', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('overloaded'), { name: 'OverloadedError', status: 529 }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_UNAVAILABLE');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize AuthenticationError → PROVIDER_AUTH', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('auth failed'), { name: 'AuthenticationError', status: 401 }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.retryable).toBe(false);
      }
    });

    it('should normalize APIConnectionError → PROVIDER_NETWORK', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('connection failed'), { name: 'APIConnectionError' }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_NETWORK');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize 500 → PROVIDER_UNAVAILABLE', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('server error'), { status: 500 }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_UNAVAILABLE');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize AbortError → PROVIDER_TIMEOUT', async () => {
      mockAnthropicCreate.mockRejectedValue(
        Object.assign(new Error('aborted'), { name: 'AbortError' }),
      );
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_TIMEOUT');
        expect(err.retryable).toBe(true);
      }
    });

    it('should throw PROVIDER_CONTENT_FILTER for refusal stop_reason', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'I cannot help with that' }],
        stop_reason: 'refusal',
        usage: { input_tokens: 50, output_tokens: 10 },
      });
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_CONTENT_FILTER');
        expect(err.retryable).toBe(false);
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for empty content', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [],
        stop_reason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 0 },
      });
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
        expect(err.provider).toBe('anthropic');
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for no text blocks', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: 'thinking', text: 'internal only' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 50, output_tokens: 0 },
      });
      try {
        await anthropicAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Gemini Adapter
// ═══════════════════════════════════════════════════════════════════════════════

describe('geminiAdapter', () => {
  let geminiAdapter;

  beforeEach(async () => {
    vi.stubEnv('GOOGLE_API_KEY', 'test-key');
    mockGeminiGenerate.mockReset();
    const mod = await import('../../services/ai/adapters/geminiAdapter.mjs');
    geminiAdapter = mod.default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ── isConfigured ────────────────────────────────────────────────────────

  describe('isConfigured', () => {
    it('should return true when GOOGLE_API_KEY is set', () => {
      expect(geminiAdapter.isConfigured()).toBe(true);
    });

    it('should return false when GOOGLE_API_KEY is missing', () => {
      vi.stubEnv('GOOGLE_API_KEY', '');
      expect(geminiAdapter.isConfigured()).toBe(false);
    });
  });

  // ── Success path ────────────────────────────────────────────────────────

  describe('generateWorkoutDraft — success', () => {
    it('should return normalized result on success', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => '{"planName":"Gemini Plan"}',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 160, totalTokenCount: 240 },
        },
      });

      const result = await geminiAdapter.generateWorkoutDraft(makeCtx());

      expect(result.provider).toBe('gemini');
      expect(result.rawText).toBe('{"planName":"Gemini Plan"}');
      expect(result.finishReason).toBe('stop');
      expect(result.tokenUsage.inputTokens).toBe(80);
      expect(result.tokenUsage.outputTokens).toBe(160);
      expect(result.tokenUsage.totalTokens).toBe(240);
      expect(typeof result.latencyMs).toBe('number');
    });

    it('should map MAX_TOKENS → length', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => 'truncated output',
          candidates: [{ finishReason: 'MAX_TOKENS' }],
          usageMetadata: {},
        },
      });

      const result = await geminiAdapter.generateWorkoutDraft(makeCtx());
      expect(result.finishReason).toBe('length');
    });

    it('should populate estimatedCostUsd for gemini-2.0-flash', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => 'output',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 500, totalTokenCount: 1500 },
        },
      });

      const result = await geminiAdapter.generateWorkoutDraft(makeCtx());
      expect(result.tokenUsage.estimatedCostUsd).toBeTypeOf('number');
      expect(result.tokenUsage.estimatedCostUsd).toBeGreaterThan(0);
    });
  });

  // ── Error normalization ─────────────────────────────────────────────────

  describe('generateWorkoutDraft — errors', () => {
    it('should throw PROVIDER_AUTH when API key missing', async () => {
      vi.stubEnv('GOOGLE_API_KEY', '');
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.provider).toBe('gemini');
      }
    });

    it('should normalize 429 → PROVIDER_RATE_LIMIT', async () => {
      mockGeminiGenerate.mockRejectedValue(Object.assign(new Error('rate limit'), { status: 429 }));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_RATE_LIMIT');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize 401 → PROVIDER_AUTH', async () => {
      mockGeminiGenerate.mockRejectedValue(Object.assign(new Error('unauthorized'), { status: 401 }));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_AUTH');
        expect(err.retryable).toBe(false);
      }
    });

    it('should normalize 503 → PROVIDER_UNAVAILABLE', async () => {
      mockGeminiGenerate.mockRejectedValue(Object.assign(new Error('unavailable'), { status: 503 }));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_UNAVAILABLE');
        expect(err.retryable).toBe(true);
      }
    });

    it('should normalize ECONNREFUSED → PROVIDER_NETWORK', async () => {
      mockGeminiGenerate.mockRejectedValue(Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_NETWORK');
        expect(err.retryable).toBe(true);
      }
    });

    it('should throw PROVIDER_CONTENT_FILTER for SAFETY finishReason', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => '',
          candidates: [{ finishReason: 'SAFETY' }],
          usageMetadata: {},
        },
      });
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_CONTENT_FILTER');
        expect(err.retryable).toBe(false);
      }
    });

    it('should throw PROVIDER_CONTENT_FILTER for safety error message', async () => {
      mockGeminiGenerate.mockRejectedValue(new Error('Response was blocked by safety settings'));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_CONTENT_FILTER');
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for empty text', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => '',
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {},
        },
      });
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
        expect(err.provider).toBe('gemini');
      }
    });

    it('should throw PROVIDER_INVALID_RESPONSE for null text', async () => {
      mockGeminiGenerate.mockResolvedValue({
        response: {
          text: () => null,
          candidates: [{ finishReason: 'STOP' }],
          usageMetadata: {},
        },
      });
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
      }
    });

    it('should handle unknown errors gracefully', async () => {
      mockGeminiGenerate.mockRejectedValue(new Error('something weird happened'));
      try {
        await geminiAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('UNKNOWN_PROVIDER_ERROR');
        expect(err.provider).toBe('gemini');
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Venice Adapter
// ═══════════════════════════════════════════════════════════════════════════════

describe('veniceAdapter', () => {
  let veniceAdapter;

  beforeEach(async () => {
    vi.stubEnv('VENICE_API_KEY', 'test-key');
    mockOpenAICreate.mockReset();
    const mod = await import('../../services/ai/adapters/veniceAdapter.mjs');
    veniceAdapter = mod.default;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('isConfigured', () => {
    it('should return true when VENICE_API_KEY is set', () => {
      expect(veniceAdapter.isConfigured()).toBe(true);
    });

    it('should return false when VENICE_API_KEY is missing', () => {
      vi.stubEnv('VENICE_API_KEY', '');
      expect(veniceAdapter.isConfigured()).toBe(false);
    });
  });

  describe('generateWorkoutDraft — success', () => {
    it('should return normalized result on success', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{"planName":"Venice Plan"}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 70, completion_tokens: 140, total_tokens: 210 },
      });

      const result = await veniceAdapter.generateWorkoutDraft(makeCtx());

      expect(result.provider).toBe('venice');
      expect(result.rawText).toBe('{"planName":"Venice Plan"}');
      expect(result.finishReason).toBe('stop');
      expect(result.tokenUsage.inputTokens).toBe(70);
      expect(result.tokenUsage.outputTokens).toBe(140);
      expect(result.tokenUsage.totalTokens).toBe(210);
    });
  });

  describe('generateWorkoutDraft — errors', () => {
    it('should normalize 429 → PROVIDER_RATE_LIMIT', async () => {
      mockOpenAICreate.mockRejectedValue(Object.assign(new Error('rate limit'), { status: 429 }));
      try {
        await veniceAdapter.generateWorkoutDraft(makeCtx());
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.code).toBe('PROVIDER_RATE_LIMIT');
        expect(err.provider).toBe('venice');
      }
    });
  });
});
