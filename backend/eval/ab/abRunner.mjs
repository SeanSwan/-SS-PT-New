/**
 * A/B Runner — Phase 7
 * ====================
 * Runs A/B scenarios through mock (or live) adapters, collects attempt metrics,
 * aggregates per-provider stats, and ranks providers.
 *
 * Default mode: deterministic + no-network (mock adapters).
 * --live mode: opt-in, uses real adapters (requires API keys).
 */
import { createMockAdapter } from './mockAdapterFactory.mjs';
import { AB_DATASET_VERSION } from './abDataset.mjs';
import {
  normalizeAttemptMetrics,
  aggregateProviderMetrics,
  rankProviders,
} from '../../services/ai/providerCostTracker.mjs';
import { makeProviderError } from '../../services/ai/adapters/adapterUtils.mjs';

/** Valid provider names */
const VALID_PROVIDERS = new Set(['openai', 'anthropic', 'gemini', 'venice']);

/** Dynamic import paths for real adapters (relative to this file) */
const ADAPTER_IMPORT_MAP = {
  openai:    '../../services/ai/adapters/openaiAdapter.mjs',
  anthropic: '../../services/ai/adapters/anthropicAdapter.mjs',
  gemini:    '../../services/ai/adapters/geminiAdapter.mjs',
  venice:    '../../services/ai/adapters/veniceAdapter.mjs',
};

/** Default model map for unconfigured live-mode providers (synthetic auth failures) */
const DEFAULT_MODEL_MAP = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  gemini: 'gemini-2.0-flash',
  venice: 'llama-3.3-70b',
};

// ── Provider List Normalization ─────────────────────────────────────────────

/**
 * Normalize provider list: trim, lowercase, dedupe, sort alphabetically.
 * @param {string[]} providers
 * @returns {string[]}
 */
function normalizeProviders(providers) {
  const seen = new Set();
  const result = [];
  for (const p of providers) {
    const normalized = String(p).trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(normalized);
    }
  }
  return result.sort();
}

// ── Safe Adapter Resolution ─────────────────────────────────────────────────

/**
 * Safely resolve an adapter via adapterResolver.
 * If it throws, returns null, or returns a malformed object → return null.
 *
 * @param {Function} adapterResolver
 * @param {string} providerName
 * @returns {{ name: string, isConfigured: Function, generateWorkoutDraft: Function } | null}
 */
