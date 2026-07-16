/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for all Crystalline Shimmer skeleton loader components
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports all skeleton loader components and their
 * base primitives from a single entry point for clean imports.
 *
 * HOW IT FITS IN THE APP: Any component needing a skeleton loader imports from
 * 'components/SkeletonLoaders' instead of individual files.
 *
 * @example
 * import { ProfileSkeleton, ChartSkeleton, ShimmerBlock } from 'components/SkeletonLoaders';
 */

// ─────────────────────────────────────────────────────────────
// SECTION: Base Primitives
// PURPOSE: Low-level shimmer building blocks for custom skeletons
// ─────────────────────────────────────────────────────────────
export {
  default as CrystallineShimmer,
  ShimmerBlock,
  ShimmerCircle,
  ShimmerLine,
  type ShimmerVariant,
} from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Composition Skeletons
// PURPOSE: Pre-built skeleton layouts for common page sections
// ─────────────────────────────────────────────────────────────
export { default as ProfileSkeleton } from './ProfileSkeleton';
export { default as FeedSkeleton } from './FeedSkeleton';
export { default as BadgeGridSkeleton } from './BadgeGridSkeleton';
export { default as ChartSkeleton } from './ChartSkeleton';
