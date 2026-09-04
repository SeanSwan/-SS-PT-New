/**
 * SCU S5b — server-owned provider boundary.
 *
 * This gate is intentionally policy-only. It does not select a new vendor or
 * accept privacy claims from a model. Callers opt in with a server-built policy
 * and the provider router refuses requests that have no usable privacy class,
 * allow-list entry, or remaining time budget.
 */
const ALLOWED_PRIVACY_CLASSES = new Set(['deidentified', 'public']);

const normalizedProviders = (value) => (Array.isArray(value)
  ? [...new Set(value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean))].slice(0, 16)
  : []);

export function normalizeCoachProviderPolicy(policy = {}) {
  const privacyClass = String(policy.privacyClass || '').trim().toLowerCase();
  const budgetMs = Number(policy.budgetMs);
  return {
    privacyClass: privacyClass || 'blocked',
    allowedProviders: normalizedProviders(policy.allowedProviders),
    budgetMs: Number.isSafeInteger(budgetMs) && budgetMs >= 0 ? budgetMs : 0,
    capability: typeof policy.capability === 'string' ? policy.capability.trim().slice(0, 80) || null : null,
  };
}

export function guardCoachProviderRequest({ policy, providerName } = {}) {
  const normalized = normalizeCoachProviderPolicy(policy);
  if (!ALLOWED_PRIVACY_CLASSES.has(normalized.privacyClass)) {
    return { allowed: false, reasonCode: 'PRIVACY_POLICY_BLOCKED' };
  }
  if (normalized.budgetMs <= 0) {
    return { allowed: false, reasonCode: 'PROVIDER_BUDGET_EXHAUSTED' };
  }
  const provider = String(providerName || '').trim().toLowerCase();
  if (normalized.allowedProviders.length === 0) {
    return { allowed: false, reasonCode: 'PROVIDER_ALLOWLIST_REQUIRED' };
  }
  if (!normalized.allowedProviders.includes(provider)) {
    return { allowed: false, reasonCode: 'PROVIDER_NOT_ALLOWED' };
  }
  return { allowed: true };
}
