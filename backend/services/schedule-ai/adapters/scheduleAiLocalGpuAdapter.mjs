import { normalizeTokenUsage, withTimeout } from '../../ai/adapters/adapterUtils.mjs';
import {
  buildScheduleAiAdapterPrompt,
  extractScheduleAiToolCalls,
  normalizeScheduleAiProviderContent,
} from './scheduleAiAdapterParsing.mjs';

function trimSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function providerError(code, message, statusCode = null) {
  const err = new Error(message);
  err.provider = 'local_gpu';
  err.code = code;
  err.statusCode = statusCode;
  err.retryable = ['PROVIDER_TIMEOUT', 'PROVIDER_NETWORK', 'PROVIDER_RATE_LIMIT'].includes(code);
  return err;
}

export function createScheduleAiLocalGpuAdapter(options = {}) {
  const baseUrl = () => trimSlash(options.baseUrl || process.env.SCHEDULE_AI_LOCAL_GPU_URL);
  const model = () => options.model || process.env.SCHEDULE_AI_LOCAL_GPU_MODEL || 'local-schedule-ai';
  const apiKey = () => options.apiKey || process.env.SCHEDULE_AI_LOCAL_GPU_API_KEY || '';
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  return {
    name: 'local_gpu',
    isConfigured: () => Boolean(baseUrl() && model() && fetchImpl),
    async generateTurn(payload = {}) {
      if (!this.isConfigured()) throw providerError('PROVIDER_AUTH', 'Local GPU endpoint is not configured');
      const start = Date.now();
      const url = `${baseUrl()}/chat/completions`;
      const body = {
        model: model(),
        messages: [
          { role: 'system', content: payload.systemMessage || 'You are SwanStudios schedule AI.' },
          { role: 'user', content: buildScheduleAiAdapterPrompt(payload) },
        ],
        temperature: 0.2,
        max_tokens: payload.maxOutputTokens || 900,
        tools: payload.tools || undefined,
      };
      const headers = { 'content-type': 'application/json' };
      if (apiKey()) headers.authorization = `Bearer ${apiKey()}`;

      const response = await withTimeout(
        ({ signal }) => fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal }),
        payload.timeoutMs || 7000,
        { parentSignal: payload.signal, provider: 'openai' },
      ).catch((err) => {
        if (err?.code === 'PROVIDER_TIMEOUT') throw providerError('PROVIDER_TIMEOUT', 'Local GPU request timed out');
        throw providerError('PROVIDER_NETWORK', 'Local GPU request failed');
      });

      if (!response.ok) {
        const status = response.status || null;
        if (status === 429) throw providerError('PROVIDER_RATE_LIMIT', 'Local GPU rate limited', status);
        if (status === 401 || status === 403) throw providerError('PROVIDER_AUTH', 'Local GPU authentication failed', status);
        throw providerError('PROVIDER_UNAVAILABLE', 'Local GPU endpoint unavailable', status);
      }

      const json = await response.json();
      const message = json?.choices?.[0]?.message || {};
      const rawContent = typeof message.content === 'string' ? message.content : '';
      const rawToolCalls = message.tool_calls || message.toolCalls || [];
      const toolCalls = extractScheduleAiToolCalls({
        content: rawContent,
        rawToolCalls,
      });
      if (!rawContent.trim() && !toolCalls.length) {
        throw providerError('PROVIDER_INVALID_RESPONSE', 'Local GPU returned an empty response');
      }
      const content = normalizeScheduleAiProviderContent(rawContent)
        || 'I drafted an option for review; confirm before applying any schedule changes.';

      return {
        provider: 'local_gpu',
        model: json.model || model(),
        content,
        toolCalls,
        latencyMs: Date.now() - start,
        finishReason: json?.choices?.[0]?.finish_reason || 'unknown',
        tokenUsage: normalizeTokenUsage(json.model || model(), {
          inputTokens: json?.usage?.prompt_tokens,
          outputTokens: json?.usage?.completion_tokens,
          totalTokens: json?.usage?.total_tokens,
        }),
      };
    },
  };
}
