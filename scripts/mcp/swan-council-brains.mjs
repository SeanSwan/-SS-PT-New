/**
 * swan-council-brains.mjs — brain registry + spend cap (one source of truth).
 * ==========================================================================
 * Split out so the lib, the spend ledger, and the server all import the SAME
 * model slugs + pricing without a circular dependency (Rule 4 keeps each file
 * under 300 lines). OpenRouter slugs + $/M-token pricing mirror the consult-*.mjs
 * scripts they replace.
 *
 * @module swan-council-brains
 */

export const BRAINS = {
  codex: {
    model: 'openai/gpt-5.5',
    priceIn: 1.25, priceOut: 10, // OpenRouter gpt-5.5 catalog
    cli: { cmd: 'codex', probeArgs: ['--version'] }, // subscription path (absent today)
    maxTokens: 8192,
  },
  kimi: {
    model: 'moonshotai/kimi-k3',
    priceIn: 3, priceOut: 15, // consult-kimi.mjs catalog 2026-07-17
    cli: null, // OpenRouter-only by policy
    maxTokens: 16000,
  },
  fable: {
    model: 'anthropic/claude-fable-5',
    priceIn: 10, priceOut: 50, // consult-fable.mjs catalog 2026-07-08 — the king, expensive
    cli: { cmd: 'fable', probeArgs: ['--version'] }, // subscription path (absent today)
    maxTokens: 16000,
  },
};

/** Session spend cap in USD. Sean 2026-07-22: $3 — he never sees a run exceed ~$2. */
export const DEFAULT_SESSION_CAP_USD = 3;
