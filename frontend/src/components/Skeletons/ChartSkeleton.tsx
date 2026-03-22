/**
 * ============================================================================
 * FILE: ChartSkeleton.tsx
 * PURPOSE: Skeleton loader for Victory chart areas
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a chart-shaped shimmer placeholder with a
 * title line, simulated axis markers, and a large chart body area.
 *
 * HOW IT FITS IN THE APP: Shown inside SafeChart wrappers and dashboard
 * analytics panels while chart data loads from the analytics service.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ChartSkeleton                                    ║
 * ║  PURPOSE: Shimmer placeholder for Victory chart areas        ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────┐
 * │ [Title line ████████]              │
 * │ ┌──────────────────────────────┐   │
 * │ │                              │   │
 * │ │   [Large chart body area]    │   │
 * │ │                              │   │
 * │ └──────────────────────────────┘   │
 * │ [axis] [axis] [axis] [axis]        │
 * └────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { height?, className? }
 * State:     None
 * Children:  CrystallineShimmer instances
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer from './CrystallineShimmer';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Chart-shaped skeleton with title, body, and axis
// ─────────────────────────────────────────────────────────────

interface ChartSkeletonProps {
  /** Chart body height (default "240px") */
  height?: string;
  className?: string;
}

const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ height = '240px', className }) => (
  <Container className={className} role="status" aria-label="Loading chart">
    {/* Chart title */}
    <CrystallineShimmer width="140px" height="18px" borderRadius="4px" />

    {/* Chart body */}
    <CrystallineShimmer variant="chart" height={height} />

    {/* Simulated X-axis labels */}
    <AxisRow>
      <CrystallineShimmer width="32px" height="10px" borderRadius="3px" />
      <CrystallineShimmer width="32px" height="10px" borderRadius="3px" />
      <CrystallineShimmer width="32px" height="10px" borderRadius="3px" />
      <CrystallineShimmer width="32px" height="10px" borderRadius="3px" />
      <CrystallineShimmer width="32px" height="10px" borderRadius="3px" />
    </AxisRow>
  </Container>
);

export default ChartSkeleton;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Chart skeleton container layout
// ─────────────────────────────────────────────────────────────

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  padding: 1rem;
  background: #141419; /* Carbon */
  border-radius: 12px;
`;

const AxisRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0 0.5rem;
`;
