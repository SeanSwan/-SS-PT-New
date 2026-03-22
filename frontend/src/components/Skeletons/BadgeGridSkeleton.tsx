/**
 * ============================================================================
 * FILE: BadgeGridSkeleton.tsx
 * PURPOSE: Skeleton loader for badge grid (6 placeholder badge circles)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a grid of 6 circular shimmer placeholders
 * with label lines beneath each, matching the badge gallery layout.
 *
 * HOW IT FITS IN THE APP: Shown in achievement showcases, badge galleries,
 * and gamification panels while badge data loads.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BadgeGridSkeleton                                ║
 * ║  PURPOSE: Shimmer placeholder for badge grid                 ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────┐
 * │  (O)      (O)      (O)            │
 * │  [name]   [name]   [name]         │
 * │                                    │
 * │  (O)      (O)      (O)            │
 * │  [name]   [name]   [name]         │
 * └────────────────────────────────────┘
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
// PURPOSE: Render placeholder badge circles in a responsive grid
// ─────────────────────────────────────────────────────────────

interface BadgeGridSkeletonProps {
  /** Number of placeholder badges (default 6) */
  count?: number;
  className?: string;
}

const BadgeGridSkeleton: React.FC<BadgeGridSkeletonProps> = ({ count = 6, className }) => (
  <Grid className={className} role="status" aria-label="Loading badges">
    {Array.from({ length: count }, (_, i) => (
      <BadgeSlot key={i}>
        <CrystallineShimmer variant="circle" width="64px" height="64px" />
        <CrystallineShimmer width="56px" height="12px" borderRadius="4px" />
      </BadgeSlot>
    ))}
  </Grid>
);

export default BadgeGridSkeleton;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: 3-column responsive badge grid layout
// ─────────────────────────────────────────────────────────────

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  width: 100%;
  max-width: 480px;
  padding: 1rem;

  @media (max-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const BadgeSlot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;
