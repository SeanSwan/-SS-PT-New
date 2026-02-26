/**
 * Anthropic Provider Adapter
 * ==========================
 * Wraps the Anthropic SDK into the provider-agnostic AiProviderAdapter interface.
 *
 * Phase 3B — Provider Router Completion (Smart Workout Logger)
 */
import logger from '../../../utils/logger.mjs';
import { buildWorkoutPrompt, WORKOUT_SYSTEM_MESSAGE } from '../promptBuilder.mjs';
import { DEFAULT_PROVIDER_TIMEOUT_MS } from '../types.mjs';
import {
  makeProviderError,
  isAbortLikeError,
  isNetworkLikeError,
  normalizeFinishReason,
  normalizeTokenUsage,
  withTimeout,
  requireNonEmptyText,
} from './adapterUtils.mjs';

const DEFAULT_MODEL = process.env.AI_ANTHROPIC_MODEL || 'claude-sonnet-4-6';

/**
 * Normalize Anthropic SDK/runtime errors into AiProviderError.
 * Prefers status-code + name checks to avoid tight coupling to SDK internals.
 *
 * @param {unknown} err
 * @returns {import('../types.mjs').AiProviderError}
 */
function normalizeAnthropicError(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status ?? null;
  const name = err?.name || '';
  const message = String(err?.message || '').toLowerCase();

  if (isAbortLikeError(err)) {
    return makeProviderError('anthropic', 'PROVIDER_TIMEOUT', 'Anthropic request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  if (status === 429 || name === 'RateLimitError') {
    return makeProviderError('anthropic', 'PROVIDER_RATE_LIMIT', 'Anthropic rate limit exceeded', {
      retryable: true,
      statusCode: 429,
    });
  }

  if (status === 529 || name === 'OverloadedError') {
    return makeProviderError('anthropic', 'PROVIDER_UNAVAILABLE', 'Anthropic service overloaded', {
      retryable: true,
      statusCode: 529,
    });
  }

  if (status === 401 || status === 403 || name === 'AuthenticationError') {
    return makeProviderError('anthropic', 'PROVIDER_AUTH', 'Anthropic authentication failed', {
      retryable: false,
      statusCode: status ?? 401,
    });
  }

  if (name === 'APIConnectionError' || isNetworkLikeError(err)) {
    return makeProviderError('anthropic', 'PROVIDER_NETWORK', 'Network error connecting to Anthropic', {
      retryable: true,
      statusCode: status,
    });
  }

  if ((typeof status === 'number' && status >= 500) || name === 'APIError') {
    return makeProviderError('anthropic', 'PROVIDER_UNAVAILABLE', 'Anthropic service unavailable', {
      retryable: true,
      statusCode: status,
    });
  }

  if (message.includes('refusal') || message.includes('content filter') || message.includes('safety')) {
    return makeProviderError('anthropic', 'PROVIDER_CONTENT_FILTER', 'Anthropic content filter triggered', {
      retryable: false,
      statusCode: status,
    });
  }

  return makeProviderError('anthropic', 'UNKNOWN_PROVIDER_ERROR', 'Unexpected Anthropic error', {
    retryable: false,
    statusCode: status,
  });
}

/**
 * Extract the first text block from an Anthropic messages API response.
 * @param {any} message
 * @returns {string | null}
 */
function extractTextFromMessage(message) {
  if (!message || !Array.isArray(message.content)) return null;
  const textBlock = message.content.find(
    (part) => part && part.type === 'text' && typeof part.text === 'string',
  );
  return textBlock?.text ?? null;
}

/** @type {import('../types.mjs').AiProviderAdapter} */
const anthropicAdapter = {
  name: 'anthropic',

  /**
   * Check if ANTHROPIC_API_KEY is present.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  /**
   * Generate a workout draft via Anthropic Messages API.
   *
   * @param {import('../types.mjs').AiGenerationContext} ctx
   * @returns {Promise<import('../types.mjs').AiProviderResult>}
   * @throws {import('../types.mjs').AiProviderError}
   */
  async generateWorkoutDraft(ctx) {
    if (!this.isConfigured()) {
      throw makeProviderError('anthropic', 'PROVIDER_AUTH', 'ANTHROPIC_API_KEY is not configured');
    }

    const model = ctx.modelPreference || DEFAULT_MODEL;
    const maxTokens = ctx.maxOutputTokens || 2000;
    const timeoutMs = ctx.timeoutMs || Number(process.env.AI_PROVIDER_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS;

    // Lazy-load Anthropic SDK
    let Anthropic;
    try {
      const mod = await import('@anthropic-ai/sdk');
      Anthropic = mod.default || mod.Anthropic;
    } catch {
      throw makeProviderError('anthropic', 'PROVIDER_AUTH', 'Anthropic SDK not installed');
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    // Use pre-built prompt if provided (e.g. long-horizon), else build workout prompt
    const prompt = ctx.prompt || buildWorkoutPrompt(ctx.deidentifiedPayload, ctx.serverConstraints);
    const systemMessage = ctx.systemMessage || WORKOUT_SYSTEM_MESSAGE;

    const startMs = Date.now();

    try {
      const message = await withTimeout(
        async ({ signal }) =>
          client.messages.create(
            {
              model,
              max_tokens: maxTokens,
              system: systemMessage,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
            },
            { signal },
          ),
        timeoutMs,
        { parentSignal: ctx.signal, provider: 'anthropic' },
      );

      const rawText = requireNonEmptyText('anthropic', extractTextFromMessage(message));
      const finishReason = normalizeFinishReason('anthropic', message?.stop_reason);

      // Treat explicit refusal as content filter
      if (finishReason === 'content_filter') {
        throw makeProviderError('anthropic', 'PROVIDER_CONTENT_FILTER', 'Anthropic refusal/content filter triggered');
      }

      const tokenUsage = normalizeTokenUsage(model, {
        inputTokens: message?.usage?.input_tokens,
        outputTokens: message?.usage?.output_tokens,
      });

      return {
        provider: 'anthropic',
        model,
        rawText,
        latencyMs: Date.now() - startMs,
        finishReason,
        tokenUsage,
      };
    } catch (err) {
      // Pass through already-normalized provider errors
      if (err?.provider === 'anthropic' && err?.code) {
        logger.warn('[Anthropic Adapter] Provider error', {
          code: err.code,
          statusCode: err.statusCode ?? null,
          latencyMs: Date.now() - startMs,
        });
        throw err;
      }

      const normalized = normalizeAnthropicError(err);
      logger.warn('[Anthropic Adapter] Provider error', {
        code: normalized.code,
        statusCode: normalized.statusCode ?? null,
        latencyMs: Date.now() - startMs,
      });
      throw normalized;
    }
  },
};

export default anthropicAdapter;
