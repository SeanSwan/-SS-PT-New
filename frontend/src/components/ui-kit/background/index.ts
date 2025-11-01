// frontend/src/components/ui-kit/background/index.ts

/**
 * Background Components - Barrel Export
 *
 * Exports all background components for easy importing:
 * - LivingConstellation (main orchestrator)
 * - StaticGradientBackground (minimal tier)
 * - CanvasBackground (standard tier)
 * - WebGLBackground (enhanced tier)
 *
 * @example
 * ```tsx
 * import { LivingConstellation } from '@/components/ui-kit/background';
 * ```
 */

export { default as LivingConstellation } from './LivingConstellation';
export { default as StaticGradientBackground } from './StaticGradientBackground';
export { default as CanvasBackground } from './CanvasBackground';
export { default as WebGLBackground } from './WebGLBackground';

export type { LivingConstellationProps } from './LivingConstellation';
export type { StaticGradientBackgroundProps } from './StaticGradientBackground';
export type { CanvasBackgroundProps } from './CanvasBackground';
export type { WebGLBackgroundProps } from './WebGLBackground';
