/**
 * useAnimationTier — Performance-tiered animation detection
 * ==========================================================
 * Detects device capability and returns one of three animation tiers:
 *   - full: 8+ cores, powerful desktop/flagship — all effects active
 *   - balanced: 4-7 cores, mid-range — section reveals, glass blur, simpler hovers
 *   - essential: <4 cores OR prefers-reduced-motion — no animations, content-first
 *
 * Golden Rule: A budget phone should NEVER see janky animations.
 * Better NO animation than choppy 15fps animation.
 */

import { useState, useEffect, useMemo } from 'react';
import { useReducedMotion } from './useReducedMotion';

export type AnimationTier = 'full' | 'balanced' | 'essential';

export function useAnimationTier(): AnimationTier {
  const prefersReduced = useReducedMotion();
  const [tier, setTier] = useState<AnimationTier>('balanced');

  useEffect(() => {
    if (prefersReduced) {
      setTier('essential');
      return;
    }

    const cores = navigator.hardwareConcurrency || 4;

    if (cores >= 8) {
      setTier('full');
    } else if (cores >= 4) {
      setTier('balanced');
    } else {
      setTier('essential');
    }
  }, [prefersReduced]);

  return tier;
}

/**
 * Derived helpers — call inside components that use useAnimationTier().
 * Avoids repeating tier comparisons everywhere.
 */
export function useTierFlags(tier: AnimationTier) {
  return useMemo(() => ({
    showParallax: tier === 'full',
    showParticles: tier === 'full',
    showBlur: tier !== 'essential',
    showCharSplit: tier === 'full',
    showStagger: tier !== 'essential',
    showHoverEffects: tier !== 'essential',
    showGlow: tier !== 'essential',
    isEssential: tier === 'essential',
    isFull: tier === 'full',
  }), [tier]);
}
