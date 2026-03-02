/**
 * AI Provider Router
 * ==================
 * Routes AI generation requests through the provider chain with:
 *   - Configurable provider order (env: AI_PROVIDER_ORDER)
 *   - Per-provider circuit breaker
 *   - Retry logic (1 retry for transient errors)
 *   - Global timeout budget
 *   - Normalized outcome envelope (AiRouterOutcome)
 *
 * Guarantees:
 *   - Never throws — all errors caught and normalized
 *   - Returns ok:true or ok:false (degraded)
 *   - failoverTrace always populated
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */
import logger from '../../utils/logger.mjs';
import { canRequest, recordSuccess, recordFailure } from './circuitBreaker.mjs';
import {
  RETRYABLE_ERROR_CODES,
  MAX_RETRIES_PER_PROVIDER,
  RETRY_DELAY_MS,
  DEFAULT_GLOBAL_TIMEOUT_MS,
} from './types.mjs';

// ── Adapter Registry ─────────────────────────────────────────────────────────

/** @type {Map<string, import('./types.mjs').AiProviderAdapter>} */
const adapters = new Map();

/**
 * Register a provider adapter. Called at server startup.
 * @param {import('./types.mjs').AiProviderAdapter} adapter
 */
export function registerAdapter(adapter) {
  adapters.set(adapter.name, adapter);
}

/**
 * Clear all registered adapters. Used in tests only to prevent cross-test contamination.
 * Overwriting same-name adapters via registerAdapter() is intentional and safe.
 */
export function resetAdapters() {
  adapters.clear();
}

/**
 * Get the names of all currently registered adapters.
 * Used by the /api/ai/health endpoint to confirm adapters loaded.
 * @returns {string[]}
 */
export function getRegisteredAdapterNames() {
  return [...adapters.keys()];
}

/**
 * Get the ordered list of provider names to try.
 * @returns {string[]}
 */
function getProviderOrder() {
  const envOrder = process.env.AI_PROVIDER_ORDER;
  if (envOrder) {
    return envOrder.split(',').map(s => s.trim()).filter(Boolean);
  }
  return ['openai', 'anthropic', 'gemini', 'venice'];
}

// ── Router Core ──────────────────────────────────────────────────────────────

/**
 * Delay helper.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Try a single provider with retry logic.
 *
 * @param {import('./types.mjs').AiProviderAdapter} adapter
 * @param {import('./types.mjs').AiGenerationContext} ctx
 * @param {AbortSignal} globalSignal
 * @returns {Promise<{ ok: true, result: import('./types.mjs').AiProviderResult }
 *                  | { ok: false, error: import('./types.mjs').AiProviderError }>}
 */
async function tryProvider(adapter, ctx, globalSignal) {
  const ctxWithSignal = { ...ctx, signal: globalSignal };
  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES_PER_PROVIDER; attempt++) {
    if (globalSignal.aborted) {
      return {
        ok: false,
        error: {
          provider: adapter.name,
          code: 'PROVIDER_TIMEOUT',
          message: 'Global timeout budget exhausted',
          retryable: false,
          statusCode: null,
        },
      };
    }

    try {
      const result = await adapter.generateWorkoutDraft(ctxWithSignal);
      recordSuccess(adapter.name);
      return { ok: true, result };
    } catch (err) {
      lastError = err;

      // Only retry on retryable errors, and only if we have attempts left
      if (attempt < MAX_RETRIES_PER_PROVIDER && RETRYABLE_ERROR_CODES.has(err.code)) {
        logger.info(`[Router] Retrying ${adapter.name} (attempt ${attempt + 1})`, { code: err.code });
        await delay(RETRY_DELAY_MS);
        continue;
      }

      // Not retryable or out of retries
      break;
    }
  }

  recordFailure(adapter.name);
  return { ok: false, error: lastError };
}

/**
 * Route an AI generation request through the provider chain.
 *
 * @param {import('./types.mjs').AiGenerationContext} ctx
 * @returns {Promise<import('./types.mjs').AiRouterOutcome>}
 */
export async function routeAiGeneration(ctx) {
  const providerOrder = getProviderOrder();
  const globalTimeoutMs = Number(process.env.AI_GLOBAL_TIMEOUT_MS) || DEFAULT_GLOBAL_TIMEOUT_MS;

  const globalAc = new AbortController();
  const globalTimer = setTimeout(() => globalAc.abort(), globalTimeoutMs);

  /** @type {string[]} */
  const failoverTrace = [];
  /** @type {import('./types.mjs').AiProviderError[]} */
  const errors = [];

  try {
    for (const providerName of providerOrder) {
      if (globalAc.signal.aborted) {
        failoverTrace.push(`${providerName}:budget_exhausted`);
        continue;
      }

      const adapter = adapters.get(providerName);

      // Skip unregistered adapters
      if (!adapter) {
        failoverTrace.push(`${providerName}:not_registered`);
        continue;
      }

      // Skip unconfigured adapters (no API key)
      if (!adapter.isConfigured()) {
        failoverTrace.push(`${providerName}:not_configured`);
        continue;
      }

      // Circuit breaker check
      const circuit = canRequest(providerName);
      if (!circuit.allowed) {
        failoverTrace.push(`${providerName}:circuit_open`);
        continue;
      }

      // Try the provider
      const result = await tryProvider(adapter, ctx, globalAc.signal);

      if (result.ok) {
        failoverTrace.push(`${providerName}:success`);
        return {
          ok: true,
          result: result.result,
          failoverTrace,
        };
      }

      // Provider failed
      failoverTrace.push(`${providerName}:${result.error.code}`);
      errors.push(result.error);
    }

    // All providers exhausted → degraded mode
    logger.warn('[Router] All providers failed, entering degraded mode', {
      failoverTrace,
      errorCount: errors.length,
    });

    return {
      ok: false,
      errors,
      degraded: true,
      failoverTrace,
    };
  } finally {
    clearTimeout(globalTimer);
  }
}
