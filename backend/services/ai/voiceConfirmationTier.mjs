/**
 * ============================================================================
 * FILE: services/ai/voiceConfirmationTier.mjs
 * PURPOSE: One confirmation contract every surface consumes. (Coach Hive-Mind C3)
 * ============================================================================
 *
 * WHY THIS EXISTS
 *   Without a shared rule, each surface invents its own confirmation behaviour
 *   and the four-registry drift returns at the interaction layer — the exact
 *   failure this program was written to remove. This derives the tier from the
 *   command definition that already exists, so a new command inherits correct
 *   voice behaviour without its author thinking about voice at all.
 *
 * WHAT WAS ALREADY THERE
 *   `CommandDefinition` (commandRegistry/baseSchemas.mjs) already carries
 *   `destructive`, `requiresConfirmation`, `roleRequired`, `requiresClientRef`.
 *   Across 19 registries: 134 commands, 8 destructive, 44 confirmation-gated.
 *   What did NOT exist is any notion of a READ-BACK tier — the boolean
 *   collapsed everything into confirm / don't-confirm.
 *
 * THE THREE TIERS
 *   fire_and_forget — repetitive, reversible: log a set, rest timer, next
 *                     exercise. NO speech; earcon + haptic only. A Coach that
 *                     says "Logged, set three, squats, one eighty-five, eight
 *                     reps" thirty times a session gets muted by week two.
 *   read_back       — anything carrying parsed NUMBERS, and pain notes. Digits
 *                     are the highest-error class in gym noise, so numbers are
 *                     always read back with a correction slot.
 *   deliberate      — destructive, confirmation-gated, trainer-only, or
 *                     cross-client. Requires an explicit spoken yes.
 *
 * THE ESCALATION RULE
 *   Tiers only ever escalate. If two rules apply, the stricter wins. A command
 *   can never be softened by a later rule — that is how a destructive action
 *   ends up silent.
 *
 * PURE + DEPENDENCY-FREE so it is directly testable.
 *
 * ⚠ STATUS: DELIBERATELY UNCONSUMED (Rule 27 = dormant), as of 2026-07-25.
 *   Nothing calls this yet, and that is intentional rather than an oversight.
 *   Wiring it into the live dispatcher today would gate commands behind a
 *   spoken confirmation that no surface can yet collect — it would BREAK the
 *   command lane, not protect it. The tier contract has to exist BEFORE the
 *   voice surface so each surface consumes one rule instead of inventing its
 *   own; the consumer is the voice/intent-bar slice.
 *
 *   Labeled explicitly because this program has already lost weeks to an
 *   unlabeled dormant file: `eval/coachCommandCenterGoldenScenarios.mjs` was
 *   written with exactly the right shape, never imported, flagged as an open
 *   item in REPO-HYGIENE-INVENTORY-2026-07-16.md, and still sat unwired when
 *   C4 finally adopted it. A dormant file that says so is a plan; one that
 *   doesn't is rot. Tracked on Linear so it cannot quietly repeat.
 */

export const TIER_FIRE_AND_FORGET = 'fire_and_forget';
export const TIER_READ_BACK = 'read_back';
export const TIER_DELIBERATE = 'deliberate';
/**
 * REFUSAL outranks deliberate — card 1.2 / finding FF20 (GLM 5.3-flash).
 *
 * `role_not_permitted` used to escalate to DELIBERATE, i.e. "requires an explicit
 * spoken yes". That is a category error: an authorization failure became a
 * NEGOTIATION. A client who says "delete the workout" must not be walked into a
 * confirmation flow for a command they may never run — rendering "say yes to
 * cancel the session" at them teaches every actor that gates are persuadable.
 * Confirmation is not authorization.
 */
export const TIER_REFUSAL = 'refusal';

/** Ordered weakest → strictest. Index is the escalation rank. */
export const TIER_ORDER = [TIER_FIRE_AND_FORGET, TIER_READ_BACK, TIER_DELIBERATE, TIER_REFUSAL];

