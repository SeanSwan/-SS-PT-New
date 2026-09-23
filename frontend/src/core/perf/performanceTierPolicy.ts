// frontend/src/core/perf/performanceTierPolicy.ts
//
// Canonical capability resolution — pure, subscription-free, side-effect-free.
//
// Contract: BLUEPRINT-cinematic-frontend-2026-09-19/03-contracts.md
//   "Capability contract" (P2 amendment, replaces P1 "Canonical tier policy").
//
// Why `phase` exists (Astra F05, the bootstrap-latch defect):
//   P1 said "before client detection, return `reduced`" AND "a disabled/failed
//   signature does not restart during the same home mount." Composed, those two
//   clauses let a conforming implementation read the pre-detection `reduced` as a
//   real decision and permanently latch the signature off before detection ever
//   finished — silently. Separating `phase` from `tier` removes the composition:
//   `pending` suppresses motion but is NOT a tier decision, so nothing may latch
//   disablement from it.
//
// This module performs no detection, owns no subscriptions, and touches no DOM.

/** The three canonical tiers. Every other vocabulary is a legacy alias. */
export type CanonicalTier = 'full' | 'lean' | 'reduced';

/**
 * Whether capability has actually been resolved yet.
 *
 * `pending` is deliberately NOT a tier. Treating it as one is the F05 defect.
 */
export type CapabilityPhase = 'pending' | 'ready';

/** Raw device/network readings. Every field is optional — absence is neutral. */
export type CapabilitySnapshot = Readonly<{
  reducedMotion: boolean;
  cores?: number;
  memoryGiB?: number;
  saveData?: boolean;
  effectiveType?: string;
}>;

/** Resolved capability state. This is what consumers read. */
export type CapabilityState = Readonly<{
  phase: CapabilityPhase;
  tier: CanonicalTier;
}>;

/** A state that is known to be resolved. */
export type Resolution = Readonly<{ phase: 'ready'; tier: CanonicalTier }>;

/**
 * Initial state before any detection has run.
 *
 * `reduced` is the safe *default presentation*, but `pending` is what stops that
 * default from being mistaken for a decision. See module header.
 */
export const INITIAL_CAPABILITY_STATE: CapabilityState = Object.freeze({
  phase: 'pending',
  tier: 'reduced',
} as const);

/** Connection types treated as slow. `4g` is not slow; unknown strings are neutral. */
const SLOW_EFFECTIVE_TYPES: ReadonlySet<string> = new Set(['slow-2g', '2g', '3g']);

/**
 * A numeric reading is usable only if it is finite and strictly positive.
 * Non-integer core counts are treated as unknown (hardwareConcurrency should be
 * an integer; a fractional value signals a spoofed or broken environment).
 */
function usableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function usableCoreCount(value: unknown): value is number {
  return usableNumber(value) && Number.isInteger(value);
}

/**
 * Resolve a snapshot into a canonical tier.
 *
 * Ordering is significant and is asserted by the P1 test suite:
 *   1. reduced-motion preference   -> reduced
 *   2. low cores OR low memory     -> lean
 *   3. save-data OR slow network   -> lean
 *   4. known cores >= 8            -> full
 *   5. otherwise                   -> lean
 *
 * `full` is admission to an *attempted* enhancement, not a GPU guarantee. WebGL
 * may still fail safely downstream; that is the lifecycle contract's problem.
 */
export function resolveTier(snapshot: CapabilitySnapshot): CanonicalTier {
  if (snapshot.reducedMotion) {
    return 'reduced';
  }

  const cores = snapshot.cores;
  const memoryGiB = snapshot.memoryGiB;

  if (usableCoreCount(cores) && cores < 4) {
    return 'lean';
  }

  if (usableNumber(memoryGiB) && memoryGiB < 4) {
    return 'lean';
  }

  if (snapshot.saveData === true) {
    return 'lean';
  }

  if (typeof snapshot.effectiveType === 'string' && SLOW_EFFECTIVE_TYPES.has(snapshot.effectiveType)) {
    return 'lean';
  }

  if (usableCoreCount(cores) && cores >= 8) {
    return 'full';
  }

  return 'lean';
}

/** Resolve a snapshot into a full ready-state. */
export function resolveCapability(snapshot: CapabilitySnapshot): Resolution {
  return { phase: 'ready', tier: resolveTier(snapshot) };
}

