/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for Gamification celebration components
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports all gamification overlay and effect
 * components so consumers can import from a single path.
 *
 * HOW IT FITS IN THE APP: Used by app root layout to mount overlays,
 * and by profile/dashboard components to wrap streak counters.
 */

export { default as LevelUpOverlay } from './LevelUpOverlay';
export type { LevelUpOverlayProps } from './LevelUpOverlay';

export { default as BadgeEarnOverlay } from './BadgeEarnOverlay';
export type { BadgeEarnOverlayProps } from './BadgeEarnOverlay';

export { default as StreakFireEffect } from './StreakFireEffect';
export type { StreakFireEffectProps } from './StreakFireEffect';

export { default as GamificationDashboard } from './GamificationDashboard';
