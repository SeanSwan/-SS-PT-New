// frontend/src/hooks/index.ts

/**
 * Custom Hooks - Barrel Export
 *
 * Exports all custom React hooks:
 * - usePerformanceTier (access performance tier from context)
 * - useReducedMotion (prefers-reduced-motion detection)
 * - useReducedTransparency (prefers-reduced-transparency detection)
 *
 * @example
 * ```tsx
 * import { usePerformanceTier, useReducedMotion } from '@/hooks';
 * ```
 */

export { usePerformanceTier } from './usePerformanceTier';
export { useReducedMotion, useReducedTransparency } from './useReducedMotion';