/** Return the stricter of two tiers. Never de-escalates. */
export function escalate(a, b) {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

/**
 * Param names whose values are spoken numbers. These drive read-back because a
 * misheard digit silently corrupts a training record — "one eighty-five" heard
 * as "one fifteen" is a plausible weight, so nothing downstream can catch it.
 */
const NUMERIC_SLOTS = new Set([
  'weight', 'reps', 'sets', 'duration', 'intensity', 'rpe', 'restSeconds',
  'painLevel', 'pain_level', 'distance', 'calories', 'heartRate', 'tempo',
]);

/** Params that carry clinical free text — always read back before recording. */
const CLINICAL_SLOTS = new Set([
  'painNote', 'painDescription', 'description', 'injuryNotes', 'symptoms',
]);

const hasAny = (params, keys) =>
  !!params && Object.keys(params).some((k) => keys.has(k) && params[k] !== undefined && params[k] !== null);

/**
 * Derive the voice confirmation tier for one command invocation.
 *
 * @param {Object} command   CommandDefinition (destructive, requiresConfirmation, roleRequired, requiresClientRef)
 * @param {Object} [params]  resolved params for this invocation
 * @param {Object} [ctx]
 * @param {number|null} [ctx.lockedClientId]  the client the trainer has locked
 * @param {number|null} [ctx.targetClientId]  the client this invocation acts on
 * @param {string} [ctx.actorRole]            'admin' | 'trainer' | 'client'
 * @returns {{ tier: string, reasons: string[], requiresSpokenYes: boolean, readBackSlots: string[] }}
 */
export function resolveVoiceConfirmationTier(command = {}, params = {}, ctx = {}) {
  let tier = TIER_FIRE_AND_FORGET;
  const reasons = [];

  // ── Deliberate triggers ──────────────────────────────────────────────────
  if (command.destructive === true) {
    tier = escalate(tier, TIER_DELIBERATE);
    reasons.push('destructive');
  }
  if (command.requiresConfirmation === true) {
    tier = escalate(tier, TIER_DELIBERATE);
    reasons.push('requiresConfirmation');
  }

  // Cross-client: acting on someone other than the locked client. This is the
  // catastrophic case — a misheard pronoun writing to the wrong record — so it
  // is never silent, regardless of how harmless the command looks.
  const { lockedClientId = null, targetClientId = null } = ctx;
  const identityCrossing = [];
  if (
    lockedClientId !== null && targetClientId !== null
    && Number(lockedClientId) !== Number(targetClientId)
  ) {
    tier = escalate(tier, TIER_DELIBERATE);
    reasons.push('cross_client');
    identityCrossing.push('cross_client');
  }

  // THE BETWEEN-CASE — card 1.2 / finding F16g (GLM 5.3). `cross_client` needs
  // BOTH ids; `unresolved_client` needs BOTH null. An utterance that NAMES a
  // client while nothing is locked ("cancel Jordan's session" with no selection)
  // satisfies neither and escalated to nothing — yet it is exactly the
  // misheard-name case, arriving without a lock to compare against.
  if (targetClientId !== null && lockedClientId === null) {
    tier = escalate(tier, TIER_DELIBERATE);
    reasons.push('unlocked_target');
    identityCrossing.push('unlocked_target');
  }

  // A command that NEEDS a client but has none resolved must not proceed
  // silently — unattributed is the shape a wrong-client write takes.
  if (command.requiresClientRef === true && targetClientId === null && lockedClientId === null) {
    tier = escalate(tier, TIER_DELIBERATE);
    reasons.push('unresolved_client');
  }

  // Trainer-only command reached by a client — a client joking "delete the
  // workout" into a propped-up phone is not hypothetical.
  const roleRequired = Array.isArray(command.roleRequired) ? command.roleRequired : null;
  if (roleRequired && ctx.actorRole && !roleRequired.includes(ctx.actorRole)) {
    tier = escalate(tier, TIER_REFUSAL);   // FF20: refuse, never negotiate
    reasons.push('role_not_permitted');
  }

  // ── Read-back triggers ───────────────────────────────────────────────────
  const readBackSlots = [];
  if (hasAny(params, NUMERIC_SLOTS)) {
    readBackSlots.push(...Object.keys(params).filter((k) => NUMERIC_SLOTS.has(k)));
    tier = escalate(tier, TIER_READ_BACK);
    reasons.push('numeric_slots');
  }
  if (hasAny(params, CLINICAL_SLOTS)) {
    readBackSlots.push(...Object.keys(params).filter((k) => CLINICAL_SLOTS.has(k)));
    tier = escalate(tier, TIER_READ_BACK);
    reasons.push('clinical_slots');
  }

  // CHANNEL-SPLIT (mechanism M3): the ears that misheard the command must not be
  // the ears that authorize it. An identity-crossing WRITE arriving by voice
  // demands a PHYSICAL confirm — a tap, or a typed digit — because a spoken
  // "yes" is produced by the same channel that produced the mistake. Text and UI
  // input keep the ordinary spoken/tap ceremony: over-escalation is its own bug
  // (a confirmation that always fires equals no confirmation).
  const physical = ctx.inputMode === 'voice' && identityCrossing.length > 0 && tier !== TIER_REFUSAL;
  if (physical) reasons.push('voice_identity_crossing');

  return {
    tier,
    reasons,
    // A refusal is not a confirmation: it collects nothing, spoken or otherwise.
    requiresSpokenYes: tier === TIER_DELIBERATE && !physical,
    physical,
    readBackSlots,
  };
}

export default resolveVoiceConfirmationTier;
