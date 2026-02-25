/**
 * AI Provider Router — Type Definitions
 * =======================================
 * JSDoc type definitions for the provider-agnostic AI generation pipeline.
 * These types are used by adapters, router, validator, and controller.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */

// ── Request Context ──────────────────────────────────────────────────────────

/**
 * @typedef {'workout_generation'} AiRequestType
 */

/**
 * @typedef {Object} AiGenerationContext
 * @property {AiRequestType} requestType
 * @property {number}   userId              - Internal only — never sent to provider
 * @property {Object}   deidentifiedPayload - Output of Phase 1 deIdentify()
 * @property {Object}   serverConstraints   - NASM constraints (server-derived only)
 * @property {string}   payloadHash         - SHA-256 of deidentifiedPayload
 * @property {string}   promptVersion       - e.g. "1.0.0"
 * @property {string}   [modelPreference]   - Optional override (admin use)
 * @property {number}   [maxOutputTokens]   - Default: 2000
 * @property {number}   [timeoutMs]         - Default: per-provider config
 * @property {string}   [userName]          - Original user name (for PII detection only, never sent to provider)
 * @property {AbortSignal} [signal]         - AbortController signal for cancellation
 * @property {string|null} [primaryTemplateId] - Primary NASM template ID (Phase 4A)
 * @property {Array<{id:string, templateVersion:string, schemaVersion:string, role:string}>} [templateRefs] - All resolved template references for provenance (Phase 4A)
 * @property {string} [registryVersion]    - Template registry version (Phase 4A)
 */

// ── Provider Result ──────────────────────────────────────────────────────────

/**
 * @typedef {'openai' | 'anthropic' | 'gemini'} AiProviderName
 */

/**
 * @typedef {Object} AiTokenUsage
 * @property {number|null} inputTokens
 * @property {number|null} outputTokens
 * @property {number|null} totalTokens
 * @property {number|null} estimatedCostUsd
 */

/**
 * @typedef {Object} AiProviderResult
 * @property {AiProviderName} provider
 * @property {string}   model         - e.g. "gpt-4", "claude-sonnet-4-6"
 * @property {string}   rawText       - Provider text before parse (server-side only)
 * @property {number}   latencyMs
 * @property {string}   finishReason  - e.g. "stop", "length", "content_filter"
 * @property {AiTokenUsage} tokenUsage
 */

// ── Provider Error ───────────────────────────────────────────────────────────

/**
 * @typedef {'PROVIDER_TIMEOUT' | 'PROVIDER_RATE_LIMIT' | 'PROVIDER_AUTH'
 *           | 'PROVIDER_UNAVAILABLE' | 'PROVIDER_INVALID_RESPONSE'
 *           | 'PROVIDER_CONTENT_FILTER' | 'PROVIDER_NETWORK'
 *           | 'UNKNOWN_PROVIDER_ERROR'} AiProviderErrorCode
 */

/**
 * @typedef {Object} AiProviderError
 * @property {AiProviderName} provider
 * @property {AiProviderErrorCode} code
 * @property {string}   message     - Sanitized — no raw SDK internals
 * @property {boolean}  retryable
 * @property {number|null} statusCode
 */

// ── Router Outcome ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} AiRouterSuccess
 * @property {true}     ok
 * @property {AiProviderResult} result
 * @property {string[]} failoverTrace
 */

/**
 * @typedef {Object} AiRouterFailure
 * @property {false}    ok
 * @property {AiProviderError[]} errors
 * @property {true}     degraded
 * @property {string[]} failoverTrace
 */

/**
 * @typedef {AiRouterSuccess | AiRouterFailure} AiRouterOutcome
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Errors that are safe to retry (transient failures) */
export const RETRYABLE_ERROR_CODES = new Set([
  'PROVIDER_TIMEOUT',
  'PROVIDER_RATE_LIMIT',
  'PROVIDER_NETWORK',
]);

/** Errors that should NOT be retried (config/permanent) */
export const NON_RETRYABLE_ERROR_CODES = new Set([
  'PROVIDER_AUTH',
  'PROVIDER_CONTENT_FILTER',
  'PROVIDER_INVALID_RESPONSE',
  'PROVIDER_UNAVAILABLE',
  'UNKNOWN_PROVIDER_ERROR',
]);

/** Default timeout per provider call (ms) */
export const DEFAULT_PROVIDER_TIMEOUT_MS = 10_000;

/** Global route budget (ms) */
export const DEFAULT_GLOBAL_TIMEOUT_MS = 25_000;

/** Retry delay (ms) — fixed for Phase 3A MVP */
export const RETRY_DELAY_MS = 500;

/** Max retries per provider */
export const MAX_RETRIES_PER_PROVIDER = 1;

/** Current prompt version */
export const PROMPT_VERSION = '1.0.0';

/** Current rule engine version (constant only — persistence deferred to Phase 3C+) */
export const RULE_ENGINE_VERSION = '1.0.0';
