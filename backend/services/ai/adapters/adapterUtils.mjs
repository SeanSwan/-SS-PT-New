/**
 * Shared Adapter Utilities
 * ========================
 * Normalization helpers used by all provider adapters (OpenAI, Anthropic, Gemini, Venice)
 * to prevent drift in error handling, finish reasons, token usage, and timeouts.
 *
 * Design principle: keep provider-specific SDK class checks INSIDE each adapter.
 * These helpers only normalize the FINAL shape of errors, tokens, and timeouts.
 *
 * Phase 3B — Provider Router Completion (Smart Workout Logger)
 */
import { estimateCost } from '../costConfig.mjs';

// ── Error Construction ──────────────────────────────────────────────────────

/**
 * Create a normalized AiProviderError.
 *
 * @param {'openai'|'anthropic'|'gemini'|'venice'} provider
 * @param {import('../types.mjs').AiProviderErrorCode} code
 * @param {string} message - Sanitized message (no raw SDK dumps)
 * @param {{
 *   retryable?: boolean,
 *   statusCode?: number | null,
 * }} [opts]
 * @returns {import('../types.mjs').AiProviderError}
 */
export function makeProviderError(provider, code, message, opts = {}) {
  return {
    provider,
    code,
    message: String(message || 'Provider error'),
    retryable: Boolean(opts.retryable),
    statusCode: Number.isInteger(opts.statusCode) ? opts.statusCode : null,
  };
}

// ── Error Detection ─────────────────────────────────────────────────────────

/**
 * Detect timeout/cancellation errors across SDKs and runtimes.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isAbortLikeError(err) {
  if (!err) return false;
  const name = err.name;
  const code = err.code;
  const msg = String(err.message || '').toLowerCase();
  return name === 'AbortError' || code === 'ABORT_ERR' || msg.includes('aborted');
}

/**
 * Detect transport/connectivity failures.
 * @param {unknown} err
 * @returns {boolean}
 */
export function isNetworkLikeError(err) {
  if (!err) return false;
  const code = err.code;
  const type = err.type;
  return (
    ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)
    || type === 'system'
  );
}

// ── String Utilities ────────────────────────────────────────────────────────

/**
 * Normalize optional strings — returns trimmed string or null.
 * @param {unknown} value
 * @returns {string|null}
 */
export function safeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

// ── Finish Reason Normalization ─────────────────────────────────────────────

/**
 * Map provider-specific finish reasons to shared canonical values.
 *
 * Canonical values: 'stop' | 'length' | 'content_filter' | 'unknown'
 *
 * @param {'openai'|'anthropic'|'gemini'|'venice'} provider
 * @param {string | null | undefined} rawReason
 * @returns {'stop'|'length'|'content_filter'|'unknown'}
 */
export function normalizeFinishReason(provider, rawReason) {
  const r = safeString(rawReason);
  if (!r) return 'unknown';

  if (provider === 'openai') {
    if (r === 'stop') return 'stop';
    if (r === 'length') return 'length';
    if (r === 'content_filter') return 'content_filter';
    return 'unknown';
  }

  if (provider === 'anthropic') {
    if (r === 'end_turn' || r === 'stop_sequence' || r === 'tool_use') return 'stop';
    if (r === 'max_tokens') return 'length';
    if (r === 'refusal') return 'content_filter';
    return 'unknown';
  }

  if (provider === 'gemini') {
    const u = r.toUpperCase();
    if (u === 'STOP') return 'stop';
    if (u === 'MAX_TOKENS') return 'length';
    if (u === 'SAFETY' || u === 'RECITATION') return 'content_filter';
    return 'unknown';
  }

  if (provider === 'venice') {
    if (r === 'stop') return 'stop';
    if (r === 'length') return 'length';
    if (r === 'content_filter') return 'content_filter';
    return 'unknown';
  }

  return 'unknown';
}

// ── Token Usage Normalization ───────────────────────────────────────────────

