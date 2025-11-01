// frontend/src/core/perf/index.ts

/**
 * Performance Core - Barrel Export
 *
 * Exports performance-related utilities:
 * - PerformanceTierProvider (context provider)
 * - PerformanceTierContext (React context)
 * - usePerformanceTier (hook)
 * - PerformanceMonitor (metrics tracking)
 *
 * @example
 * ```tsx
 * import { PerformanceTierProvider, usePerformanceTier } from '@/core/perf';
 * ```
 */

export { PerformanceTierProvider } from './PerformanceTierProvider';
export { PerformanceTierContext } from './PerformanceTierContext';
export type { PerformanceTier } from './PerformanceTierContext';

export {
  default as PerformanceMonitor,
  getPerformanceMonitor,
  initPerformanceMonitoring,
  DEFAULT_BUDGETS,
} from './performanceMonitor';

export type {
  PerformanceMetrics,
  PerformanceBudget,
} from './performanceMonitor';
