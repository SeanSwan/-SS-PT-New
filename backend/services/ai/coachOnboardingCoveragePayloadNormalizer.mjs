/**
 * coachOnboardingCoveragePayloadNormalizer.mjs
 * ============================================
 * Normalizes Coach proposal coverage-update payloads without deciding final
 * onboarding completion. Approval services still own deterministic writes.
 */
const COVERAGE_STATUSES = new Set([
  'known',
  'unknown',
  'trainer_pending',
  'client_requested',
  'not_applicable',
  'blocked',
]);
const COVERAGE_STATUS_ALIASES = Object.freeze({
  ask_client_later: 'client_requested',
  ask_later: 'client_requested',
});

function onboardingData(payload) {
  return payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
}

function normalizeCoverageStatus(value) {
  const normalized = COVERAGE_STATUS_ALIASES[value] || value || 'unknown';
  return COVERAGE_STATUSES.has(normalized) ? normalized : 'unknown';
}

function normalizeCoverageUpdates(updates) {
  if (!Array.isArray(updates)) return undefined;
  const normalized = updates
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .slice(0, 80)
    .map((item) => ({
      ...item,
      fieldKey: item.fieldKey || item.coverageKey || item.key,
      coverageKey: item.coverageKey || item.fieldKey || item.key,
      status: normalizeCoverageStatus(item.status),
    }))
    .filter((item) => item.fieldKey || item.coverageKey);
  return normalized.length ? normalized : undefined;
}

export function normalizeOnboardingCoverageUpdates(payload) {
  const data = onboardingData(payload) || {};
  const coverageUpdates = normalizeCoverageUpdates(data.coverageUpdates);
  if (!coverageUpdates) return payload;

  if (payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return { ...payload, data: { ...payload.data, coverageUpdates } };
  }

  return { ...payload, coverageUpdates };
}