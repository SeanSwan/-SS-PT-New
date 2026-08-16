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

/**
 * A finding is one refusal reason plus the operator's next action.
 *
 * A refusal with no next action is a bug in this gate, not the operator's problem (blueprint §5
 * item 2): an undiagnosable refusal becomes an ignored refusal, and an ignored refusal is how the
 * whole design fails. Lives beside the codes because the shape of a refusal and the vocabulary of
 * refusals are one concern, and because the checks now span four files that must not each grow
 * their own copy.
 */
export const finding = (code, detail, remedy) => ({ code, label: REFUSALS[code], detail, remedy });
