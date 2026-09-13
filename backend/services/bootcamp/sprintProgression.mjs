/**
 * ============================================================================
 * FILE: sprintProgression.mjs — R-H20 (slice E).
 *
 * PURPOSE
 *   The progression-strategy table and the ONE place that decides which intensity
 *   modifier a Sprint week actually gets.
 *
 * WHY IT IS ITS OWN MODULE
 *   `sprintGenerator.mjs` sits at the 300-line cap (rule 4), and the precedence
 *   rule below is the part that was wrong — so it is the part that most needs to
 *   be readable and directly testable.
 *
 * THE BUG THIS MODULE EXISTS TO SETTLE
 *   The generator used to compute the week's modifier as
 *       `week.intensityModifier || progressionFn(week.weekNumber, durationWeeks)`
 *   while `sprintCalendarContract.mjs:257` persists `intensityModifier: 1.0` for
 *   every non-deload week. `1.0` is TRUTHY, so `||` short-circuited on every such
 *   week and **every strategy function in this table was unreachable** — a trainer
 *   could pick `undulating`, see it on the sprint card, and receive twelve
 *   identical resolved modifiers.
 *
 *   EVIDENCE. The claim is established by static reasoning (`1.0` is truthy; the
 *   calendar is the only writer of that column) and by execution: re-inlining the
 *   old precedence into `sprintGenerator.mjs` fails
 *   `sprintGeneratorProgressionWiring.test.mjs`, which drives the real generator
 *   and reads the value that actually reaches a generated class — while every test
 *   in `workoutPrescriptionProgression.test.mjs` still passes. An earlier version
 *   of this header cited "a 12-week probe against the real generator [that]
 *   recorded zero calls"; no such probe exists in the repo (the only one
 *   re-evaluates a hand-written expression inline, covers five weeks, and labels
 *   itself synthetic). That citation was removed as unsupported.
 *
 *   FIXED: the strategy now decides unless the week carries an explicit positive
 *   non-scaffold override.
 *
 * KNOWN LIMITATION — NARROWED, and no longer unimplemented
 *   A stored `1.0` still cannot prove a trainer override ON ITS OWN, so it is read as the old
 *   scaffold default and the strategy wins. §6 line 258's answer — `Sprint.metadata.
 *   progressionPolicyV1` with `overrideByWeek`, plus `resolvedByWeek` provenance written at
 *   CREATE (`sprintProgressionPolicy.mjs`) — is now implemented, so a trainer's explicit `1.0`
 *   IS honoured. Only a legacy week that predates the metadata has no way to say so.
 *
 * WHERE THIS RESOLVER IS CALLED
 *   Both generation paths. `regenerateSlot` originally rebuilt a single slot
 *   without resolving a modifier; a hostile review flagged that shipping the
 *   prescription change first (see the note this line used to carry) made that a
 *   real divergence rather than a nil one — a regenerated week silently reverted to
 *   the baseline interval with no `progression` record. Both paths now call
 *   `resolveSprintWeekModifier`.
 * ============================================================================
 */

/** The scaffold's "no explicit override" value (sprintCalendarContract.mjs:257). */
export const SCAFFOLD_MODIFIER = 1.0;

/** The deload week's modifier. Every 4th week (sprintCalendarContract.mjs:251). */
export const DELOAD_MODIFIER = 0.7;

/**
 * Provenance tag for the numeric policy. Contract §6 line 258 names this
 * `progressionPolicyV1`; it is part of the `random` seed so that changing the
 * policy cannot silently re-roll every existing sprint's loads.
 */
export const PROGRESSION_POLICY_VERSION = 'progressionPolicyV1';

