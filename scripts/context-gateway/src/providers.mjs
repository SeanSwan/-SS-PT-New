/**
 * providers.mjs — committed provider registry + sensitivity-ceiling enforcement (threat T10).
 * ============================================================================================
 * Migrated from the three LOCAL-ONLY consult launchers inventoried in Phase 0 §1 (consult-fable/
 * kimi/sol.mjs) so a clean checkout can run every adapter. Pricing carries a verified-date and
 * is advisory for the SPEND GATE estimate — the gate is conservative (over-estimates).
 *
 * SENSITIVITY CEILING (enforced in code, not convention): Kimi (Moonshot, Chinese provider) is
 * design-scoped per house policy — packets containing auth/billing/payments/PII/security/infra-
 * secret evidence are REFUSED for ceiling 'design' providers. Fail-closed: unknown provider →
 * refuse; sensitive path match → refuse with the offending evidence listed. There is no
 * override flag in this module on purpose — widening the ceiling is a Sean-gated code change.
 *
 * @module context-gateway/providers
 */

export const PROVIDERS = {
  fable: {
    model: 'anthropic/claude-fable-5', envModel: 'SWAN_FUSION_JUDGE_MODEL',
    priceInPerM: 10, priceOutPerM: 50, priceVerified: '2026-07-08',
    ceiling: 'standard', supportsEffort: false, temperature: 0.25, timeoutMs: 600_000,
    title: 'SwanStudios Fable Final-Decider', role: 'Final Decider / head architect (hostile review, arbitration)',
  },
  sol: {
    model: 'openai/gpt-5.6-sol', envModel: 'SWAN_SOL_MODEL',
    priceInPerM: 5, priceOutPerM: 30, priceVerified: '2026-07-17',
    ceiling: 'standard', supportsEffort: true, temperature: 0.2, timeoutMs: 600_000,
    title: 'SwanStudios GPT-5.6 Sol Gate Review', role: 'High-reasoning hostile gate (correctness/security/data-truth)',
  },
  kimi: {
    model: 'moonshotai/kimi-k3', envModel: 'SWAN_KIMI_MODEL',
    priceInPerM: 3, priceOutPerM: 15, priceVerified: '2026-07-17',
    ceiling: 'design', supportsEffort: true, temperature: 0.3, timeoutMs: 900_000,
    title: 'SwanStudios Kimi K3 Design Review', role: 'Front-end/design guru (design-scoped ONLY — Chinese provider policy)',
  },
};

/** Evidence-path classes above the 'design' ceiling. Matched case-insensitively. */
export const SENSITIVE_PATH_RE = /auth|login|session|billing|payment|stripe|webhook|pii|privacy|secret|credential|token|migration|middleware|\.env|admin|permission|checkout|payout/i;

export class ProviderError extends Error {
  constructor(code, message, detail = null) {
    super(`[${code}] ${message}`);
    this.code = code; // UNKNOWN_PROVIDER | CEILING | SPEND_CAP | NO_CAP
    this.detail = detail;
  }
}

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new ProviderError('UNKNOWN_PROVIDER', `no adapter for "${name}" (have: ${Object.keys(PROVIDERS).join(', ')})`);
  return { name, ...p, model: process.env[p.envModel] || p.model };
}

/**
 * Enforce the provider's sensitivity ceiling against a packet manifest. Throws ProviderError
 * CEILING listing every offending evidence path; returns the offending list (empty = pass).
 */
export function enforceCeiling(provider, manifest) {
  // Screen every non-standard ceiling, not just 'design' — so a future restricted tier fails
  // SAFE (screened) rather than silently passing. Transport gates identically (!== 'standard').
  if (provider.ceiling === 'standard') return [];
  const offending = manifest.evidence.filter((e) => SENSITIVE_PATH_RE.test(e.path)).map((e) => `${e.id} ${e.path}`);
  if (offending.length) {
    throw new ProviderError('CEILING', `${provider.name} is design-scoped; packet contains ${offending.length} sensitive evidence item(s)`, offending);
  }
  return offending;
}

/** Conservative cost estimate for one turn: chars/3 input tokens + full maxTokens output. */
export function estimateCost(provider, promptChars, maxTokens) {
  return (promptChars / 3 / 1e6) * provider.priceInPerM + (maxTokens / 1e6) * provider.priceOutPerM;
}

/**
 * Spend gate (threat T8). Fail-closed: SWAN_CONTEXT_MAX_USD must be set to spend at all.
 */
export function assertSpend(provider, promptChars, maxTokens, env = process.env) {
  const cap = Number(env.SWAN_CONTEXT_MAX_USD);
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new ProviderError('NO_CAP', 'SWAN_CONTEXT_MAX_USD is not set — network spend is fail-closed (dry-run commands need no cap)');
  }
  const estimate = estimateCost(provider, promptChars, maxTokens);
  if (estimate > cap) {
    throw new ProviderError('SPEND_CAP', `estimated ~$${estimate.toFixed(4)} exceeds SWAN_CONTEXT_MAX_USD=$${cap}`, { estimate, cap });
  }
  return { estimate, cap };
}
