/**
 * AI Provider Model Cost Configuration
 * =====================================
 * Static cost-per-token config used by adapters to populate estimatedCostUsd.
 *
 * PRICING IS APPROXIMATE — these are estimates based on published provider pricing
 * and may change at any time. Production systems should refresh periodically.
 *
 * Sources:
 *   - OpenAI:    https://openai.com/pricing
 *   - Anthropic: https://www.anthropic.com/pricing
 *   - Google:    https://ai.google.dev/pricing
 *
 * Last verified: 2026-02-24
 * Owner: update when adding models or when pricing changes
 *
 * Phase 3B — Provider Router Completion (Smart Workout Logger)
 */

/**
 * Cost per 1,000 tokens (input and output) by model ID.
 * @type {Record<string, { inputPer1k: number, outputPer1k: number }>}
 */
export const MODEL_COSTS = {
  // OpenAI
  'gpt-4':              { inputPer1k: 0.03,    outputPer1k: 0.06 },
  'gpt-4o':             { inputPer1k: 0.005,   outputPer1k: 0.015 },
  'gpt-4o-mini':        { inputPer1k: 0.00015, outputPer1k: 0.0006 },

  // Anthropic
  'claude-sonnet-4-6':  { inputPer1k: 0.003,   outputPer1k: 0.015 },
  'claude-haiku-4-5':   { inputPer1k: 0.0008,  outputPer1k: 0.004 },
  'claude-opus-4-6':    { inputPer1k: 0.015,   outputPer1k: 0.075 },

  // Google
  'gemini-2.0-flash':   { inputPer1k: 0.0001,  outputPer1k: 0.0004 },
  'gemini-1.5-pro':     { inputPer1k: 0.00125, outputPer1k: 0.005 },

  // Venice (OpenAI-compatible, Llama models)
  'llama-3.3-70b':      { inputPer1k: 0.00059, outputPer1k: 0.00079 },
};

/**
 * Estimate the cost in USD for a given model and token counts.
 *
 * @param {string} model - Model identifier (e.g. 'gpt-4', 'claude-sonnet-4-6')
 * @param {number|null} inputTokens
 * @param {number|null} outputTokens
 * @returns {number|null} Estimated cost in USD, or null if model unknown or tokens missing
 */
export function estimateCost(model, inputTokens, outputTokens) {
  if (!model || typeof model !== 'string') return null;

  const config = MODEL_COSTS[model];
  if (!config) return null;

  const inT = Number.isFinite(inputTokens) ? inputTokens : null;
  const outT = Number.isFinite(outputTokens) ? outputTokens : null;

  if (inT == null && outT == null) return null;

  const inputCost = inT != null ? (inT / 1000) * config.inputPer1k : 0;
  const outputCost = outT != null ? (outT / 1000) * config.outputPer1k : 0;

  return inputCost + outputCost;
}
