/**
 * Degraded-Mode Response Builder
 * ===============================
 * Builds the first-class degraded response when all AI providers fail.
 * Returns HTTP 200 with success: true, degraded: true, and template suggestions.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 * Phase 4A — Registry-backed template suggestions with alias compatibility
 */
import {
  getTemplateById,
  getTemplatesByStatus,
  TEMPLATE_ID_ALIASES,
} from './nasmTemplateRegistry.mjs';

/**
 * Legacy template suggestion IDs (preserved for backward compatibility).
 * These map to registry entries via TEMPLATE_ID_ALIASES.
 */
const LEGACY_SUGGESTION_IDS = [
  'opt-1-stabilization',
  'opt-2-strength',
  'opt-3-hypertrophy',
  'opt-4-maxstrength',
  'opt-5-power',
  'ces-general',
  'general-beginner',
  'general-intermediate',
];

/**
 * Hardcoded fallback for pending_schema or missing registry entries.
 */
const HARDCODED_FALLBACKS = {
  'general-beginner':     { id: 'general-beginner',     label: 'General Fitness: Beginner',      category: 'GENERAL' },
  'general-intermediate': { id: 'general-intermediate', label: 'General Fitness: Intermediate',   category: 'GENERAL' },
};

/**
 * Build template suggestions from the registry via alias lookup.
 * pending_schema templates fall back to hardcoded suggestion text.
 *
 * @returns {Array<{id: string, label: string, category: string}>}
 */
function buildTemplateSuggestions() {
  return LEGACY_SUGGESTION_IDS.map(legacyId => {
    const registryEntry = getTemplateById(legacyId);

    // pending_schema or missing → use hardcoded fallback if available
    if (!registryEntry || registryEntry.status === 'pending_schema') {
      if (HARDCODED_FALLBACKS[legacyId]) {
        return HARDCODED_FALLBACKS[legacyId];
      }
      // No fallback, use legacy ID as-is
      return { id: legacyId, label: legacyId, category: 'UNKNOWN' };
    }

    // Active registry entry → use registry label, keep legacy ID for API compatibility
    return {
      id: legacyId,
      label: registryEntry.label,
      category: registryEntry.nasmFramework,
    };
  });
}

/**
 * Map normalized error codes to human-readable reasons.
 */
const ERROR_LABELS = {
  PROVIDER_TIMEOUT: 'request timed out',
  PROVIDER_RATE_LIMIT: 'rate limit exceeded',
  PROVIDER_AUTH: 'authentication error',
  PROVIDER_UNAVAILABLE: 'service unavailable',
  PROVIDER_NETWORK: 'network error',
  PROVIDER_INVALID_RESPONSE: 'invalid response',
  PROVIDER_CONTENT_FILTER: 'content filter triggered',
  UNKNOWN_PROVIDER_ERROR: 'unexpected error',
};

/**
 * Build a degraded-mode response body.
 *
 * @param {import('./types.mjs').AiProviderError[]} errors
 * @param {string[]} failoverTrace
 * @returns {Object} Response body for HTTP 200
 */
export function buildDegradedResponse(errors, failoverTrace) {
  const reasons = errors.map(err => {
    const label = ERROR_LABELS[err.code] || err.code;
    return `${capitalize(err.provider)}: ${label}`;
  });

  return {
    success: true,
    degraded: true,
    code: 'AI_DEGRADED_MODE',
    message: 'AI providers are temporarily unavailable. You can use manual templates or wait for AI to recover.',
    fallback: {
      type: 'manual_template_only',
      templateSuggestions: buildTemplateSuggestions(),
      reasons,
    },
    failoverTrace,
  };
}

function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
