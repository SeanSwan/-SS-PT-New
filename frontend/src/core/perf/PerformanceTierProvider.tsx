// frontend/src/core/perf/PerformanceTierProvider.tsx

import React, { useState, useEffect, ReactNode } from 'react';
import { PerformanceTierContext, PerformanceTier } from './PerformanceTierContext';

interface PerformanceTierProviderProps {
  children: ReactNode;
  /**
   * Force a specific tier (useful for testing/debugging)
   * If not provided, tier is auto-detected
   */
  forceTier?: PerformanceTier;
}

/**
 * Performance Tier Provider
 *
 * Automatically detects device capabilities and provides appropriate tier
 * for graceful feature degradation across the application.
 *
 * Detection Strategy:
 * 1. Check user preferences (prefers-reduced-motion) → minimal
 * 2. Check hardware (CPU cores < 4 OR memory < 4GB) → minimal
 * 3. Check network (2G OR save-data enabled) → standard
 * 4. Default → enhanced
 *
 * Performance Tiers:
 * - **enhanced**: WebGL animations, 500+ particles, 60 FPS target
 * - **standard**: Canvas 2D, 200 particles, 30 FPS target
 * - **minimal**: Static gradients, no animations
 *
 * @example
 * ```tsx
 * // Wrap your app
 * import { PerformanceTierProvider } from './core/perf/PerformanceTierProvider';
 *
 * <PerformanceTierProvider>
 *   <App />
 * </PerformanceTierProvider>
 * ```
 *
 * @example
 * ```tsx
 * // Force tier for testing
 * <PerformanceTierProvider forceTier="minimal">
 *   <App />
 * </PerformanceTierProvider>
 * ```
 */
export const PerformanceTierProvider: React.FC<PerformanceTierProviderProps> = ({
  children,
  forceTier
}) => {
  const [tier, setTier] = useState<PerformanceTier>('standard'); // Safe default while detecting

  useEffect(() => {
    // If tier is forced (e.g., for testing), use it
    if (forceTier) {
      setTier(forceTier);
      return;
    }

    /**
     * Detect performance tier based on device capabilities
     */
    const detectTier = (): PerformanceTier => {
      // 1. Check user preference for reduced motion (highest priority)
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        console.info('[PerformanceTier] User prefers reduced motion → minimal');
        return 'minimal';
      }

      // 2. Check hardware limitations
      const memory = (navigator as any).deviceMemory; // In GB (e.g., 8)
      const cores = navigator.hardwareConcurrency; // Number of CPU cores (e.g., 4)

      if (cores !== undefined && cores < 4) {
        console.info(`[PerformanceTier] Low CPU cores (${cores}) → minimal`);
        return 'minimal';
      }

      if (memory !== undefined && memory < 4) {
        console.info(`[PerformanceTier] Low memory (${memory}GB) → minimal`);
        return 'minimal';
      }

      // 3. Check network conditions
      const connection = (navigator as any).connection;

      if (connection) {
        // Check for save-data mode
        if (connection.saveData) {
          console.info('[PerformanceTier] Save-data mode enabled → standard');
          return 'standard';
        }

        // Check for slow network (2G)
        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          console.info(`[PerformanceTier] Slow network (${connection.effectiveType}) → standard`);
          return 'standard';
        }
      }

      // 4. Default to enhanced for capable devices
      console.info('[PerformanceTier] Device capable → enhanced');
      return 'enhanced';
    };

    // Run detection
    const detectedTier = detectTier();
    setTier(detectedTier);

    // Optional: Re-detect if network conditions change
    const connection = (navigator as any).connection;
    if (connection) {
      const handleConnectionChange = () => {
        const newTier = detectTier();
        if (newTier !== tier) {
          console.info(`[PerformanceTier] Network changed, tier updated: ${tier} → ${newTier}`);
          setTier(newTier);
        }
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, [forceTier, tier]);

  return (
    <PerformanceTierContext.Provider value={tier}>
      {children}
    </PerformanceTierContext.Provider>
  );
};
