// frontend/src/core/perf/PerformanceTierProvider.tsx

import React, { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logger } from '../../utils/logger';
import { PerformanceTierContext } from './PerformanceTierContext';
import {
  applyOverride,
  INITIAL_CAPABILITY_STATE,
  resolveCapability,
  toLegacyProviderTier,
  type CanonicalTier,
  type CapabilitySnapshot,
  type CapabilityState,
} from './performanceTierPolicy';

interface PerformanceTierProviderProps {
  children: ReactNode;
  /**
   * Force a specific canonical tier (useful for testing/debugging).
   *
   * Applies the *lower* of requested and detected — it can only restrict, never
   * elevate. See `applyOverride`.
   */
  forceTier?: CanonicalTier;
}

/** Minimal shapes for the non-standard APIs this provider reads. */
interface ConnectionLike {
  saveData?: boolean;
  effectiveType?: string;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
}

type NavigatorWithCapabilities = Navigator & {
  deviceMemory?: number;
  connection?: ConnectionLike;
};

/**
 * Read current device/network capability.
 *
 * Pure with respect to React state: it reads live browser globals and returns a
 * plain snapshot. Missing APIs are neutral (`undefined`), never "low".
 */
function readSnapshot(): CapabilitySnapshot {
  const nav = navigator as NavigatorWithCapabilities;

  return {
    reducedMotion:
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    cores: nav.hardwareConcurrency,
    memoryGiB: nav.deviceMemory,
    saveData: nav.connection?.saveData,
    effectiveType: nav.connection?.effectiveType,
  };
}

/** Subscribe to a media query; returns an unsubscribe fn. Handles legacy Safari. */
function subscribeMediaQuery(query: string, onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }

  const mql = window.matchMedia(query);

  if (typeof mql.addEventListener === 'function') {
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }

  // Legacy addListener path (older Safari). Still shipped in the wild.
  const legacy = mql as MediaQueryList & {
    addListener?: (listener: () => void) => void;
    removeListener?: (listener: () => void) => void;
  };

  if (typeof legacy.addListener === 'function') {
    legacy.addListener(onChange);
    return () => legacy.removeListener?.(onChange);
  }

  return () => {};
}

/**
 * Performance Tier Provider
 *
 * Owns capability detection and the *single* set of subscriptions for the app.
 *
 * Fixes over the previous implementation (packet defect §6.2, effect churn):
 *   1. The detection effect no longer depends on resolved tier state. The old
 *      `[forceTier, tier]` dependency tore down and re-added the connection
 *      listener on every tier change — the listener churned precisely when the
 *      network was unstable, which is when it matters most.
 *   2. A single effect now subscribes to both reduced-motion AND connection, and
 *      re-resolves from a fresh snapshot on either signal.
 *   3. Re-resolution uses a functional updater, so it never reads stale state.
 *   4. `phase` starts `pending` and resolves on the first effect pass, so a
 *      pre-detection `reduced` can no longer latch the signature off (F05).
 *
 * @example
 * ```tsx
 * <PerformanceTierProvider>
 *   <App />
 * </PerformanceTierProvider>
 * ```
 */
export const PerformanceTierProvider: React.FC<PerformanceTierProviderProps> = ({
  children,
  forceTier,
}) => {
  const [state, setState] = useState<CapabilityState>(INITIAL_CAPABILITY_STATE);

  // Keep the latest override in a ref so the detection effect never needs to
  // re-subscribe when `forceTier` changes.
  const overrideRef = useRef<CanonicalTier | undefined>(forceTier);
  overrideRef.current = forceTier;

  // Re-resolve from a fresh snapshot. Stable across renders.
  const recompute = useCallback(() => {
    setState((previous) => {
      const next = applyOverride(resolveCapability(readSnapshot()), overrideRef.current);

      if (previous.phase === next.phase && previous.tier === next.tier) {
        return previous; // no-op update; avoids a needless render
      }

      logger.log(`[PerformanceTier] ${previous.phase}/${previous.tier} -> ${next.phase}/${next.tier}`);
      return next;
    });
  }, []);

  // Single effect: resolve once, then keep exactly two subscriptions alive.
  useEffect(() => {
    recompute();

    const unsubscribeMotion = subscribeMediaQuery('(prefers-reduced-motion: reduce)', recompute);

    // Narrow once, into a local, so both the subscribe and unsubscribe paths
    // agree on the same binding (and TypeScript can prove it is callable).
    const connection = (navigator as NavigatorWithCapabilities).connection;
    const addConnectionListener =
      typeof connection?.addEventListener === 'function'
        ? connection.addEventListener.bind(connection)
        : undefined;
    const removeConnectionListener =
      typeof connection?.removeEventListener === 'function'
        ? connection.removeEventListener.bind(connection)
        : undefined;

    addConnectionListener?.('change', recompute);

    return () => {
      unsubscribeMotion();
      removeConnectionListener?.('change', recompute);
    };
  }, [recompute]);

  // A changed override must re-apply immediately, without touching the
  // subscriptions above.
  useEffect(() => {
    recompute();
  }, [forceTier, recompute]);

  /**
   * Legacy string view, kept so `usePerformanceTier()` consumers are unaffected.
   * The context value is memoised so consumers do not re-render needlessly.
   */
  const value = useMemo(() => state, [state.phase, state.tier]);

  return (
    <PerformanceTierContext.Provider value={value}>
      {children}
    </PerformanceTierContext.Provider>
  );
};

/**
 * Human-readable legacy tier for logging/diagnostics.
 * @deprecated Prefer reading canonical state.
 */
export function legacyTierOf(state: CapabilityState) {
  return toLegacyProviderTier(state.tier);
}
