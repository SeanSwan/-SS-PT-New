// frontend/src/hooks/usePerformanceTier.ts

import { useContext } from 'react';
import { PerformanceTierContext } from '../core/perf/PerformanceTierContext';
import {
  toLegacyProviderTier,
  type CapabilityState,
  type LegacyProviderTier,
} from '../core/perf/performanceTierPolicy';

/**
 * Canonical capability state hook.
 *
 * Prefer this over `usePerformanceTier()` — it exposes `phase`, which is what
 * lets a caller distinguish "not measured yet" from "measured as restricted".
 * Reading only a tier string is what caused Astra's F05 bootstrap-latch defect.
 *
 * @example
 * ```tsx
 * const { phase, tier } = useCapabilityState();
 * if (phase === 'pending') return <Poster />;   // not a latch
 * if (tier !== 'full') return <Poster />;
 * ```
 */
export function useCapabilityState(): CapabilityState {
  return useContext(PerformanceTierContext);
}

/**
 * Performance Tier Hook (legacy vocabulary)
 *
 * Returns `'enhanced' | 'standard' | 'minimal'`. Retained for existing consumers
 * such as `LivingConstellation`, which switches its rendering strategy on these
 * three strings.
 *
 * This is a *projection* of canonical state and contains no capability checks of
 * its own. New code should use `useCapabilityState()`.
 *
 * Tiers:
 * - enhanced: High-end devices (WebGL, 500+ particles, 60 FPS)
 * - standard: Mid-range devices (Canvas 2D, 200 particles, 30 FPS)
 * - minimal: Low-end devices (Static gradient, no animations)
 *
 * Detection factors (now owned by the provider, not this hook):
 * 1. User preference (prefers-reduced-motion)
 * 2. Hardware (CPU cores, memory)
 * 3. Network (connection speed, save-data)
 *
 * @example
 * ```tsx
 * const performanceTier = usePerformanceTier();
 *
 * if (performanceTier === 'enhanced') {
 *   return <LivingConstellationWebGL />;
 * } else if (performanceTier === 'standard') {
 *   return <LivingConstellationCanvas />;
 * } else {
 *   return <StaticGradientBackground />;
 * }
 * ```
 */
export function usePerformanceTier(): LegacyProviderTier {
  return toLegacyProviderTier(useContext(PerformanceTierContext).tier);
}
