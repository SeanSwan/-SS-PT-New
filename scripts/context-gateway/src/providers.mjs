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

/**
 * Evidence-path classes above the 'design' ceiling. Matched case-insensitively. Includes Sean's
 * life-critical admin-only data classes (immigration, medical) per Rule 8 (hostile pass 3 finding 2).
 */
/**
 * NARROWED 2026-08-14 by Sean's explicit decision, with the tradeoff stated and chosen.
 *
 * REMOVED, exactly the list Sean approved: `session|webhook|token|migration|middleware|admin|
 * permission`. Those match ordinary backend code carrying no protected data — a routes file, a
 * logger, a schema change — and blocked a design reviewer from most real work while protecting
 * nothing. That block was the friction Sean asked to remove.
 *
 * DELIBERATELY KEPT — `auth|login|privacy` were NOT on Sean's list. A first pass removed them too
 * (they would unblock `authMiddleware.mjs`, `useAuth.ts`, and friends), but auth LOGIC is
 * attack-surface knowledge: how tokens are validated, how sessions are established. Removing them
 * also broke nine existing ceiling tests, all of which use an auth path as their canonical
 * sensitive fixture — churn incurred for a change that was never authorised. Restored. Removing
 * them is a one-word change if Sean decides the review value outweighs it.
 *
 * ALSO KEPT: credentials and live money paths (a design-ceiling provider has no business reading
 * them), and Sean's life-critical data classes — immigration, medical, patient, health, ssn, pii —
 * which are Rule 8 categorical and are family data, not code.
 *
 * This is a PATH filter and always was belt-and-braces: `egress.mjs` already strips secret VALUES
 * (keys, JWTs, DB URLs, PEM, emails, SSNs) from every byte that crosses to any provider, so
 * narrowing the path list does not expose secrets — it exposes filenames and code structure.
 *
 * Still fail-closed, still no override flag, still a Sean-gated change to widen further.
 */
export const SENSITIVE_PATH_RE = /auth|oauth|jwt|login|password|billing|payment|stripe|checkout|payout|refund|payroll|bank|plaid|pii|ssn|privacy|secret|credential|\.env|immigration|medical|patient|health/i;

export class ProviderError extends Error {
  constructor(code, message, detail = null) {
    super(`[${code}] ${message}`);
    this.code = code; // UNKNOWN_PROVIDER | CEILING | SPEND_CAP | NO_CAP
    this.detail = detail;
  }
}

const CEILING_RANK = { standard: 0, design: 1 }; // higher = more restrictive
/** Model slugs that are ALWAYS design-ceiling regardless of which slot resolves them (Chinese
 * providers per Village policy). Widened for ernie/hunyuan/doubao/internlm/stepfun (pass 3 finding 2). */
const RESTRICTED_MODEL_RE = /moonshotai\/|(?:^|\/)kimi|glm|qwen|deepseek|yi-|baichuan|minimax|ernie|hunyuan|doubao|(?:^|\/)seed|internlm|stepfun|z-ai\//i;

export function getProvider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new ProviderError('UNKNOWN_PROVIDER', `no adapter for "${name}" (have: ${Object.keys(PROVIDERS).join(', ')})`);
  const model = process.env[p.envModel] || p.model;
  // The ceiling must travel with the RESOLVED MODEL, not the static slot (hostile pass 4, finding 5):
  // a model override (e.g. SWAN_FUSION_JUDGE_MODEL=moonshotai/kimi-k3 on the standard fable slot)
  // must NOT route sensitive evidence to a design/Chinese model under a standard ceiling. Inherit the
  // MOST restrictive of: the slot's ceiling, any registry slot owning this model, and the hardcoded
  // restricted-slug list. Fail toward MORE restriction, never less.
  let ceiling = p.ceiling;
  for (const q of Object.values(PROVIDERS)) {
    if (q.model === model && CEILING_RANK[q.ceiling] > CEILING_RANK[ceiling]) ceiling = q.ceiling;
  }
  if (RESTRICTED_MODEL_RE.test(model) && CEILING_RANK.design > CEILING_RANK[ceiling]) ceiling = 'design';
  return { name, ...p, model, ceiling };
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

/**
 * Conservative cost estimate for one turn: input-token proxy = UTF-8 BYTES/3 (not chars/3) so
 * CJK content — a 3-byte char ≈ 1 token — isn't 3× under-counted, which would let the T8 cap be
 * overshot on the design/Kimi lane most likely to carry CJK (hostile pass 5, finding 7). ASCII
 * (1 byte/char) is unchanged. Output side assumes the full maxTokens (an exact ceiling).
 * Callers pass a UTF-8 byte length.
 */
export function estimateCost(provider, promptBytes, maxTokens) {
  return (promptBytes / 3 / 1e6) * provider.priceInPerM + (maxTokens / 1e6) * provider.priceOutPerM;
}

/**
 * Spend gate (threat T8). Fail-closed: SWAN_CONTEXT_MAX_USD must be set to spend at all.
 */
export function assertSpend(provider, promptBytes, maxTokens, env = process.env) {
  const cap = Number(env.SWAN_CONTEXT_MAX_USD);
  if (!Number.isFinite(cap) || cap <= 0) {
    throw new ProviderError('NO_CAP', 'SWAN_CONTEXT_MAX_USD is not set — network spend is fail-closed (dry-run commands need no cap)');
  }
  const estimate = estimateCost(provider, promptBytes, maxTokens);
  if (estimate > cap) {
    throw new ProviderError('SPEND_CAP', `estimated ~$${estimate.toFixed(4)} exceeds SWAN_CONTEXT_MAX_USD=$${cap}`, { estimate, cap });
  }
  return { estimate, cap };
}
