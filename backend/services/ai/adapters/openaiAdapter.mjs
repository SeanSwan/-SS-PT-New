/**
 * OpenAI Provider Adapter
 * =======================
 * Wraps the OpenAI SDK into the provider-agnostic AiProviderAdapter interface.
 * Migrated from the direct SDK call in aiWorkoutController.mjs.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 * Phase 3B — Refactored to use shared adapterUtils helpers
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

const DEFAULT_MODEL = process.env.AI_OPENAI_MODEL || 'gpt-4';

/**
 * Normalize OpenAI SDK/runtime errors into AiProviderError.
 *
 * @param {unknown} err
 * @returns {import('../types.mjs').AiProviderError}
 */
function normalizeOpenAIError(err) {
  const status = err?.status ?? err?.statusCode ?? null;
  const message = String(err?.message || '').toLowerCase();

  if (isAbortLikeError(err)) {
    return makeProviderError('openai', 'PROVIDER_TIMEOUT', 'OpenAI request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  if (status === 429) {
    return makeProviderError('openai', 'PROVIDER_RATE_LIMIT', 'OpenAI rate limit exceeded', {
      retryable: true,
      statusCode: 429,
    });
  }

  if (status === 401 || status === 403) {
    return makeProviderError('openai', 'PROVIDER_AUTH', 'OpenAI authentication failed', {
      retryable: false,
      statusCode: status,
    });
  }

  if (isNetworkLikeError(err)) {
    return makeProviderError('openai', 'PROVIDER_NETWORK', 'Network error connecting to OpenAI', {
      retryable: true,
      statusCode: status,
    });
  }

  if (typeof status === 'number' && status >= 500) {
    return makeProviderError('openai', 'PROVIDER_UNAVAILABLE', 'OpenAI service unavailable', {
      retryable: true,
      statusCode: status,
    });
  }

  // Timeout heuristic (from message text)
  if (message.includes('timeout')) {
    return makeProviderError('openai', 'PROVIDER_TIMEOUT', 'OpenAI request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  // Content filter
  if (message.includes('content_filter') || err?.code === 'content_filter') {
    return makeProviderError('openai', 'PROVIDER_CONTENT_FILTER', 'OpenAI content filter triggered', {
      retryable: false,
      statusCode: status,
    });
  }

  return makeProviderError('openai', 'UNKNOWN_PROVIDER_ERROR', 'Unexpected OpenAI error', {
    retryable: false,
    statusCode: status,
  });
}

/** @type {import('../types.mjs').AiProviderAdapter} */
const openaiAdapter = {
  name: 'openai',

  /**
   * Check if OPENAI_API_KEY is present.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY);
  },

  /**
   * Generate a workout draft via OpenAI chat completions.
   *
   * @param {import('../types.mjs').AiGenerationContext} ctx
   * @returns {Promise<import('../types.mjs').AiProviderResult>}
   * @throws {import('../types.mjs').AiProviderError}
   */
  async generateWorkoutDraft(ctx) {
    if (!this.isConfigured()) {
      throw makeProviderError('openai', 'PROVIDER_AUTH', 'OPENAI_API_KEY is not configured');
    }

    const modelName = ctx.modelPreference || DEFAULT_MODEL;
    const maxTokens = ctx.maxOutputTokens || 2000;
    const timeoutMs = ctx.timeoutMs || Number(process.env.AI_PROVIDER_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS;

    // Lazy-load OpenAI SDK
    let OpenAI;
    try {
      const openaiModule = await import('openai');
      OpenAI = openaiModule.OpenAI || openaiModule.default;
    } catch {
      throw makeProviderError('openai', 'PROVIDER_AUTH', 'OpenAI SDK not installed');
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Use pre-built prompt if provided (e.g. long-horizon), else build workout prompt
    const prompt = ctx.prompt || buildWorkoutPrompt(ctx.deidentifiedPayload, ctx.serverConstraints);
    const systemMessage = ctx.systemMessage || WORKOUT_SYSTEM_MESSAGE;
    const startMs = Date.now();

    try {
      const completion = await withTimeout(
        async ({ signal }) =>
          client.chat.completions.create(
            {
              model: modelName,
              messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: prompt },
              ],
              temperature: 0.7,
              max_tokens: maxTokens,
            },
            { signal },
          ),
        timeoutMs,
        { parentSignal: ctx.signal, provider: 'openai' },
      );

      const content = completion.choices?.[0]?.message?.content;
      const rawText = requireNonEmptyText('openai', content);

      const finishReason = normalizeFinishReason('openai', completion.choices?.[0]?.finish_reason);

      const usage = completion.usage || {};
      const tokenUsage = normalizeTokenUsage(modelName, {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      });

      return {
        provider: 'openai',
        model: modelName,
        rawText,
        latencyMs: Date.now() - startMs,
        finishReason,
        tokenUsage,
      };
    } catch (err) {
      // Pass through already-normalized provider errors
      if (err?.provider === 'openai' && err?.code) {
        logger.warn('[OpenAI Adapter] Provider error', {
          code: err.code,
          statusCode: err.statusCode ?? null,
          latencyMs: Date.now() - startMs,
        });
        throw err;
      }

      const normalized = normalizeOpenAIError(err);
      logger.warn('[OpenAI Adapter] Provider error', {
        code: normalized.code,
        statusCode: normalized.statusCode ?? null,
        latencyMs: Date.now() - startMs,
      });
      throw normalized;
    }
  },
};

export default openaiAdapter;
