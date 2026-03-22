/**
 * ============================================================================
 * FILE: CrystallineShimmer.tsx
 * PURPOSE: Reusable shimmer skeleton loader with Crystalline Swan theming
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a pulsing shimmer placeholder that indicates
 * content is loading. Uses Royal Depth to Swan Lavender gradient per AI
 * Village consensus. Respects prefers-reduced-motion.
 *
 * HOW IT FITS IN THE APP: Base building block for all skeleton screens
 * (ProfileSkeleton, FeedSkeleton, BadgeGridSkeleton, ChartSkeleton).
 *
 * KEY DECISIONS: CSS `contain: layout style paint` for compositing
 * performance. Animation uses `background-position` (GPU-friendly).
 * Accessible via role="status" + aria-live="polite".
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CrystallineShimmer                               ║
 * ║  PURPOSE: Animated shimmer placeholder for loading states    ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-22                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────┐
 * │  [Shimmer gradient sweeps right]   │
 * │  ░░░░░▓▓▓░░░░░░░░░░░░░░░░░░░░░░  │
 * └────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { width, height, borderRadius, variant, className }
 * State:     None (pure presentational)
 * API Calls: None
 * Events:    None
 * Children:  None
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Shimmer component prop definitions
// ─────────────────────────────────────────────────────────────

export type ShimmerVariant = 'text' | 'circle' | 'card' | 'chart';

export interface CrystallineShimmerProps {
  /** Width of the shimmer element (CSS value) */
  width?: string;
  /** Height of the shimmer element (CSS value) */
  height?: string;
  /** Border radius override (CSS value) */
  borderRadius?: string;
  /** Pre-defined shape variant */
  variant?: ShimmerVariant;
  /** Additional CSS class name */
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Variant defaults
// PURPOSE: Predefined dimensions for common skeleton shapes
// ─────────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<ShimmerVariant, { width: string; height: string; borderRadius: string }> = {
  text: { width: '100%', height: '16px', borderRadius: '4px' },
  circle: { width: '48px', height: '48px', borderRadius: '50%' },
  card: { width: '100%', height: '160px', borderRadius: '12px' },
  chart: { width: '100%', height: '240px', borderRadius: '12px' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Render a shimmer skeleton with accessibility attrs
// ─────────────────────────────────────────────────────────────

const CrystallineShimmer: React.FC<CrystallineShimmerProps> = ({
  width,
  height,
  borderRadius,
  variant = 'text',
  className,
}) => {
  const defaults = VARIANT_STYLES[variant];

  return (
    <ShimmerBox
      role="status"
      aria-live="polite"
      aria-label="Loading content"
      className={className}
      $width={width || defaults.width}
      $height={height || defaults.height}
      $borderRadius={borderRadius || defaults.borderRadius}
    >
      <ScreenReaderOnly>Loading...</ScreenReaderOnly>
    </ShimmerBox>
  );
};

export default CrystallineShimmer;

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframes & Styled Components
// PURPOSE: Crystalline Swan shimmer animation
// ─────────────────────────────────────────────────────────────

const swanShimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

interface ShimmerBoxProps {
  $width: string;
  $height: string;
  $borderRadius: string;
}

const ShimmerBox = styled.div<ShimmerBoxProps>`
  width: ${({ $width }) => $width};
  height: ${({ $height }) => $height};
  border-radius: ${({ $borderRadius }) => $borderRadius};

  /* Crystalline Swan shimmer: Royal Depth → Swan Lavender → Royal Depth */
  background: linear-gradient(90deg, #003080 25%, #4070C0 50%, #003080 75%);
  background-size: 200% 100%;
  animation: ${swanShimmer} 1.5s infinite linear;

  /* Performance: contain layout to avoid layout thrashing */
  contain: layout style paint;

  /* Respect reduced motion preference */
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: #003080;
    opacity: 0.7;
  }
`;

/** Visually hidden text for screen readers */
const ScreenReaderOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
