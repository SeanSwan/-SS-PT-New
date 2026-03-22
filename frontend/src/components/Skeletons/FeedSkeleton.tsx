/**
 * ============================================================================
 * FILE: FeedSkeleton.tsx
 * PURPOSE: Skeleton loader for social feed posts (3 placeholder cards)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders three placeholder post cards with avatar,
 * name line, body lines, and action bar — matching the social feed layout.
 *
 * HOW IT FITS IN THE APP: Shown while the social feed fetches posts from
 * GET /api/social/feed. Replaced by PostCard components on load.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: FeedSkeleton                                     ║
 * ║  PURPOSE: Shimmer placeholder for social feed posts          ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────┐
 * │ [O] [Name line] [timestamp line]  │
 * │ [Body line 1 ████████████████]    │
 * │ [Body line 2 ████████████]        │
 * │ [Body line 3 ████████]            │
 * │ [Like] [Comment] [Share]          │
 * └────────────────────────────────────┘
 * (repeated x3)
 *
 * DATA FLOW:
 * Props In:  { count?, className? }
 * State:     None
 * Children:  CrystallineShimmer instances
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Render N placeholder post cards
// ─────────────────────────────────────────────────────────────

interface FeedSkeletonProps {
  /** Number of placeholder post cards (default 3) */
  count?: number;
  className?: string;
}

const FeedSkeleton: React.FC<FeedSkeletonProps> = ({ count = 3, className }) => (
  <Container className={className} role="status" aria-label="Loading feed">
    {Array.from({ length: count }, (_, i) => (
      <PostCard key={i}>
        {/* Header: avatar + name + timestamp */}
        <PostHeader>
          <CrystallineShimmer variant="circle" width="40px" height="40px" />
          <HeaderText>
            <CrystallineShimmer width="120px" height="14px" borderRadius="4px" />
            <CrystallineShimmer width="80px" height="12px" borderRadius="4px" />
          </HeaderText>
        </PostHeader>

        {/* Body lines with varying widths for realism */}
        <PostBody>
          <CrystallineShimmer width="100%" height="14px" borderRadius="4px" />
          <CrystallineShimmer width="85%" height="14px" borderRadius="4px" />
          <CrystallineShimmer width="60%" height="14px" borderRadius="4px" />
        </PostBody>

        {/* Action bar */}
        <ActionBar>
          <CrystallineShimmer width="56px" height="28px" borderRadius="6px" />
          <CrystallineShimmer width="56px" height="28px" borderRadius="6px" />
          <CrystallineShimmer width="56px" height="28px" borderRadius="6px" />
        </ActionBar>
      </PostCard>
    ))}
  </Container>
);

export default FeedSkeleton;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Layout matching the social feed PostCard structure
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 640px;
`;

const PostCard = styled.div`
  background: #141419; /* Carbon */
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const PostHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
`;

const PostBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ActionBar = styled.div`
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(224, 236, 244, 0.08);
`;