function safeResolveAdapter(adapterResolver, providerName) {
  try {
    const adapter = adapterResolver(providerName);
    if (
      adapter &&
      typeof adapter.isConfigured === 'function' &&
      typeof adapter.generateWorkoutDraft === 'function'
    ) {
      return adapter;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Suite Runner ────────────────────────────────────────────────────────────

/**
 * Run the A/B suite.
 *
 * @param {import('./abDataset.mjs').AB_SCENARIOS} scenarios
 * @param {{
 *   providers?: string[],
 *   iterations?: number,
 *   live?: boolean,
 *   adapterResolver?: (providerName: string) => any,
 * }} [config]
 * @returns {Promise<Object>} AbSuiteResult
 */
export async function runAbSuite(scenarios, config = {}) {
  const startMs = Date.now();

  // ── Runtime validation ──────────────────────────────────────────────────
  if (!scenarios || scenarios.length === 0) {
    throw new Error('A/B scenarios array must be non-empty');
  }

  // Normalize providers first, then validate
  const rawProviders = config.providers || ['openai', 'anthropic', 'gemini', 'venice'];
  const providers = normalizeProviders(rawProviders);

  if (providers.length === 0) {
    throw new Error('providers must contain at least one valid provider');
  }

  const unknownProviders = providers.filter(p => !VALID_PROVIDERS.has(p));
  if (unknownProviders.length > 0) {
    throw new Error(`Unknown providers: ${unknownProviders.join(', ')}. Allowed: ${[...VALID_PROVIDERS].sort().join(', ')}`);
  }

  const iterations = config.iterations ?? 1;
  if (!Number.isInteger(iterations) || iterations <= 0) {
    throw new Error(`iterations must be a positive integer, got: ${iterations}`);
  }

  const isLive = Boolean(config.live);
  const mode = isLive ? 'live' : 'mock';

  // ── Live-mode adapter resolution ──────────────────────────────────────
  // Map of provider → adapter | null (null = unconfigured)
  const liveAdapters = new Map();

  if (isLive) {
    for (const providerName of providers) {
      if (config.adapterResolver) {
        const adapter = safeResolveAdapter(config.adapterResolver, providerName);
        let configured = false;
        try {
          configured = adapter && adapter.isConfigured();
        } catch {
          // isConfigured() threw — treat as unconfigured
        }
        if (configured) {
          liveAdapters.set(providerName, adapter);
        } else {
          liveAdapters.set(providerName, null); // unconfigured
        }
      } else {
        // Dynamic import of real adapter
        let adapter = null;
        const importPath = ADAPTER_IMPORT_MAP[providerName];
        if (importPath) {
          try {
            const mod = await import(importPath);
            adapter = mod.default || mod;
          } catch {
            // Import failed — treat as unconfigured
          }
        }
        let configured = false;
        try {
          configured = adapter && typeof adapter.isConfigured === 'function' && adapter.isConfigured();
        } catch {
          // isConfigured() threw — treat as unconfigured
        }
        if (configured) {
          liveAdapters.set(providerName, adapter);
        } else {
          liveAdapters.set(providerName, null);
        }
      }
    }
  }

  // ── Execute scenarios ─────────────────────────────────────────────────
  const attempts = [];

  for (const scenario of scenarios) {
    for (const providerName of providers) {
      for (let iter = 0; iter < iterations; iter++) {
        let attemptRaw;

        if (isLive) {
          const adapter = liveAdapters.get(providerName);
          if (!adapter) {
            // Unconfigured provider → deterministic PROVIDER_AUTH failure
            attemptRaw = {
              scenarioId: scenario.id,
              iteration: iter,
              provider: providerName,
              model: null,
              success: false,
              errorCode: 'PROVIDER_AUTH',
              errorType: 'auth',
              latencyMs: 0,
              promptTokens: null,
              completionTokens: null,
            };
          } else {
            attemptRaw = await executeSingleAttempt(adapter, scenario, providerName, iter);
          }
        } else {
          // Mock mode — create mock adapter from scenario config
          const mockConfig = scenario.mockResponses[providerName];
          if (!mockConfig) {
            attemptRaw = {
              scenarioId: scenario.id,
              iteration: iter,
              provider: providerName,
              model: null,
              success: false,
              errorCode: 'UNKNOWN_PROVIDER_ERROR',
              errorType: 'config',
              latencyMs: 0,
              promptTokens: null,
              completionTokens: null,
            };
          } else {
            const model = DEFAULT_MODEL_MAP[providerName] || providerName;
            const mockAdapter = createMockAdapter(providerName, {
              model,
              responses: mockConfig,
            });
            attemptRaw = await executeSingleAttempt(mockAdapter, scenario, providerName, iter);
          }
        }

        attempts.push(normalizeAttemptMetrics(attemptRaw));
      }
    }
  }

  // ── Aggregate & rank ──────────────────────────────────────────────────
  const byProvider = new Map();
  for (const a of attempts) {
    if (!byProvider.has(a.provider)) byProvider.set(a.provider, []);
    byProvider.get(a.provider).push(a);
  }

  const aggregations = [];
  for (const providerName of providers) {
    const providerAttempts = byProvider.get(providerName) || [];
    if (providerAttempts.length > 0) {
      aggregations.push(aggregateProviderMetrics(providerAttempts));
    }
  }

  const rankings = rankProviders(aggregations);

  // ── Summary highlights ────────────────────────────────────────────────
  // Only from providers with successRate > 0, respecting additional constraints
  const qualifiedForLatency = rankings.filter(r => r.successRate > 0 && r.p95LatencyMs != null);
  const qualifiedForCost = rankings.filter(r => r.successRate > 0 && r.avgCostUsd != null);
  const qualifiedForReliability = rankings.filter(r => r.successRate > 0);

  // Tie-break: use rankProviders ordering — first qualifying provider wins
  const fastestProvider = qualifiedForLatency.length > 0
    ? qualifiedForLatency.reduce((best, r) => r.p95LatencyMs < best.p95LatencyMs ? r : best).provider
    : null;
  const cheapestProvider = qualifiedForCost.length > 0
    ? qualifiedForCost.reduce((best, r) => r.avgCostUsd < best.avgCostUsd ? r : best).provider
    : null;
  const mostReliableProvider = qualifiedForReliability.length > 0
    ? qualifiedForReliability[0].provider  // Already sorted by successRate desc
    : null;

  const durationMs = Date.now() - startMs;

  return {
    attempts,
    rankings,
    summary: {
      totalAttempts: attempts.length,
      totalProviders: providers.length,
      totalScenarios: scenarios.length,
      cheapestProvider,
      fastestProvider,
      mostReliableProvider,
      durationMs,
    },
    config: { providers, iterations },
    mode,
    datasetVersion: AB_DATASET_VERSION,
    durationMs,
    ...(isLive && {
      providerStatus: Object.fromEntries(
        providers.map(p => [p, liveAdapters.get(p) ? 'configured' : 'unconfigured'])
      ),
    }),
  };
}

// ── Single Attempt Execution ────────────────────────────────────────────────

/**
 * Execute a single adapter call and return raw attempt data.
 * @returns {Object} Raw attempt data (not yet normalized)
 */
async function executeSingleAttempt(adapter, scenario, providerName, iteration) {
  try {
    const result = await adapter.generateWorkoutDraft({
      prompt: scenario.prompt,
      systemMessage: scenario.systemMessage,
    });

    return {
      scenarioId: scenario.id,
      iteration,
      provider: providerName,
      model: result.model || null,
      success: true,
      errorCode: null,
      errorType: null,
      latencyMs: result.latencyMs || 0,
      promptTokens: result.tokenUsage?.inputTokens ?? null,
      completionTokens: result.tokenUsage?.outputTokens ?? null,
    };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      iteration,
      provider: providerName,
      model: null,
      success: false,
      errorCode: err.code || 'UNKNOWN_PROVIDER_ERROR',
      errorType: err.code === 'PROVIDER_TIMEOUT' ? 'timeout'
        : err.code === 'PROVIDER_AUTH' ? 'auth'
        : err.code === 'PROVIDER_RATE_LIMIT' ? 'rate_limit'
        : 'unknown',
      latencyMs: 0,
      promptTokens: null,
      completionTokens: null,
    };
  }
}

// ── Exit Code Computation ───────────────────────────────────────────────────

/**
 * Compute exit code for the A/B suite.
 * Returns 1 only on internal runner failures (empty attempts/rankings).
 * Provider failures are expected data, not errors — returns 0.
 *
 * @param {Object} suiteResult
 * @returns {0|1}
 */
export function computeAbExitCode(suiteResult) {
  if (!suiteResult.attempts || suiteResult.attempts.length === 0) return 1;
  if (!suiteResult.rankings || suiteResult.rankings.length === 0) return 1;
  return 0;
}
