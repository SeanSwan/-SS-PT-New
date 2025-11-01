// frontend/src/core/perf/PerformanceTierContext.ts

import { createContext } from 'react';

/**
 * Performance Tier Type
 *
 * Defines three levels of feature delivery based on device capabilities.
 */
export type PerformanceTier = 'enhanced' | 'standard' | 'minimal';

/**
 * Performance Tier Context
 *
 * Provides performance tier to all components via React Context.
 * Automatically detects tier on app load based on:
 * - User preferences (prefers-reduced-motion)
 * - Hardware capabilities (CPU cores, memory)
 * - Network conditions (connection speed, save-data)
 *
 * @example
 * ```tsx
 * import { useContext } from 'react';
 * import { PerformanceTierContext } from './PerformanceTierContext';
 *
 * const tier = useContext(PerformanceTierContext);
 * // Returns: 'enhanced' | 'standard' | 'minimal'
 * ```
 */
export const PerformanceTierContext = createContext<PerformanceTier | undefined>(undefined);
