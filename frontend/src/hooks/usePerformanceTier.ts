// frontend/src/hooks/usePerformanceTier.ts

import { useContext } from 'react';
import { PerformanceTierContext } from '../core/perf/PerformanceTierContext';

/**
 * Performance Tier Hook
 *
 * Detects device capabilities and returns appropriate tier for feature delivery.
 * Used by components like LivingConstellation to gracefully degrade on low-end devices.
 *
 * @returns {PerformanceTier} 'enhanced' | 'standard' | 'minimal'
 *
 * Tiers:
 * - enhanced: High-end devices (WebGL, 500+ particles, 60 FPS)
 * - standard: Mid-range devices (Canvas 2D, 200 particles, 30 FPS)
 * - minimal: Low-end devices (Static gradient, no animations)
 *
 * Detection factors:
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
export function usePerformanceTier() {
  const context = useContext(PerformanceTierContext);

  if (context === undefined) {
    throw new Error(
      'usePerformanceTier must be used within a PerformanceTierProvider. ' +
      'Wrap your app with <PerformanceTierProvider> in App.tsx or index.tsx.'
    );
  }

  return context;
}
