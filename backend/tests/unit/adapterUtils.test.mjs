/**
 * Adapter Utilities — Unit Tests
 * ===============================
 * Tests for shared normalization helpers used by all provider adapters.
 * TDD-first: these run before adapter implementation.
 *
 * Phase 3B — Provider Router Completion
 */
import { describe, it, expect, vi } from 'vitest';
import {
  makeProviderError,
  isAbortLikeError,
  isNetworkLikeError,
  safeString,
  normalizeFinishReason,
  normalizeTokenUsage,
  requireNonEmptyText,
  withTimeout,
} from '../../services/ai/adapters/adapterUtils.mjs';
import { estimateCost, MODEL_COSTS } from '../../services/ai/costConfig.mjs';

// ── makeProviderError ──────────────────────────────────────────────────────

describe('makeProviderError', () => {
  it('should produce correct shape with defaults', () => {
    const err = makeProviderError('openai', 'PROVIDER_TIMEOUT', 'Timed out');
    expect(err).toEqual({
      provider: 'openai',
      code: 'PROVIDER_TIMEOUT',
      message: 'Timed out',
      retryable: false,
      statusCode: null,
    });
  });

  it('should accept retryable and statusCode opts', () => {
    const err = makeProviderError('anthropic', 'PROVIDER_RATE_LIMIT', 'Rate limited', {
      retryable: true,
      statusCode: 429,
    });
    expect(err.retryable).toBe(true);
    expect(err.statusCode).toBe(429);
  });

  it('should default message for empty input', () => {
    const err = makeProviderError('gemini', 'UNKNOWN_PROVIDER_ERROR', '');
    expect(err.message).toBe('Provider error');
  });
});

// ── isAbortLikeError ───────────────────────────────────────────────────────

describe('isAbortLikeError', () => {
  it('should detect AbortError by name', () => {
    expect(isAbortLikeError({ name: 'AbortError' })).toBe(true);
  });

  it('should detect ABORT_ERR code', () => {
    expect(isAbortLikeError({ code: 'ABORT_ERR' })).toBe(true);
  });

  it('should detect "aborted" in message', () => {
    expect(isAbortLikeError({ message: 'The operation was aborted' })).toBe(true);
  });

  it('should return false for unrelated errors', () => {
    expect(isAbortLikeError({ name: 'Error', message: 'Something else' })).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isAbortLikeError(null)).toBe(false);
    expect(isAbortLikeError(undefined)).toBe(false);
  });
});

// ── isNetworkLikeError ─────────────────────────────────────────────────────

describe('isNetworkLikeError', () => {
  it.each([
    'ECONNREFUSED',
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'EAI_AGAIN',
  ])('should detect %s', (code) => {
    expect(isNetworkLikeError({ code })).toBe(true);
  });

  it('should detect system type', () => {
    expect(isNetworkLikeError({ type: 'system' })).toBe(true);
  });

  it('should return false for unrelated errors', () => {
    expect(isNetworkLikeError({ code: 'SOMETHING_ELSE' })).toBe(false);
  });

  it('should return false for null/undefined', () => {
    expect(isNetworkLikeError(null)).toBe(false);
  });
});

// ── safeString ─────────────────────────────────────────────────────────────

describe('safeString', () => {
  it('should return trimmed string', () => {
    expect(safeString('  hello  ')).toBe('hello');
  });

  it('should return null for empty string', () => {
    expect(safeString('')).toBeNull();
    expect(safeString('   ')).toBeNull();
  });

  it('should return null for non-strings', () => {
    expect(safeString(null)).toBeNull();
    expect(safeString(undefined)).toBeNull();
    expect(safeString(42)).toBeNull();
  });
});

// ── normalizeFinishReason ──────────────────────────────────────────────────

