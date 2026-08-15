/**
 * refusal.mjs — the stable refusal vocabulary, in one place.
 * ==========================================================
 * Codes are stable so refusals stay greppable in logs and git history. Shared by checks.mjs and
 * canary.mjs so neither owns the other's vocabulary.
 *
 * v1 ships exactly six. The blueprint lists sixteen; the other ten are deferred until measured,
 * because the design's own top-ranked failure is operators routing around an expensive gate.
 *
 * @module packet-gate/refusal
 */
export const REFUSALS = {
  R1: 'oversize',
  R3: 'provenance',
  R4: 'no-artifact',
  R5: 'phantom-premise',
  R6: 'hygiene',
  R15: 'canary',
};
