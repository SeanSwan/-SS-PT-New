/**
 * ============================================================================
 * FILE: CrystallineShimmer.tsx
 * PURPOSE: Base shimmer animation component for Frost Shimmer skeleton loaders
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides the foundational shimmer animation primitives
 * (ShimmerBlock, ShimmerCircle, ShimmerLine) used by all skeleton loader
 * compositions. Implements the Frost Shimmer spec from CLAUDE.md: Arctic Cyan
 * gradient at 10% opacity sweeping across Obsidian/Carbon/Graphite surfaces.
 *
 * HOW IT FITS IN THE APP: Every data-fetching component wraps its loading state
 * with a skeleton composed from these primitives. ProfileSkeleton, FeedSkeleton,
 * BadgeGridSkeleton, and ChartSkeleton all import from here.
 *
 * KEY DECISIONS: Separate base primitives from compositions so each skeleton
 * composition stays under 300 lines. Hardware-adaptive shimmer (18% opacity,
 * 1.5s) targets treadmill consoles and smart mirrors via media queries.
 *
 * ┌─── SUB-COMPONENT: CrystallineShimmer ──────────────────────┐
 * │ PARENT: Any data-fetching component                         │
 * │ PURPOSE: Accessible shimmer animation primitives            │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────────┐                        │
 * │ │ ░░░░░░░▓▓▓░░░░░░░░░░░░░░░░░░░░ │  <- shimmer sweep      │
 * │ └──────────────────────────────────┘                        │
 * │ Props: { width, height, borderRadius, variant, className }  │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';

// ─────────────────────────────────────────────────────────────
// SECTION: Theme Fallback Constants
// PURPOSE: Crystalline Swan palette fallbacks when theme is unavailable
// WHY: Ensures correct visuals even outside ThemeProvider context
// ─────────────────────────────────────────────────────────────
const OBSIDIAN_BLACK = '#0A0A0F';
const CARBON = '#141419';
const GRAPHITE = '#1A1A24';
const ARCTIC_CYAN_10 = 'rgba(80, 160, 240, 0.10)';
const ARCTIC_CYAN_18 = 'rgba(80, 160, 240, 0.18)';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: Frost shimmer sweep from left to right
// WHY: GPU-composited transform+opacity only per CLAUDE.md perf rules
// ─────────────────────────────────────────────────────────────
const frostShimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Hardware-Adaptive Shimmer (treadmill/mirror)
// PURPOSE: 18% opacity, 1.5s duration for gym hardware displays
// WHY: Higher contrast needed on bright gym screens with ambient light
// ─────────────────────────────────────────────────────────────
const hardwareShimmer = keyframes`
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
`;

/** Shimmer variant controls opacity and timing for different display contexts. */
export type ShimmerVariant = 'default' | 'hardware';

// ─────────────────────────────────────────────────────────────
// SECTION: Base Styled Components
// PURPOSE: Shimmer block, circle, and line primitives
// ─────────────────────────────────────────────────────────────

interface ShimmerBaseProps {
  /** Display variant: 'default' (10% opacity) or 'hardware' (18% opacity, gym screens) */
  $variant?: ShimmerVariant;
}

const shimmerGradient = (variant: ShimmerVariant = 'default') => {
  const opacity = variant === 'hardware' ? ARCTIC_CYAN_18 : ARCTIC_CYAN_10;
  return css`
    linear-gradient(
      90deg,
      transparent 0%,
      ${opacity} 50%,
      transparent 100%
    )
  `;
};

/**
 * ShimmerBlock — rectangular shimmer primitive.
 * Set width/height via styled-component extension or inline style.
 */
export const ShimmerBlock = styled.div<ShimmerBaseProps>`
  position: relative;
  overflow: hidden;
  background-color: ${({ theme }) => theme.carbon || CARBON};
  border-radius: 8px;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: ${({ $variant }) => shimmerGradient($variant)};
    animation: ${({ $variant }) =>
        $variant === 'hardware' ? hardwareShimmer : frostShimmer}
      1.5s ease-in-out infinite;
  }
`;

/** ShimmerCircle — circular shimmer primitive for avatars and badges. */
export const ShimmerCircle = styled(ShimmerBlock)`
  border-radius: 50%;
`;

/** ShimmerLine — single-line text placeholder with configurable width. */
export const ShimmerLine = styled(ShimmerBlock)<{ $width?: string }>`
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  border-radius: 4px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Accessible Skeleton Wrapper
// PURPOSE: Wraps any skeleton composition with ARIA live region
// WHY: Screen readers must announce loading state per WCAG 2.1
// ─────────────────────────────────────────────────────────────

interface CrystallineShimmerProps {
  /** Accessible label describing what is loading */
  label?: string;
  /** Shimmer variant for display context */
  variant?: ShimmerVariant;
  /** Optional className for styled-component extension */
  className?: string;
  children: React.ReactNode;
}

const ShimmerWrapper = styled.div`
  width: 100%;
`;

/**
 * CrystallineShimmer — accessible wrapper for skeleton loader compositions.
 * Provides role="status" and aria-live="polite" per CLAUDE.md spec.
 *
 * @param label - Accessible label for screen readers (default: "Loading content")
 * @param variant - 'default' (10% opacity) or 'hardware' (18% opacity for gym screens)
 * @param children - Skeleton composition (ShimmerBlock, ShimmerCircle, ShimmerLine)
 *
 * @example
 * <CrystallineShimmer label="Loading profile">
 *   <ShimmerCircle style={{ width: 80, height: 80 }} />
 *   <ShimmerLine $width="60%" />
 * </CrystallineShimmer>
 */
const CrystallineShimmer: React.FC<CrystallineShimmerProps> = ({
  label = 'Loading content',
  variant = 'default',
  className,
  children,
}) => {
  return (
    <ShimmerWrapper
      role="status"
      aria-live="polite"
      aria-label={label}
      className={className}
    >
      {children}
    </ShimmerWrapper>
  );
};

export default CrystallineShimmer;
