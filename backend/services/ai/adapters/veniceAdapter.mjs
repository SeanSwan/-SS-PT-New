/**
 * Venice Provider Adapter
 * =======================
 * Wraps Venice's OpenAI-compatible chat completions API into the
 * provider-agnostic AiProviderAdapter interface.
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

const DEFAULT_MODEL = process.env.AI_VENICE_MODEL || 'llama-3.3-70b';
const DEFAULT_BASE_URL = process.env.AI_VENICE_BASE_URL || 'https://api.venice.ai/api/v1';

/**
 * Normalize Venice SDK/runtime errors into AiProviderError.
 *
 * @param {unknown} err
 * @returns {import('../types.mjs').AiProviderError}
 */
function normalizeVeniceError(err) {
  const status = err?.status ?? err?.statusCode ?? null;
  const message = String(err?.message || '').toLowerCase();

  if (isAbortLikeError(err)) {
    return makeProviderError('venice', 'PROVIDER_TIMEOUT', 'Venice request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  if (status === 429) {
    return makeProviderError('venice', 'PROVIDER_RATE_LIMIT', 'Venice rate limit exceeded', {
      retryable: true,
      statusCode: 429,
    });
  }

  if (status === 401 || status === 403) {
    return makeProviderError('venice', 'PROVIDER_AUTH', 'Venice authentication failed', {
      retryable: false,
      statusCode: status,
    });
  }

  if (isNetworkLikeError(err)) {
    return makeProviderError('venice', 'PROVIDER_NETWORK', 'Network error connecting to Venice', {
      retryable: true,
      statusCode: status,
    });
  }

  if (typeof status === 'number' && status >= 500) {
    return makeProviderError('venice', 'PROVIDER_UNAVAILABLE', 'Venice service unavailable', {
      retryable: true,
      statusCode: status,
    });
  }

  if (message.includes('timeout')) {
    return makeProviderError('venice', 'PROVIDER_TIMEOUT', 'Venice request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  if (message.includes('content_filter') || message.includes('safety') || err?.code === 'content_filter') {
    return makeProviderError('venice', 'PROVIDER_CONTENT_FILTER', 'Venice content filter triggered', {
      retryable: false,
      statusCode: status,
    });
  }

  return makeProviderError('venice', 'UNKNOWN_PROVIDER_ERROR', 'Unexpected Venice error', {
    retryable: false,
    statusCode: status,
  });
}

/** @type {import('../types.mjs').AiProviderAdapter} */
const veniceAdapter = {
  name: 'venice',

  /**
   * Check if VENICE_API_KEY is present.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(process.env.VENICE_API_KEY);
  },

  /**
   * Generate a workout draft via Venice chat completions.
   *
   * @param {import('../types.mjs').AiGenerationContext} ctx
   * @returns {Promise<import('../types.mjs').AiProviderResult>}
   * @throws {import('../types.mjs').AiProviderError}
   */
  async generateWorkoutDraft(ctx) {
    if (!this.isConfigured()) {
      throw makeProviderError('venice', 'PROVIDER_AUTH', 'VENICE_API_KEY is not configured');
    }

    const modelName = ctx.modelPreference || DEFAULT_MODEL;
    const maxTokens = ctx.maxOutputTokens || 2000;
    const timeoutMs = ctx.timeoutMs || Number(process.env.AI_PROVIDER_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS;

    // Lazy-load OpenAI SDK client (Venice exposes OpenAI-compatible endpoints).
    let OpenAI;
    try {
      const openaiModule = await import('openai');
      OpenAI = openaiModule.OpenAI || openaiModule.default;
    } catch {
      throw makeProviderError('venice', 'PROVIDER_AUTH', 'OpenAI SDK not installed');
    }

    const client = new OpenAI({
      apiKey: process.env.VENICE_API_KEY,
      baseURL: DEFAULT_BASE_URL,
    });

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
        { parentSignal: ctx.signal, provider: 'venice' },
      );

      const content = completion.choices?.[0]?.message?.content;
      const rawText = requireNonEmptyText('venice', content);
      const finishReason = normalizeFinishReason('venice', completion.choices?.[0]?.finish_reason);

      const usage = completion.usage || {};
      const tokenUsage = normalizeTokenUsage(modelName, {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      });

      return {
        provider: 'venice',
        model: modelName,
        rawText,
        latencyMs: Date.now() - startMs,
        finishReason,
        tokenUsage,
      };
    } catch (err) {
      if (err?.provider === 'venice' && err?.code) {
        logger.warn('[Venice Adapter] Provider error', {
          code: err.code,
          statusCode: err.statusCode ?? null,
          latencyMs: Date.now() - startMs,
        });
        throw err;
      }

      const normalized = normalizeVeniceError(err);
      logger.warn('[Venice Adapter] Provider error', {
        code: normalized.code,
        statusCode: normalized.statusCode ?? null,
        latencyMs: Date.now() - startMs,
      });
      throw normalized;
    }
  },
};

export default veniceAdapter;
