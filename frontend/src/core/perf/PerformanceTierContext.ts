// frontend/src/core/perf/PerformanceTierContext.ts

import { createContext } from 'react';
import {
  INITIAL_CAPABILITY_STATE,
  type CanonicalTier,
  type CapabilityState,
  type LegacyProviderTier,
} from './performanceTierPolicy';

/**
 * Performance Tier Type (legacy provider vocabulary)
 *
 * `enhanced` | `standard` | `minimal`
 *
 * Retained so existing consumers keep compiling during migration. New code should
 * read `CanonicalTier` from `performanceTierPolicy`. See the "Vocabulary
 * migration" table in 03-contracts.md.
 */
export type PerformanceTier = LegacyProviderTier;

/** Re-exported for consumers that want the canonical name. */
export type { CanonicalTier, CapabilityState };

/**
 * Performance Tier Context
 *
 * Now carries the full `CapabilityState`, not a bare tier string. That change is
 * the fix for Astra's F05: a bare tier cannot express "not yet measured", so any
 * consumer reading `reduced` before detection would latch disablement.
 *
 * `phase: 'pending'` is now distinguishable from a resolved `reduced`.
 */
export const PerformanceTierContext = createContext<CapabilityState>(
  INITIAL_CAPABILITY_STATE,
);

/**
 * Legacy context retained for compatibility with any consumer that still expects
 * the old string vocabulary. Prefer `PerformanceTierContext`.
 *
 * @deprecated Use `PerformanceTierContext` and read `.tier` canonically.
 */
export const LegacyPerformanceTierContext = createContext<PerformanceTier | undefined>(
  undefined,
);
