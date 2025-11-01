// frontend/src/components/ui-kit/glass/FrostedCard.tsx

import React, { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useReducedTransparency } from '../../../hooks/useReducedMotion';

export interface FrostedCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  /**
   * Glass opacity level (uses theme.glass tokens)
   * - thin: 0.06 (very transparent, for subtle overlays)
   * - mid: 0.10 (balanced, default)
   * - thick: 0.14 (more opaque, better readability)
   * - opaque: 0.95 (nearly solid, high contrast mode)
   */
  glassLevel?: 'thin' | 'mid' | 'thick' | 'opaque';

  /**
   * Shadow elevation (1-3)
   * - 1: Subtle elevation (theme.shadows.elevation)
   * - 2: Medium elevation (theme.shadows.cosmic)
   * - 3: High elevation (theme.shadows.accent)
   */
  elevation?: 1 | 2 | 3;

  /**
   * Enable interactive hover effects
   * - Lift animation on hover
   * - Border color transition
   * - Shadow enhancement
   */
  interactive?: boolean;

  /**
   * Border style variant
   * - subtle: theme.borders.subtle (default)
   * - elegant: theme.borders.elegant
   * - none: no border
   */
  borderVariant?: 'subtle' | 'elegant' | 'none';

  /**
   * Card content
   */
  children: ReactNode;

  /**
   * Optional CSS class name
   */
  className?: string;
}

/**
 * Frosted Card Component
 *
 * Standardized glassmorphism card with theme-controlled opacity.
 * Provides consistent glass effects across all v2.0 components.
 *
 * **Features:**
 * - Theme-aware glass opacity (thin/mid/thick/opaque)
 * - @supports fallback for non-supporting browsers
 * - prefers-reduced-transparency support (accessibility)
 * - Interactive hover effects (optional)
 * - Multiple elevation levels
 * - WCAG AA contrast verification via Visual Litmus Test
 *
 * **Accessibility:**
 * - Respects prefers-reduced-transparency (increases opacity + removes blur)
 * - Focus-visible indicators for interactive cards
 * - Minimum 4.5:1 contrast ratio (verified in Storybook)
 *
 * @example
 * ```tsx
 * // Basic frosted card
 * <FrostedCard glassLevel="mid" elevation={2}>
 *   <h3>Card Title</h3>
 *   <p>Card content with readable text</p>
 * </FrostedCard>
 * ```
 *
 * @example
 * ```tsx
 * // Interactive card with click handler
 * <FrostedCard
 *   glassLevel="thick"
 *   elevation={2}
 *   interactive
 *   onClick={() => console.log('clicked')}
 * >
 *   <CardContent />
 * </FrostedCard>
 * ```
 *
 * @example
 * ```tsx
 * // With framer-motion animations
 * <FrostedCard
 *   glassLevel="mid"
 *   initial={{ opacity: 0, y: 20 }}
 *   animate={{ opacity: 1, y: 0 }}
 *   transition={{ duration: 0.5 }}
 * >
 *   <Content />
 * </FrostedCard>
 * ```
 */
export const FrostedCard: React.FC<FrostedCardProps> = ({
  glassLevel = 'mid',
  elevation = 1,
  interactive = false,
  borderVariant = 'subtle',
  children,
  className,
  ...motionProps
}) => {
  // Check for reduced transparency preference (accessibility)
  const prefersReducedTransparency = useReducedTransparency();

  return (
    <StyledFrostedCard
      $glassLevel={glassLevel}
      $elevation={elevation}
      $interactive={interactive}
      $borderVariant={borderVariant}
      $reducedTransparency={prefersReducedTransparency}
      className={className}
      {...motionProps}
    >
      {children}
    </StyledFrostedCard>
  );
};

interface StyledFrostedCardProps {
  $glassLevel: 'thin' | 'mid' | 'thick' | 'opaque';
  $elevation: 1 | 2 | 3;
  $interactive: boolean;
  $borderVariant: 'subtle' | 'elegant' | 'none';
  $reducedTransparency: boolean;
}

const StyledFrostedCard = styled(motion.div)<StyledFrostedCardProps>`
  position: relative;
  border-radius: 20px;
  padding: 2rem;

  /* Glass effect with theme tokens */
  background: ${({ theme, $glassLevel, $reducedTransparency }) => {
    // If user prefers reduced transparency, always use opaque
    if ($reducedTransparency) {
      return `rgba(25, 25, 45, 0.95)`;
    }

    // Map glass level to theme tokens (fallback to hardcoded values if theme not ready)
    const opacityMap = {
      thin: theme?.glass?.thin || 0.06,
      mid: theme?.glass?.mid || 0.10,
      thick: theme?.glass?.thick || 0.14,
      opaque: theme?.glass?.opaque || 0.95
    };

    const opacity = opacityMap[$glassLevel];
    return `rgba(25, 25, 45, ${opacity})`;
  }};

  /* Backdrop blur with @supports fallback */
  @supports (backdrop-filter: blur(10px)) {
    backdrop-filter: ${({ $glassLevel, $reducedTransparency }) => {
      // If user prefers reduced transparency, disable blur
      if ($reducedTransparency) return 'none';

      const blurMap = {
        thin: '5px',
        mid: '10px',
        thick: '15px',
        opaque: '20px'
      };
      return `blur(${blurMap[$glassLevel]})`;
    }};
  }

  @supports not (backdrop-filter: blur(10px)) {
    /* Fallback for browsers without backdrop-filter support */
    background: ${({ $glassLevel }) => {
      // Increase opacity when blur is not supported
      const fallbackOpacityMap = {
        thin: 0.75,
        mid: 0.85,
        thick: 0.90,
        opaque: 0.95
      };
      return `rgba(25, 25, 45, ${fallbackOpacityMap[$glassLevel]})`;
    }};
  }

  /* Border with theme tokens */
  border: 1px solid ${({ theme, $borderVariant }) => {
    if ($borderVariant === 'none') return 'transparent';

    const borderMap = {
      subtle: theme?.borders?.subtle || 'rgba(255, 255, 255, 0.1)',
      elegant: theme?.borders?.elegant || 'rgba(255, 255, 255, 0.2)'
    };
    return borderMap[$borderVariant];
  }};

  /* Shadow elevation with theme tokens */
  box-shadow: ${({ theme, $elevation }) => {
    const shadowMap = {
      1: theme?.shadows?.elevation || '0 10px 30px rgba(0, 0, 0, 0.3)',
      2: theme?.shadows?.cosmic || '0 15px 40px rgba(0, 0, 0, 0.4)',
      3: theme?.shadows?.accent || '0 20px 50px rgba(0, 0, 0, 0.5)'
    };
    return shadowMap[$elevation];
  }};

  /* Interactive hover effects */
  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;

      &:hover {
        transform: translateY(-5px);
        box-shadow: ${theme?.shadows?.cosmic || '0 20px 50px rgba(0, 0, 0, 0.5)'};
        border-color: ${theme?.borders?.elegant || 'rgba(255, 255, 255, 0.3)'};
      }

      &:active {
        transform: translateY(-2px);
      }
    `}

  /* Accessibility: focus-visible for interactive cards */
  ${({ $interactive, theme }) =>
    $interactive &&
    css`
      &:focus-visible {
        outline: 2px solid ${theme?.colors?.primary || '#00ffff'};
        outline-offset: 2px;
      }
    `}

  /* Subtle shine effect on top edge */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme?.colors?.primary || '#00ffff'}40,
      transparent
    );
    border-radius: 20px 20px 0 0;
  }
`;

export default FrostedCard;
