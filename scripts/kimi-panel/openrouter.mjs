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
import { MAX_FINDINGS_PER_REVIEW, MAX_OUTPUT_TOKENS, estimateWorstCase } from './config.mjs';

const text = (maxLength) => ({ type: 'string', minLength: 1, maxLength });
const finding = {
  type: 'object', additionalProperties: false,
  properties: {
    path: text(400), startLine: { type: 'integer', minimum: 1, maximum: 10_000_000 },
    endLine: { type: 'integer', minimum: 1, maximum: 10_000_000 }, claim: text(600),
    severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'note'] },
    category: text(80), evidence: text(800),
  },
  required: ['path', 'startLine', 'endLine', 'claim', 'severity', 'category', 'evidence'],
};

const formats = {
  review: {
    name: 'panel_findings', strict: true,
    schema: { type: 'object', additionalProperties: false, properties: {
      findings: { type: 'array', maxItems: MAX_FINDINGS_PER_REVIEW, items: finding },
    }, required: ['findings'] },
  },
  adjudication: {
    name: 'kimi_adjudication', strict: true,
    schema: { type: 'object', additionalProperties: false, properties: {
      overall: { type: 'string', enum: ['CLEAN', 'REVISE', 'NEEDS_PROOF'] },
      verdicts: { type: 'array', items: { type: 'object', additionalProperties: false,
        properties: { findingId: text(64), ruling: { type: 'string', enum: ['REAL', 'NOT_REAL', 'NEEDS_PROOF'] }, rationale: text(1_200) },
        required: ['findingId', 'ruling', 'rationale'] } },
    }, required: ['overall', 'verdicts'] },
  },
  verification: {
    name: 'opus_verification', strict: true,
    schema: { type: 'object', additionalProperties: false, properties: {
      dismissals: { type: 'array', items: { type: 'object', additionalProperties: false,
        properties: { findingId: text(64), verdict: { type: 'string', enum: ['UPHOLD_DISMISSAL', 'REOPEN', 'NEEDS_PROOF'] }, rationale: text(1_200) },
        required: ['findingId', 'verdict', 'rationale'] } },
    }, required: ['dismissals'] },
  },
};

function responseFormat(stage) {
  if (stage === 'adjudication') return formats.adjudication;
  if (stage === 'opus-verify') return formats.verification;
  return formats.review;
}

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
    body.response_format = { type: 'json_schema', json_schema: responseFormat(seat.stage) };
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
