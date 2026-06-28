import {
  normalizeFinishReason,
  normalizeTokenUsage,
  requireNonEmptyText,
  withTimeout,
} from '../../ai/adapters/adapterUtils.mjs';

function providerError(code, message, statusCode = null) {
  const err = new Error(message);
  err.provider = 'gemini_cloud';
  err.code = code;
  err.statusCode = statusCode;
  err.retryable = ['PROVIDER_TIMEOUT', 'PROVIDER_NETWORK', 'PROVIDER_RATE_LIMIT'].includes(code);
  return err;
}

const defaultApiKeyResolver = () => [
  process.env.SCHEDULE_AI_GEMINI_API_KEY,
  process.env.GEMINI_API_KEY,
  process.env.GOOGLE_API_KEY,
  process.env.GOOGLE_AI_API_KEY,
].map((value) => String(value || '').trim()).find(Boolean) || '';

export function createScheduleAiGeminiAdapter(options = {}) {
  const apiKeyResolver = options.apiKeyResolver || defaultApiKeyResolver;
  const moduleLoader = options.moduleLoader || (() => import('@google/generative-ai'));
  const modelName = () => options.model || process.env.SCHEDULE_AI_GEMINI_MODEL || process.env.AI_GEMINI_MODEL || 'gemini-2.5-flash';

  return {
    name: 'gemini_cloud',
    isConfigured: () => Boolean(apiKeyResolver()),
    async generateTurn(payload = {}) {
      const apiKey = apiKeyResolver();
      if (!apiKey) throw providerError('PROVIDER_AUTH', 'Gemini API key is not configured');
      const start = Date.now();
      let GoogleGenerativeAI;
      try {
        GoogleGenerativeAI = (await moduleLoader()).GoogleGenerativeAI;
      } catch {
        throw providerError('PROVIDER_AUTH', 'Google Generative AI SDK is not available');
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: modelName(),
        systemInstruction: payload.systemMessage || 'You are SwanStudios schedule AI.',
        generationConfig: { maxOutputTokens: payload.maxOutputTokens || 900, temperature: 0.2 },
      });

      const result = await withTimeout(
        () => model.generateContent({ contents: [{ role: 'user', parts: [{ text: payload.message || '' }] }] }),
        payload.timeoutMs || 7000,
        { parentSignal: payload.signal, provider: 'gemini' },
      ).catch((err) => {
        if (err?.code === 'PROVIDER_TIMEOUT') throw providerError('PROVIDER_TIMEOUT', 'Gemini schedule request timed out');
        throw providerError('PROVIDER_UNAVAILABLE', 'Gemini schedule request failed', err?.status || null);
      });

      const response = result?.response;
      const finishReason = normalizeFinishReason('gemini', response?.candidates?.[0]?.finishReason);
      if (finishReason === 'content_filter') throw providerError('PROVIDER_CONTENT_FILTER', 'Gemini content filter triggered');
      const content = requireNonEmptyText('gemini', typeof response?.text === 'function' ? response.text() : null);
      const usage = response?.usageMetadata || {};

      return {
        provider: 'gemini_cloud',
        model: modelName(),
        content,
        toolCalls: [],
        latencyMs: Date.now() - start,
        finishReason,
        tokenUsage: normalizeTokenUsage(modelName(), {
          inputTokens: usage.promptTokenCount,
          outputTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        }),
      };
    },
  };
}