/** FNV-1a over the seed parts. Tiny, dependency-free, and stable across processes. */
const hashSeed = (parts) => {
  let hash = 0x811c9dc5;
  for (const char of parts.join(':')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

/** mulberry32 — a deterministic unit value in [0, 1). */
const unitFromSeed = (seed) => {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** ── Progression Strategy Modifiers ───────────────────────────────────
 *  These are REQUESTED WORK-DURATION modifiers (contract §6 line 256), not
 *  clinical intensity prescriptions.
 */
export const PROGRESSION = {
  linear: (weekNum) => {
    const base = 1.0;
    const increment = 0.05 * (weekNum - 1);
    return Math.min(base + increment, 1.5);
  },
  undulating: (weekNum) => {
    const pattern = [1.0, 0.85, 1.1];
    // True modulo: `(weekNum - 1) % 3` is -1 for weekNum 0 and -2 for -1, which
    // indexed OFF the array and returned `undefined`. That was unreachable while
    // the strategies were dead code; making them live made it reachable, and the
    // generator would have recorded "modifier undefined" (sprintGenerator.mjs:153).
    const index = (((weekNum - 1) % pattern.length) + pattern.length) % pattern.length;
    return pattern[index];
  },
  block: (weekNum) => {
    if (weekNum <= 3) return 0.9;
    if (weekNum <= 6) return 1.0;
    if (weekNum <= 9) return 1.1;
    return 1.05;
  },
  /**
   * Same [0.85, 1.15) band as before, but SEEDED rather than drawn from
   * `Math.random()`. Contract §6 line 256: "use a stable seed derived from Sprint
   * ID + ordinal week + policyVersion… Regeneration/retry does not reroll the
   * week's load."
   *
   * PRECISION: what was re-rolled is the RESOLVED MODIFIER — the value this
   * function returns and the generator records. It is NOT yet a prescribed
   * number, because the modifier's only consumer today is an `explanations` log
   * entry (see the KNOWN GAP in sprintGenerator.mjs). An earlier version of this
   * comment said a bare `Math.random()` "re-rolled the load" and could "prescribe
   * different work twice" — that overstated it, and correcting it matters because
   * the unseeded draw WAS a real contract breach of the resolved value.
   */
  random: (weekNum, _totalWeeks, ctx) => {
    const seed = hashSeed([
      ctx?.sprintId ?? 'no-sprint',
      weekNum,
      ctx?.policyVersion ?? PROGRESSION_POLICY_VERSION,
    ]);
    return 0.85 + unitFromSeed(seed) * 0.3;
  },
};

/**
 * The legacy stored-value band contract §6 line 258 accepts as an override:
 * "legacy non-1 values are retained as legacy overrides if finite and within
 * 0.7-1.5. Out-of-range legacy values require correction, not silent clamping."
 */
export const LEGACY_OVERRIDE_MIN = 0.7;
export const LEGACY_OVERRIDE_MAX = 1.5;

const isUsableModifier = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Where a resolved modifier came from. Reported so the UI can display it. */
export const MODIFIER_SOURCE = Object.freeze({
  DELOAD: 'deload',
  EXPLICIT_OVERRIDE: 'explicit_override',
  LEGACY_OVERRIDE: 'legacy_override',
  STRATEGY: 'strategy',
});

/**
 * Which intensity modifier a week gets, AND where that value came from.
 *
 * Precedence, per contract §6 line 258:
 *   1. DELOAD wins outright, always — "deload takes precedence while enabled".
 *   2. An EXPLICIT override recorded in `Sprint.metadata.progressionPolicyV1`
 *      (keyed by ordinal week) is honoured **even when it equals 1.0**. This is the
 *      whole point of the metadata: the persisted column cannot distinguish a
 *      trainer's deliberate 1.0 from the scaffold default, and line 258 says "a PUT
 *      containing intensityModifier marks that week explicit even when it equals
 *      1.0".
 *   3. LEGACY inference from the stored column: a non-1 finite value inside
 *      0.7-1.5 is retained as a legacy override; the scaffold `1.0` is treated as
 *      the old default and routes to the strategy.
 *   4. The strategy.
 *
 * An out-of-range or unusable value is NEVER clamped — it is flagged
 * `requiresCorrection` and the strategy decides, so a bad number cannot silently
 * become a prescription.
 */
export function resolveWeekPolicy({
  week,
  strategy,
  totalWeeks,
  sprintId,
  policyVersion,
  policy,
}) {
  const base = {
    policyVersion: policyVersion ?? PROGRESSION_POLICY_VERSION,
    sprintId,
    weekNumber: week?.weekNumber,
    requiresCorrection: false,
    source: MODIFIER_SOURCE.STRATEGY,
    modifier: null,
  };

  if (week?.isDeloadWeek) {
    return { ...base, modifier: DELOAD_MODIFIER, source: MODIFIER_SOURCE.DELOAD };
  }

  const strategyValue = () => (PROGRESSION[strategy] || PROGRESSION.linear)(
    week.weekNumber,
    totalWeeks,
    { sprintId, policyVersion: base.policyVersion },
  );

  const explicit = policy?.overrideByWeek?.[week.weekNumber];
  if (explicit !== undefined) {
    if (isUsableModifier(explicit)) {
      // Honoured verbatim, INCLUDING 1.0 — that is the recorded trainer intent.
      return { ...base, modifier: explicit, source: MODIFIER_SOURCE.EXPLICIT_OVERRIDE };
    }
    // Explicitly recorded but unusable: flag rather than clamp.
    return { ...base, modifier: strategyValue(), requiresCorrection: true };
  }

  const stored = week?.intensityModifier;
  if (isUsableModifier(stored) && stored !== SCAFFOLD_MODIFIER) {
    if (stored >= LEGACY_OVERRIDE_MIN && stored <= LEGACY_OVERRIDE_MAX) {
      return { ...base, modifier: stored, source: MODIFIER_SOURCE.LEGACY_OVERRIDE };
    }
    // Out of the retained band (e.g. 1.9 or 0.3): "requires correction, not silent
    // clamping". The strategy decides meanwhile and the flag travels with it.
    return { ...base, modifier: strategyValue(), requiresCorrection: true };
  }

  return { ...base, modifier: strategyValue() };
}

/**
 * Which intensity modifier a week gets.
 *
 * Thin wrapper over `resolveWeekPolicy` for callers that only need the number.
 */
export function resolveWeekModifier({ week, strategy, totalWeeks, sprintId, policyVersion, policy }) {
  return resolveWeekPolicy({ week, strategy, totalWeeks, sprintId, policyVersion, policy }).modifier;
}

/**
 * The FULL policy record for one week OF A SPRINT ROW — `modifier` AND where it came from.
 *
 * §6 line 258 requires the compatibility inference to be DISPLAYABLE, and a bare number cannot
 * be: `strategy` vs `explicit_override` vs `legacy_override` vs `deload`, plus
 * `requiresCorrection`, is the difference between "the plan says 1.05" and "you asked for
 * 1.9, which is out of range and needs correcting".
 *
 * It is also the shared entry point for BOTH generation paths, so they cannot drift: they
 * already did once (see the wrapper below).
 *
 * `policyVersion` COMES FROM THE RECORDED POLICY (external review, round 103, HIGH-1). The
 * `random` seed is `sprintId + ordinal week + policyVersion` (§6 line 256), and this function
 * used to pass no version at all — so the seed always used the hardcoded constant while
 * `metadata.progressionPolicyV1.policyVersion` was write-only. Bumping the constant then
 * re-rolled every existing Sprint's random weeks, which is exactly the "regeneration/retry does
 * not reroll the week's load" guarantee §6 line 256 makes. The recorded version is now what
 * seeds the roll, so a resolved week stays resolved.
 */
export function resolveSprintWeekPolicy({ sprint, week, sprintId }) {
  const policy = sprint?.metadata?.['progressionPolicyV1'];
  return resolveWeekPolicy({
    week,
    strategy: sprint?.progressionStrategy,
    totalWeeks: sprint?.durationWeeks,
    sprintId,
    policy,
    policyVersion: policy?.policyVersion,
  });
}

/** The modifier alone, for callers that need only the number. */
export function resolveSprintWeekModifier(args) {
  return resolveSprintWeekPolicy(args).modifier;
}
