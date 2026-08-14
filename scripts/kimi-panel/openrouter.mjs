/**
 * Single-attempt OpenRouter transport for Kimi Panel seats.
 * =========================================================
 * Exactly one fetch is issued. OpenRouter fallbacks are disabled, data-collection endpoints are
 * denied, and provider.max_price carries the same per-million ceilings used by local preflight.
 * This turns price drift into a refusal instead of a silent cap breach. Usage cost returned by
 * OpenRouter is authoritative; a conservative ceiling calculation is retained as a fallback.
 *
 * @module kimi-panel/openrouter
 */
import { redactSecrets } from '../context-gateway/src/egress.mjs';
import { MAX_OUTPUT_TOKENS, estimateWorstCase } from './config.mjs';

export class PanelCallError extends Error {
  constructor(code, message, result = null) {
    super(message);
    this.code = code;
    this.result = result;
  }
}

export async function callOpenRouter({
  seat, prompt, maxTokens, fetchImpl = fetch, env = process.env,
}) {
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > MAX_OUTPUT_TOKENS) {
    throw new PanelCallError('BAD_OUTPUT', 'maxTokens must be at or below 60,000');
  }
  const apiKey = env.OPENROUTER_API_KEY || env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new PanelCallError('NO_KEY', 'OpenRouter API key is required only for a confirmed run');
  const body = {
    model: seat.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature: seat.temperature,
    provider: {
      allow_fallbacks: false,
      data_collection: 'deny',
      sort: 'price',
      max_price: { prompt: seat.priceInPerM, completion: seat.priceOutPerM, request: 0 },
    },
  };
  if (seat.supportsJson) {
    body.response_format = { type: 'json_object' };
    body.provider.require_parameters = true;
  }
  if (seat.supportsEffort) body.reasoning = { effort: 'high' };
  const started = Date.now();
  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}`,
      'X-Title': 'Kimi Panel Runtime',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(seat.timeoutMs),
  });
  if (!response?.ok) {
    const raw = await response?.text?.().catch(() => '') ?? '';
    const safe = redactSecrets(raw.replaceAll(apiKey, '<REDACTED_KEY>')).text.slice(0, 500);
    throw new PanelCallError('TRANSPORT', `OpenRouter ${response?.status ?? 'unknown'}: ${safe}`);
  }
  const data = await response.json();
  const inTok = Number(data.usage?.prompt_tokens) || 0;
  const outTok = Number(data.usage?.completion_tokens) || 0;
  const fallbackCost = estimateWorstCase(seat, inTok * 3, outTok);
  const cost = Number.isFinite(Number(data.usage?.cost)) ? Number(data.usage.cost) : fallbackCost;
  const result = {
    text: redactSecrets(data.choices?.[0]?.message?.content ?? '').text,
    inTok, outTok, cost, wallMs: Date.now() - started,
    model: data.model || seat.model,
    finishReason: data.choices?.[0]?.finish_reason ?? null,
  };
  if (!result.text.trim()) throw new PanelCallError('BAD_OUTPUT', 'OpenRouter returned no visible response', result);
  if (result.finishReason === 'length' || result.finishReason === 'max_tokens') {
    throw new PanelCallError('TRUNCATED', `model reached its ${maxTokens}-token ceiling`, result);
  }
  return result;
}
