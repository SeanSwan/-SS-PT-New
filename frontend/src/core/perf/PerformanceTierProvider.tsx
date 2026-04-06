// frontend/src/core/perf/PerformanceTierProvider.tsx

import React, { ReactNode, useEffect, useState } from 'react';
import { logger } from '../../utils/logger';
import { PerformanceTier, PerformanceTierContext } from './PerformanceTierContext';

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
 * 1. Check user preferences (prefers-reduced-motion) -> minimal
 * 2. Check hardware (CPU cores < 4 OR memory < 4GB) -> minimal
 * 3. Check network (2G OR save-data enabled) -> standard
 * 4. Default -> enhanced
 *
 * Performance Tiers:
 * - **enhanced**: WebGL animations, 500+ particles, 60 FPS target
 * - **standard**: Canvas 2D, 200 particles, 30 FPS target
 * - **minimal**: Static gradients, no animations
 *
 * @example
 * ```tsx
 * import { PerformanceTierProvider } from './core/perf/PerformanceTierProvider';
 *
 * <PerformanceTierProvider>
 *   <App />
 * </PerformanceTierProvider>
 * ```
 *
 * @example
 * ```tsx
 * <PerformanceTierProvider forceTier="minimal">
 *   <App />
 * </PerformanceTierProvider>
 * ```
 */
export const PerformanceTierProvider: React.FC<PerformanceTierProviderProps> = ({
  children,
  forceTier,
}) => {
  const [tier, setTier] = useState<PerformanceTier>('standard');

  useEffect(() => {
    if (forceTier) {
      setTier(forceTier);
      return;
    }

    const detectTier = (): PerformanceTier => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        logger.log('[PerformanceTier] User prefers reduced motion -> minimal');
        return 'minimal';
      }

      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      const cores = navigator.hardwareConcurrency;

      if (cores !== undefined && cores < 4) {
        logger.log(`[PerformanceTier] Low CPU cores (${cores}) -> minimal`);
        return 'minimal';
      }

      if (memory !== undefined && memory < 4) {
        logger.log(`[PerformanceTier] Low memory (${memory}GB) -> minimal`);
        return 'minimal';
      }

      const connection = (navigator as Navigator & {
        connection?: {
          saveData?: boolean;
          effectiveType?: string;
          addEventListener?: (type: string, listener: () => void) => void;
          removeEventListener?: (type: string, listener: () => void) => void;
        };
      }).connection;

      if (connection) {
        if (connection.saveData) {
          logger.log('[PerformanceTier] Save-data mode enabled -> standard');
          return 'standard';
        }

        if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
          logger.log(`[PerformanceTier] Slow network (${connection.effectiveType}) -> standard`);
          return 'standard';
        }
      }

      logger.log('[PerformanceTier] Device capable -> enhanced');
      return 'enhanced';
    };

    const detectedTier = detectTier();
    setTier(detectedTier);

    const connection = (navigator as Navigator & {
      connection?: {
        addEventListener?: (type: string, listener: () => void) => void;
        removeEventListener?: (type: string, listener: () => void) => void;
      };
    }).connection;

    if (connection?.addEventListener && connection?.removeEventListener) {
      const handleConnectionChange = () => {
        const newTier = detectTier();
        if (newTier !== tier) {
          logger.log(`[PerformanceTier] Network changed, tier updated: ${tier} -> ${newTier}`);
          setTier(newTier);
        }
      };

      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener?.('change', handleConnectionChange);
    }
  }, [forceTier, tier]);

  return (
    <PerformanceTierContext.Provider value={tier}>
      {children}
    </PerformanceTierContext.Provider>
  );
};
