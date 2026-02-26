/**
 * Google Gemini Provider Adapter
 * ==============================
 * Wraps the @google/generative-ai SDK into the provider-agnostic AiProviderAdapter interface.
 *
 * Timeout strategy: uses withTimeout() wrapper with Promise.race — does NOT rely
 * on SDK AbortSignal support, which may be inconsistent across SDK versions.
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

const DEFAULT_MODEL = process.env.AI_GEMINI_MODEL || 'gemini-2.0-flash';

/**
 * Normalize Gemini SDK/runtime errors into AiProviderError.
 *
 * @param {unknown} err
 * @returns {import('../types.mjs').AiProviderError}
 */
function normalizeGeminiError(err) {
  const status = err?.status ?? err?.statusCode ?? err?.response?.status ?? null;
  const message = String(err?.message || '').toLowerCase();

  if (isAbortLikeError(err)) {
    return makeProviderError('gemini', 'PROVIDER_TIMEOUT', 'Gemini request timed out', {
      retryable: true,
      statusCode: status,
    });
  }

  if (status === 429) {
    return makeProviderError('gemini', 'PROVIDER_RATE_LIMIT', 'Gemini rate limit exceeded', {
      retryable: true,
      statusCode: 429,
    });
  }

  if (status === 401 || status === 403) {
    return makeProviderError('gemini', 'PROVIDER_AUTH', 'Gemini authentication failed', {
      retryable: false,
      statusCode: status,
    });
  }

  if (isNetworkLikeError(err)) {
    return makeProviderError('gemini', 'PROVIDER_NETWORK', 'Network error connecting to Gemini', {
      retryable: true,
      statusCode: status,
    });
  }

  if (typeof status === 'number' && status >= 500) {
    return makeProviderError('gemini', 'PROVIDER_UNAVAILABLE', 'Gemini service unavailable', {
      retryable: true,
      statusCode: status,
    });
  }

  if (message.includes('safety') || message.includes('blocked') || message.includes('content filter')) {
    return makeProviderError('gemini', 'PROVIDER_CONTENT_FILTER', 'Gemini content filter triggered', {
      retryable: false,
      statusCode: status,
    });
  }

  return makeProviderError('gemini', 'UNKNOWN_PROVIDER_ERROR', 'Unexpected Gemini error', {
    retryable: false,
    statusCode: status,
  });
}

/** @type {import('../types.mjs').AiProviderAdapter} */
const geminiAdapter = {
  name: 'gemini',

  /**
   * Check if GOOGLE_API_KEY is present.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(process.env.GOOGLE_API_KEY);
  },

  /**
   * Generate a workout draft via Google Generative AI.
   *
   * @param {import('../types.mjs').AiGenerationContext} ctx
   * @returns {Promise<import('../types.mjs').AiProviderResult>}
   * @throws {import('../types.mjs').AiProviderError}
   */
  async generateWorkoutDraft(ctx) {
    if (!this.isConfigured()) {
      throw makeProviderError('gemini', 'PROVIDER_AUTH', 'GOOGLE_API_KEY is not configured');
    }

    const modelName = ctx.modelPreference || DEFAULT_MODEL;
    const maxTokens = ctx.maxOutputTokens || 2000;
    const timeoutMs = ctx.timeoutMs || Number(process.env.AI_PROVIDER_TIMEOUT_MS) || DEFAULT_PROVIDER_TIMEOUT_MS;

    // Lazy-load Google Generative AI SDK
    let GoogleGenerativeAI;
    try {
      const mod = await import('@google/generative-ai');
      GoogleGenerativeAI = mod.GoogleGenerativeAI;
    } catch {
      throw makeProviderError('gemini', 'PROVIDER_AUTH', 'Google Generative AI SDK not installed');
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    // Use pre-built system message if provided (e.g. long-horizon), else workout default
    const systemMessage = ctx.systemMessage || WORKOUT_SYSTEM_MESSAGE;
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemMessage,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    });

    // Use pre-built prompt if provided (e.g. long-horizon), else build workout prompt
    const prompt = ctx.prompt || buildWorkoutPrompt(ctx.deidentifiedPayload, ctx.serverConstraints);
    const startMs = Date.now();

    try {
      const result = await withTimeout(
        async () =>
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
          }),
        timeoutMs,
        { parentSignal: ctx.signal, provider: 'gemini' },
      );

      const response = result?.response;

      // Check for safety-blocked candidates before extracting text
      const finishReason = normalizeFinishReason('gemini', response?.candidates?.[0]?.finishReason);
      if (finishReason === 'content_filter') {
        throw makeProviderError('gemini', 'PROVIDER_CONTENT_FILTER', 'Gemini safety filter blocked response');
      }

      // Extract text — response.text() is a convenience method
      const textContent = typeof response?.text === 'function' ? response.text() : null;
      const rawText = requireNonEmptyText('gemini', textContent);

      const usageMetadata = response?.usageMetadata;
      const tokenUsage = normalizeTokenUsage(modelName, {
        inputTokens: usageMetadata?.promptTokenCount,
        outputTokens: usageMetadata?.candidatesTokenCount,
        totalTokens: usageMetadata?.totalTokenCount,
      });

      return {
        provider: 'gemini',
        model: modelName,
        rawText,
        latencyMs: Date.now() - startMs,
        finishReason,
        tokenUsage,
      };
    } catch (err) {
      // Pass through already-normalized provider errors
      if (err?.provider === 'gemini' && err?.code) {
        logger.warn('[Gemini Adapter] Provider error', {
          code: err.code,
          statusCode: err.statusCode ?? null,
          latencyMs: Date.now() - startMs,
        });
        throw err;
      }

      const normalized = normalizeGeminiError(err);
      logger.warn('[Gemini Adapter] Provider error', {
        code: normalized.code,
        statusCode: normalized.statusCode ?? null,
        latencyMs: Date.now() - startMs,
      });
      throw normalized;
    }
  },
};

export default geminiAdapter;
