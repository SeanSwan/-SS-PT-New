/**
 * Dashboards v2 — motion derived from the shipped Lane-A tier system (KIMI-DASHBOARDS-CORRECTED §4.1).
 * NO bespoke motion tokens. `resolveMotionTier(motionSurfaceId, capability)` × `useAnimationTier()`
 * → the density's motion budget. M1 (admin/trainer) = opacity-only 120ms, no stagger, charts static.
 * M2 (client/user) = 200ms ease-out entrances, ≤6×40ms stagger, chart fade ≤300ms. Transform/opacity only.
 */
import { useMemo } from 'react';
import { resolveMotionTier, tierAllows, useAnimationTier } from '../lensBindings';
import type { MotionSurfaceId } from '../types';

export interface DensityMotion {
  entranceMs: number;
  staggerMs: number;
  maxStagger: number;
  chartAnimate: boolean;
}

export function useDensityMotion(motionSurfaceId: MotionSurfaceId): DensityMotion {
  const capability = useAnimationTier();
  return useMemo(() => {
    const tier = resolveMotionTier(motionSurfaceId, capability);
    const m2 = tierAllows(tier, 'M2');
    return {
      entranceMs: m2 ? 200 : 120,
      staggerMs: m2 ? 40 : 0,
      maxStagger: m2 ? 6 : 0,
      chartAnimate: m2, // M1 → Victory animate={false}
    };
  }, [motionSurfaceId, capability]);
}
