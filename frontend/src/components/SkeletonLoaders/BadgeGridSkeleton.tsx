/**
 * ============================================================================
 * FILE: BadgeGridSkeleton.tsx
 * PURPOSE: Skeleton loader for badge/achievement grid during data fetch
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a 3x2 grid of 80px circle shimmer placeholders
 * representing badge icons. Used while achievement data loads from the
 * gamification API endpoints.
 *
 * HOW IT FITS IN THE APP: Imported by BadgeArtGallery, AchievementsCard,
 * and profile achievement showcase sections as loading state.
 *
 * KEY DECISIONS: 3x2 grid matches the common "top 6 badges" showcase layout.
 * Count is configurable for different grid sizes. Uses CSS Grid for consistent
 * spacing across breakpoints.
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer, {
  ShimmerCircle,
  ShimmerLine,
  type ShimmerVariant,
} from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Layout Constants
// ─────────────────────────────────────────────────────────────
const BADGE_SIZE = 80;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Layout Components
// ─────────────────────────────────────────────────────────────

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
  padding: 16px;

  @media (max-width: 375px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
`;

const BadgeSlot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const BadgeCircle = styled(ShimmerCircle)`
  width: ${BADGE_SIZE}px;
  height: ${BADGE_SIZE}px;
`;

const BadgeLabel = styled(ShimmerLine)`
  width: 60px;
  height: 10px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: BadgeGridSkeleton Component
// ─────────────────────────────────────────────────────────────

interface BadgeGridSkeletonProps {
  /** Number of badge placeholders (default: 6 for 3x2 grid) */
  count?: number;
  /** Display variant: 'default' or 'hardware' for gym screens */
  variant?: ShimmerVariant;
}

/**
 * BadgeGridSkeleton — shimmer placeholder for badge/achievement grids.
 * Renders a responsive grid of circular shimmer placeholders with labels.
 *
 * @param count - Number of badge circles (default: 6)
 * @param variant - 'default' (10% opacity) or 'hardware' (18% for gym screens)
 */
const BadgeGridSkeleton: React.FC<BadgeGridSkeletonProps> = ({
  count = 6,
  variant = 'default',
}) => {
  return (
    <CrystallineShimmer label="Loading badges" variant={variant}>
      <GridContainer>
        {Array.from({ length: count }).map((_, i) => (
          <BadgeSlot key={i}>
            <BadgeCircle $variant={variant} />
            <BadgeLabel $variant={variant} />
          </BadgeSlot>
        ))}
      </GridContainer>
    </CrystallineShimmer>
  );
};

export default BadgeGridSkeleton;
