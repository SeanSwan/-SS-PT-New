/**
 * ============================================================================
 * FILE: ChartSkeleton.tsx
 * PURPOSE: Skeleton loader for Victory chart areas during data fetch
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a rounded rectangle shimmer placeholder that
 * matches the dimensions of Victory chart containers. Includes optional axis
 * line placeholders and a title bar for realistic chart loading states.
 *
 * HOW IT FITS IN THE APP: Used inside SafeChart error boundary and by all
 * 50 Victory chart components as their loading state before data resolves.
 *
 * KEY DECISIONS: Default 300px height matches most chart containers. Width is
 * 100% responsive. Axis lines are optional since some charts (pie, radar)
 * do not have axes. Title shimmer is always shown for consistency.
 */

import React from 'react';
import styled from 'styled-components';
import CrystallineShimmer, {
  ShimmerBlock,
  ShimmerLine,
  type ShimmerVariant,
} from './CrystallineShimmer';
import { StyledBox } from '@/components/ui/StyledBox';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Fallback Constants
// ─────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────
// SECTION: Styled Layout Components
// ─────────────────────────────────────────────────────────────

const ChartContainer = styled.div`
  width: 100%;
  padding: 16px;
`;

const TitleBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ChartArea = styled(ShimmerBlock)<{ $height: number }>`
  width: 100%;
  height: ${({ $height }) => $height}px;
  border-radius: 12px;
`;

const AxisContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 8px;
`;

const AxisLine = styled(ShimmerLine)`
  height: 8px;
  border-radius: 2px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: ChartSkeleton Component
// ─────────────────────────────────────────────────────────────

interface ChartSkeletonProps {
  /** Height of the chart area in pixels (default: 300) */
  height?: number;
  /** Show axis line placeholders below the chart (default: false) */
  showAxes?: boolean;
  /** Display variant: 'default' or 'hardware' for gym screens */
  variant?: ShimmerVariant;
}

/**
 * ChartSkeleton — shimmer placeholder for Victory chart areas.
 * Renders a rounded rectangle matching chart container dimensions.
 *
 * @param height - Chart area height in px (default: 300)
 * @param showAxes - Whether to show axis line placeholders (default: false)
 * @param variant - 'default' (10% opacity) or 'hardware' (18% for gym screens)
 *
 * @example
 * <ChartSkeleton height={400} showAxes />
 */
const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  height = 300,
  showAxes = false,
  variant = 'default',
}) => {
  return (
    <CrystallineShimmer label="Loading chart" variant={variant}>
      <ChartContainer>
        <TitleBar>
          <StyledBox as={ShimmerLine}
            $width="35%"
            $variant={variant}
            $style={{ height: 18 }}
          />
          <StyledBox as={ShimmerBlock}
            $variant={variant}
            $style={{ width: 60, height: 24, borderRadius: 4 }}
          />
        </TitleBar>

        <ChartArea $variant={variant} $height={height} />

        {showAxes && (
          <AxisContainer>
            <AxisLine $width="100%" $variant={variant} />
            <StyledBox as="div" $style={{ display: 'flex', justifyContent: 'space-between' }}>
              <StyledBox as={ShimmerLine}
                $width="30px"
                $variant={variant}
                $style={{ height: 8 }}
              />
              <StyledBox as={ShimmerLine}
                $width="30px"
                $variant={variant}
                $style={{ height: 8 }}
              />
              <StyledBox as={ShimmerLine}
                $width="30px"
                $variant={variant}
                $style={{ height: 8 }}
              />
              <StyledBox as={ShimmerLine}
                $width="30px"
                $variant={variant}
                $style={{ height: 8 }}
              />
            </StyledBox>
          </AxisContainer>
        )}
      </ChartContainer>
    </CrystallineShimmer>
  );
};

export default ChartSkeleton;
