/**
 * GlassCard — Tier-aware glass morphism card
 * =============================================
 * Variants: cyan, purple, neutral, alert, gold
 * Tier-aware: full=blur+noise+glow, balanced=blur+glow, essential=solid bg
 * Hover: lift + border glow + inner glow with cross-pollinated colors
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

type GlassVariant = 'cyan' | 'purple' | 'neutral' | 'alert' | 'gold';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: GlassVariant;
  padding?: string;
  interactive?: boolean;
  /** Disable blur for low-end devices */
  disableBlur?: boolean;
  children?: React.ReactNode;
}

const VARIANT_COLORS: Record<GlassVariant, {
  border: string;
  glow: string;
  hoverBorder: string;
  hoverGlow: string;
  innerGlow: string;
}> = {
  cyan: {
    border: 'rgba(96, 192, 240, 0.15)',
    glow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    hoverBorder: 'rgba(96, 192, 240, 0.4)',
    hoverGlow: '0 20px 40px rgba(96, 192, 240, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
    innerGlow: 'inset 0 0 30px rgba(139, 92, 246, 0.08)',
  },
  purple: {
    border: 'rgba(139, 92, 246, 0.15)',
    glow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    hoverBorder: 'rgba(139, 92, 246, 0.4)',
    hoverGlow: '0 20px 40px rgba(139, 92, 246, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
    innerGlow: 'inset 0 0 30px rgba(96, 192, 240, 0.08)',
  },
  gold: {
    border: 'rgba(198, 168, 75, 0.2)',
    glow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    hoverBorder: 'rgba(198, 168, 75, 0.45)',
    hoverGlow: '0 20px 40px rgba(198, 168, 75, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
    innerGlow: 'inset 0 0 30px rgba(198, 168, 75, 0.06)',
  },
  neutral: {
    border: 'rgba(224, 236, 244, 0.08)',
    glow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    hoverBorder: 'rgba(224, 236, 244, 0.18)',
    hoverGlow: '0 20px 40px rgba(0, 0, 0, 0.2)',
    innerGlow: 'none',
  },
  alert: {
    border: 'rgba(255, 51, 102, 0.2)',
    glow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    hoverBorder: 'rgba(255, 51, 102, 0.45)',
    hoverGlow: '0 20px 40px rgba(255, 51, 102, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
    innerGlow: 'inset 0 0 30px rgba(255, 51, 102, 0.06)',
  },
};

const StyledGlass = styled(motion.div)<{
  $variant: GlassVariant;
  $padding: string;
  $interactive: boolean;
  $disableBlur: boolean;
}>`
  background: ${({ $disableBlur }) =>
    $disableBlur ? 'rgba(0, 32, 96, 0.85)' : 'rgba(0, 32, 96, 0.4)'};
  ${({ $disableBlur }) =>
    !$disableBlur &&
    css`
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
    `}
  border-radius: 24px;
  padding: ${({ $padding }) => $padding};
  border: 1px solid ${({ $variant }) => VARIANT_COLORS[$variant].border};
  box-shadow: ${({ $variant }) => VARIANT_COLORS[$variant].glow};

  ${({ $interactive, $variant }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition: border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                  box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);

      &:hover {
        border-color: ${VARIANT_COLORS[$variant].hoverBorder};
        box-shadow: ${VARIANT_COLORS[$variant].hoverGlow}, ${VARIANT_COLORS[$variant].innerGlow};
        transform: translateY(-8px);
      }
    `}

  @supports not (backdrop-filter: blur(16px)) {
    background: rgba(0, 32, 96, 0.85);
  }

  @media (prefers-reduced-transparency: reduce) {
    background: rgba(0, 32, 96, 0.92);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover { transform: none; }
  }

  @media (max-width: 320px) {
    padding: 20px;
    border-radius: 16px;
  }
`;

const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'neutral',
  padding = '32px',
  interactive = false,
  disableBlur = false,
  children,
  ...motionProps
}) => (
  <StyledGlass
    $variant={variant}
    $padding={padding}
    $interactive={interactive}
    $disableBlur={disableBlur}
    {...motionProps}
  >
    {children}
  </StyledGlass>
);

export default GlassCard;
export type { GlassCardProps, GlassVariant };
