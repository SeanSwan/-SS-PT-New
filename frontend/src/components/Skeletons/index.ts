/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for Crystalline Shimmer skeleton loaders
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports all skeleton components for clean imports.
 * Usage: import { CrystallineShimmer, ProfileSkeleton, FeedSkeleton }
 *        from '@/components/Skeletons';
 */

export { default as CrystallineShimmer } from './CrystallineShimmer';
export type { CrystallineShimmerProps, ShimmerVariant } from './CrystallineShimmer';
export { default as ProfileSkeleton } from './ProfileSkeleton';
export { default as FeedSkeleton } from './FeedSkeleton';
export { default as BadgeGridSkeleton } from './BadgeGridSkeleton';
export { default as ChartSkeleton } from './ChartSkeleton';
