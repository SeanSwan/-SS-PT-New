/**
 * ============================================================================
 * FILE: FeedSkeleton.tsx
 * PURPOSE: Skeleton loader for social feed post cards during data fetch
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders 3 stacked post card shimmer placeholders, each
 * with an avatar circle, header text lines, a content block, and an action bar.
 * Used while the social feed is fetching posts via cursor-based pagination.
 *
 * HOW IT FITS IN THE APP: Imported by SocialFeed and community pages as the
 * loading state before post data resolves from GET /api/social/posts.
 *
 * KEY DECISIONS: Card count is configurable (default 3) to match different
 * feed contexts. Each card uses React.memo indirectly via static rendering
 * (no dynamic data, so memo is unnecessary on the skeleton itself).
 *
 * ┌─── SUB-COMPONENT: FeedSkeleton ────────────────────────────┐
 * │ PARENT: SocialFeed, CommunitySection                        │
 * │ PURPOSE: Social feed loading placeholder                    │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────────┐                    │
 * │ │ (●) ░░░░░ Name    ░░ timestamp      │  post header       │
 * │ │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  content block     │
 * │ │     ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │                    │
 * │ │ [like] [comment] [share]            │  action bar        │
 * │ └──────────────────────────────────────┘                    │
 * │ x3 (configurable via count prop)                            │
 * │ Props: { count?, variant? }                                 │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer, {
  ShimmerBlock,
  ShimmerCircle,
  ShimmerLine,
  type ShimmerVariant,
} from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Fallback Constants
// ─────────────────────────────────────────────────────────────
const GRAPHITE = '#1A1A24';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Layout Components
// ─────────────────────────────────────────────────────────────

const FeedContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const PostCard = styled.div`
  background: ${({ theme }) => theme.graphite || GRAPHITE};
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const ContentBlock = styled(ShimmerBlock)`
  width: 100%;
  height: 80px;
  border-radius: 8px;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 24px;
  padding-top: 4px;
`;

const ActionButton = styled(ShimmerBlock)`
  width: 48px;
  height: 24px;
  border-radius: 4px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: PostCardSkeleton (single card)
// ─────────────────────────────────────────────────────────────

interface PostCardSkeletonProps {
  $variant: ShimmerVariant;
}

const PostCardSkeleton: React.FC<PostCardSkeletonProps> = ({ $variant }) => (
  <PostCard>
    <PostHeader>
      <ShimmerCircle
        $variant={$variant}
        style={{ width: 44, height: 44, flexShrink: 0 }}
      />
      <HeaderText>
        <ShimmerLine $width="40%" $variant={$variant} style={{ height: 16 }} />
        <ShimmerLine $width="25%" $variant={$variant} style={{ height: 12 }} />
      </HeaderText>
    </PostHeader>

    <ContentBlock $variant={$variant} />

    <ActionBar>
      <ActionButton $variant={$variant} />
      <ActionButton $variant={$variant} />
      <ActionButton $variant={$variant} />
    </ActionBar>
  </PostCard>
);

// ─────────────────────────────────────────────────────────────
// SECTION: FeedSkeleton Component
// ─────────────────────────────────────────────────────────────

interface FeedSkeletonProps {
  /** Number of post card skeletons to render (default: 3) */
  count?: number;
  /** Display variant: 'default' or 'hardware' for gym screens */
  variant?: ShimmerVariant;
}

/**
 * FeedSkeleton — shimmer placeholder for social feed pages.
 * Renders configurable stacked post card skeletons.
 *
 * @param count - Number of skeleton cards (default: 3)
 * @param variant - 'default' (10% opacity) or 'hardware' (18% for gym screens)
 */
const FeedSkeleton: React.FC<FeedSkeletonProps> = ({
  count = 3,
  variant = 'default',
}) => {
  return (
    <CrystallineShimmer label="Loading feed" variant={variant}>
      <FeedContainer>
        {Array.from({ length: count }).map((_, i) => (
          <PostCardSkeleton key={i} $variant={variant} />
        ))}
      </FeedContainer>
    </CrystallineShimmer>
  );
};

export default FeedSkeleton;