describe('normalizeFinishReason', () => {
  describe('openai', () => {
    it('should map stop → stop', () => {
      expect(normalizeFinishReason('openai', 'stop')).toBe('stop');
    });
    it('should map length → length', () => {
      expect(normalizeFinishReason('openai', 'length')).toBe('length');
    });
    it('should map content_filter → content_filter', () => {
      expect(normalizeFinishReason('openai', 'content_filter')).toBe('content_filter');
    });
    it('should map unknown values → unknown', () => {
      expect(normalizeFinishReason('openai', 'other')).toBe('unknown');
    });
  });

  describe('anthropic', () => {
    it('should map end_turn → stop', () => {
      expect(normalizeFinishReason('anthropic', 'end_turn')).toBe('stop');
    });
    it('should map stop_sequence → stop', () => {
      expect(normalizeFinishReason('anthropic', 'stop_sequence')).toBe('stop');
    });
    it('should map tool_use → stop', () => {
      expect(normalizeFinishReason('anthropic', 'tool_use')).toBe('stop');
    });
    it('should map max_tokens → length', () => {
      expect(normalizeFinishReason('anthropic', 'max_tokens')).toBe('length');
    });
    it('should map refusal → content_filter', () => {
      expect(normalizeFinishReason('anthropic', 'refusal')).toBe('content_filter');
    });
    it('should map unknown values → unknown', () => {
      expect(normalizeFinishReason('anthropic', 'pause_turn')).toBe('unknown');
    });
  });

  describe('gemini', () => {
    it('should map STOP → stop', () => {
      expect(normalizeFinishReason('gemini', 'STOP')).toBe('stop');
    });
    it('should map MAX_TOKENS → length', () => {
      expect(normalizeFinishReason('gemini', 'MAX_TOKENS')).toBe('length');
    });
    it('should map SAFETY → content_filter', () => {
      expect(normalizeFinishReason('gemini', 'SAFETY')).toBe('content_filter');
    });
    it('should map RECITATION → content_filter', () => {
      expect(normalizeFinishReason('gemini', 'RECITATION')).toBe('content_filter');
    });
    it('should map unknown values → unknown', () => {
      expect(normalizeFinishReason('gemini', 'OTHER')).toBe('unknown');
    });
    it('should be case-insensitive', () => {
      expect(normalizeFinishReason('gemini', 'stop')).toBe('stop');
    });
  });

  it('should return unknown for null/undefined', () => {
    expect(normalizeFinishReason('openai', null)).toBe('unknown');
    expect(normalizeFinishReason('anthropic', undefined)).toBe('unknown');
  });

  it('should return unknown for unrecognized provider', () => {
    expect(normalizeFinishReason('unknown_provider', 'stop')).toBe('unknown');
  });
});

// ── normalizeTokenUsage ────────────────────────────────────────────────────