/**
 * Normalize provider-specific token usage into AiTokenUsage.
 * Computes totalTokens from input+output if not provided.
 * Calls estimateCost() to populate estimatedCostUsd.
 *
 * @param {string} model - Model identifier for cost lookup
 * @param {{
 *   inputTokens?: number | null,
 *   outputTokens?: number | null,
 *   totalTokens?: number | null,
 * }} [usage]
 * @returns {import('../types.mjs').AiTokenUsage}
 */
export function normalizeTokenUsage(model, { inputTokens = null, outputTokens = null, totalTokens = null } = {}) {
  const inT = inputTokens != null && Number.isFinite(Number(inputTokens)) ? Number(inputTokens) : null;
  const outT = outputTokens != null && Number.isFinite(Number(outputTokens)) ? Number(outputTokens) : null;
  let total = totalTokens != null && Number.isFinite(Number(totalTokens)) ? Number(totalTokens) : null;

  if (total == null && inT != null && outT != null) {
    total = inT + outT;
  }

  return {
    inputTokens: inT,
    outputTokens: outT,
    totalTokens: total,
    estimatedCostUsd: estimateCost(model, inT, outT),
  };
}

// ── Response Validation ─────────────────────────────────────────────────────

/**
 * Validate that provider output text is a non-empty string.
 * Throws PROVIDER_INVALID_RESPONSE if empty or not a string.
 *
 * @param {'openai'|'anthropic'|'gemini'|'venice'} provider
 * @param {unknown} rawText
 * @returns {string} Trimmed text
 * @throws {import('../types.mjs').AiProviderError}
 */
export function requireNonEmptyText(provider, rawText) {
  if (typeof rawText !== 'string') {
    throw makeProviderError(provider, 'PROVIDER_INVALID_RESPONSE', `${provider} returned non-text response`);
  }
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw makeProviderError(provider, 'PROVIDER_INVALID_RESPONSE', `Empty response from ${provider}`);
  }
  return trimmed;
}

// ── Timeout Wrapper ─────────────────────────────────────────────────────────

/**
 * Run an async task with timeout and optional parent signal integration.
 * Uses AbortController + Promise.race to guarantee timeout behavior
 * even if the SDK does not support abort signals.
 *
 * TODO: If the SDK ignores the abort signal, the underlying HTTP request
 * may continue running in the background after timeout. This is acceptable
 * for MVP but should be monitored in production (ops debugging).
 *
 * @template T
 * @param {(ctx: { signal: AbortSignal }) => Promise<T>} taskFactory
 * @param {number} timeoutMs
 * @param {{
 *   parentSignal?: AbortSignal,
 *   provider?: 'openai'|'anthropic'|'gemini'|'venice',
 * }} [opts]
 * @returns {Promise<T>}
 * @throws {import('../types.mjs').AiProviderError}
 */
export async function withTimeout(taskFactory, timeoutMs, opts = {}) {
  const ac = new AbortController();
  let timedOut = false;
  const provider = opts.provider || 'unknown';

  // Link parent signal (global budget timeout from router)
  if (opts.parentSignal) {
    if (opts.parentSignal.aborted) {
      ac.abort();
    } else {
      opts.parentSignal.addEventListener('abort', () => ac.abort(), { once: true });
    }
  }

  // Use Promise.race to guarantee timeout even if the SDK ignores AbortSignal
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      timedOut = true;
      ac.abort();
      reject(makeProviderError(provider, 'PROVIDER_TIMEOUT', `${provider} request timed out`, {
        retryable: true,
      }));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([
      taskFactory({ signal: ac.signal }),
      timeoutPromise,
    ]);
    return result;
  } catch (err) {
    if (timedOut || isAbortLikeError(err)) {
      // Ensure it's a normalized error
      if (err.code === 'PROVIDER_TIMEOUT') throw err;
      throw makeProviderError(provider, 'PROVIDER_TIMEOUT', `${provider} request timed out`, {
        retryable: true,
      });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