/** The relative order used by `lowerTier`. Lower index = more capable. */
const TIER_ORDER: readonly CanonicalTier[] = ['full', 'lean', 'reduced'];

/**
 * Return whichever tier is the *lower* of the two.
 *
 * Used by `forceTier`, which may only ever restrict: a debug override must not be
 * able to grant eligibility that the detected hardware/network did not.
 */
export function lowerTier(a: CanonicalTier, b: CanonicalTier): CanonicalTier {
  return TIER_ORDER.indexOf(a) >= TIER_ORDER.indexOf(b) ? a : b;
}

/**
 * Apply an optional override to a resolved state.
 *
 * Contract: "`forceTier` applies the lower of requested and detected tiers. It
 * cannot create eligibility above restrictions."
 *
 * An override is ignored entirely while `phase === 'pending'` — it cannot resolve
 * detection on its own, because resolving is what would let a caller latch from a
 * state that was never measured.
 */
export function applyOverride(
  state: CapabilityState,
  override?: CanonicalTier,
): CapabilityState {
  if (override === undefined || state.phase !== 'ready') {
    return state;
  }

  const tier = lowerTier(override, state.tier);
  return tier === state.tier ? state : { phase: 'ready', tier };
}

/**
 * Whether the signature enhancement may be attempted.
 *
 * Requires a *resolved* state at `full`. Critically, `pending` returns false for
 * *motion suppression* but callers must not treat this as a terminal latch — see
 * `isLatchedFailure`. This is the single most misusable predicate in the package,
 * so it is deliberately expressed rather than left to callers to reconstruct.
 */
export function mayAttemptEnhancement(state: CapabilityState): boolean {
  return state.phase === 'ready' && state.tier === 'full';
}

/**
 * Whether motion should be suppressed right now.
 *
 * True while pending (we have not earned the right to animate yet) and whenever
 * the resolved tier is not `full`. Suppression is reversible while pending.
 */
export function isMotionSuppressed(state: CapabilityState): boolean {
  return state.phase === 'pending' || state.tier !== 'full';
}

/**
 * Whether this state is a *terminal* reason to keep the signature disabled for
 * the rest of the route mount.
 *
 * This is the guard that makes the F05 fix enforceable: a pending state is never
 * terminal, so no implementation can latch disablement from it.
 */
export function isLatchedFailure(state: CapabilityState): boolean {
  return state.phase === 'ready' && state.tier !== 'full';
}

/**
 * Legacy vocabulary adapters.
 *
 * Two competing vocabularies ship today and both must keep working during
 * migration (03-contracts.md "Vocabulary migration"):
 *   provider: `enhanced | standard | minimal`
 *   home:     `full | balanced | essential`
 *
 * These are *lossy projections to old names only* — they read canonical state and
 * contain no capability checks of their own. They are deleted once the consumer
 * sweep completes.
 */
export type LegacyProviderTier = 'enhanced' | 'standard' | 'minimal';
export type LegacyHomeTier = 'full' | 'balanced' | 'essential';

export function toLegacyProviderTier(tier: CanonicalTier): LegacyProviderTier {
  switch (tier) {
    case 'full':
      return 'enhanced';
    case 'lean':
      return 'standard';
    case 'reduced':
      return 'minimal';
  }
}

export function toLegacyHomeTier(tier: CanonicalTier): LegacyHomeTier {
  switch (tier) {
    case 'full':
      return 'full';
    case 'lean':
      return 'balanced';
    case 'reduced':
      return 'essential';
  }
}

/** Narrow an arbitrary string to a canonical tier, or `undefined` if it is not one. */
export function asCanonicalTier(value: unknown): CanonicalTier | undefined {
  return value === 'full' || value === 'lean' || value === 'reduced' ? value : undefined;
}

/**
 * The animation tier as received by a leaf section component.
 *
 * This is a **deprecated structural alias**. Roughly twenty section components
 * across `HomePage` and `About` declare this union as a prop type and compare
 * against `'reduced'`. Rather than rewrite all of them in the capability slice
 * (which the contract explicitly forbids — *"Do not call this a twelve-section
 * hook migration"*), they share this one alias so the canonical vocabulary has a
 * single definition.
 *
 * New code should use `CanonicalTier` and read `useAnimationTier()` directly.
 *
 * @deprecated Import `CanonicalTier` instead.
 */
export type SectionAnimationTier = CanonicalTier;