describe('normalizeTokenUsage', () => {
  it('should normalize valid token counts', () => {
    const result = normalizeTokenUsage('gpt-4', {
      inputTokens: 100,
      outputTokens: 200,
      totalTokens: 300,
    });
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(200);
    expect(result.totalTokens).toBe(300);
  });

  it('should compute totalTokens when missing', () => {
    const result = normalizeTokenUsage('gpt-4', {
      inputTokens: 100,
      outputTokens: 200,
    });
    expect(result.totalTokens).toBe(300);
  });

  it('should return nulls for missing values', () => {
    const result = normalizeTokenUsage('gpt-4', {});
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
    expect(result.totalTokens).toBeNull();
  });

  it('should return nulls for undefined usage', () => {
    const result = normalizeTokenUsage('gpt-4');
    expect(result.inputTokens).toBeNull();
    expect(result.outputTokens).toBeNull();
    expect(result.totalTokens).toBeNull();
    expect(result.estimatedCostUsd).toBeNull();
  });

  it('should populate estimatedCostUsd for known models', () => {
    const result = normalizeTokenUsage('gpt-4', {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(result.estimatedCostUsd).toBeCloseTo(0.03 + 0.03, 6);
  });

  it('should return null estimatedCostUsd for unknown models', () => {
    const result = normalizeTokenUsage('unknown-model', {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(result.estimatedCostUsd).toBeNull();
  });
});

// ── estimateCost (from costConfig) ─────────────────────────────────────────

describe('estimateCost', () => {
  it('should calculate cost for gpt-4', () => {
    const cost = estimateCost('gpt-4', 1000, 1000);
    // 1k input * 0.03 + 1k output * 0.06 = 0.09
    expect(cost).toBeCloseTo(0.09, 6);
  });

  it('should calculate cost for claude-sonnet-4-6', () => {
    const cost = estimateCost('claude-sonnet-4-6', 1000, 1000);
    // 1k * 0.003 + 1k * 0.015 = 0.018
    expect(cost).toBeCloseTo(0.018, 6);
  });

  it('should calculate cost for gemini-2.0-flash', () => {
    const cost = estimateCost('gemini-2.0-flash', 1000, 1000);
    // 1k * 0.0001 + 1k * 0.0004 = 0.0005
    expect(cost).toBeCloseTo(0.0005, 6);
  });

  it('should return null for unknown model', () => {
    expect(estimateCost('made-up-model', 1000, 1000)).toBeNull();
  });

  it('should return null for null tokens', () => {
    expect(estimateCost('gpt-4', null, null)).toBeNull();
  });

  it('should handle partial tokens (input only)', () => {
    const cost = estimateCost('gpt-4', 1000, null);
    expect(cost).toBeCloseTo(0.03, 6);
  });
});

// ── requireNonEmptyText ────────────────────────────────────────────────────

describe('requireNonEmptyText', () => {
  it('should return trimmed text for valid string', () => {
    expect(requireNonEmptyText('openai', '  Hello world  ')).toBe('Hello world');
  });

  it('should throw PROVIDER_INVALID_RESPONSE for null', () => {
    expect(() => requireNonEmptyText('openai', null)).toThrow();
    try {
      requireNonEmptyText('openai', null);
    } catch (err) {
      expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
      expect(err.provider).toBe('openai');
    }
  });

  it('should throw PROVIDER_INVALID_RESPONSE for empty string', () => {
    expect(() => requireNonEmptyText('anthropic', '')).toThrow();
    try {
      requireNonEmptyText('anthropic', '');
    } catch (err) {
      expect(err.code).toBe('PROVIDER_INVALID_RESPONSE');
      expect(err.provider).toBe('anthropic');
    }
  });

  it('should throw PROVIDER_INVALID_RESPONSE for whitespace-only', () => {
    expect(() => requireNonEmptyText('gemini', '   ')).toThrow();
  });

  it('should throw PROVIDER_INVALID_RESPONSE for non-string', () => {
    expect(() => requireNonEmptyText('openai', 42)).toThrow();
    expect(() => requireNonEmptyText('openai', undefined)).toThrow();
  });
});

// ── withTimeout ────────────────────────────────────────────────────────────

describe('withTimeout', () => {
  it('should resolve when task completes before timeout', async () => {
    const result = await withTimeout(
      async () => 'done',
      5000,
      { provider: 'openai' },
    );
    expect(result).toBe('done');
  });

  it('should throw PROVIDER_TIMEOUT when task exceeds timeout', async () => {
    try {
      await withTimeout(
        async () => new Promise((resolve) => setTimeout(resolve, 5000)),
        50,
        { provider: 'anthropic' },
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.code).toBe('PROVIDER_TIMEOUT');
      expect(err.provider).toBe('anthropic');
      expect(err.retryable).toBe(true);
    }
  });

  it('should pass signal to taskFactory', async () => {
    let receivedSignal = null;
    await withTimeout(
      async ({ signal }) => {
        receivedSignal = signal;
        return 'ok';
      },
      5000,
      { provider: 'gemini' },
    );
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it('should propagate non-timeout errors', async () => {
    try {
      await withTimeout(
        async () => { throw new Error('SDK error'); },
        5000,
        { provider: 'openai' },
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.message).toBe('SDK error');
      expect(err.code).toBeUndefined();
    }
  });

  it('should abort if parentSignal is already aborted', async () => {
    const ac = new AbortController();
    ac.abort();

    try {
      await withTimeout(
        async ({ signal }) => {
          // Check if signal was already aborted
          if (signal.aborted) throw Object.assign(new Error('aborted'), { name: 'AbortError' });
          return 'should not reach';
        },
        5000,
        { parentSignal: ac.signal, provider: 'openai' },
      );
      expect.unreachable('Should have thrown');
    } catch (err) {
      expect(err.code).toBe('PROVIDER_TIMEOUT');
    }
  });
});
