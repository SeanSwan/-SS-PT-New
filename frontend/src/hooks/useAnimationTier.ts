/**
 * useAnimationTier — Performance-tiered animation tier for the home surface
 * ========================================================================
 * Reads the app's single capability authority (`PerformanceTierProvider`) and
 * returns a canonical animation tier:
 *   - full:    capable device, no restrictions  — all effects active
 *   - lean:    mid-range, slow network, or save-data — section reveals, glass
 *              blur, simpler hovers
 *   - reduced: prefers-reduced-motion or otherwise restricted — no animations,
 *              content-first
 *
 * Golden Rule: A budget phone should NEVER see janky animations.
 * Better NO animation than choppy 15fps animation.
 *
 * Migration note (A3): this hook used to run its OWN detector — reading
 * `navigator.hardwareConcurrency` and the reduced-motion media query
 * independently of `PerformanceTierProvider`. That produced two competing
 * authorities that could disagree within one tree. It now reads the provider and
 * performs no detection of its own.
 */

import { useContext, useMemo } from 'react';
import { PerformanceTierContext } from '../core/perf/PerformanceTierContext';
import type { CanonicalTier } from '../core/perf/performanceTierPolicy';

/**
 * Canonical animation tier.
 *
 * Was `'full' | 'balanced' | 'essential'`. `'balanced'` is now `'lean'` and
 * `'essential'` is now `'reduced'`, matching the canonical vocabulary in
 * `03-contracts.md` "Vocabulary migration".
 */
export type AnimationTier = CanonicalTier;

/**
 * The current canonical animation tier.
 *
 * @example
 * ```tsx
 * const tier = useAnimationTier();
 * const { isFull, showGlow } = useTierFlags(tier);
 * ```
 */
export function useAnimationTier(): AnimationTier {
  return useContext(PerformanceTierContext).tier;
}

/**
 * Derived helpers — call inside components that use useAnimationTier().
 * Avoids repeating tier comparisons everywhere.
 */
export function useTierFlags(tier: AnimationTier) {
  return useMemo(
    () => ({
      showParallax: tier === 'full',
      showParticles: tier === 'full',
      showBlur: tier !== 'reduced',
      showCharSplit: tier === 'full',
      showStagger: tier !== 'reduced',
      showHoverEffects: tier !== 'reduced',
      showGlow: tier !== 'reduced',
      /** @deprecated Use `isReduced`. Retained only during the consumer sweep. */
      isEssential: tier === 'reduced',
      isReduced: tier === 'reduced',
      isLean: tier === 'lean',
      isFull: tier === 'full',
    }),
    [tier],
  );
}
