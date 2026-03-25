/**
 * ============================================================================
 * FILE: index.ts
 * PURPOSE: Barrel export for Hashtag component family
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Re-exports HashtagChip, TrendingHashtags, and
 * FeedFilterBar with their shared types for clean imports.
 * HOW IT FITS IN THE APP: Consumed by ClientCommunityPage, SocialFeed, etc.
 */
export { default as HashtagChip } from './HashtagChip';
export { default as TrendingHashtags } from './TrendingHashtags';
export { default as FeedFilterBar } from './FeedFilterBar';
export type { HashtagData } from './HashtagChip';
export type { FeedCategory, FeedFilters } from './FeedFilterBar';
