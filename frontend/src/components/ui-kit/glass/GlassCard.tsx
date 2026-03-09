/**
 * GlassCard — Variant-based glass panel component
 * =================================================
 * Wraps FrostedCard with Gemini 3.1 Pro design spec variants:
 *   - cyan: Swan Cyan border glow (#8B5CF6 / #60C0F0)
 *   - purple: Cosmic Purple border glow (#8B5CF6 / #4070C0)
 *   - neutral: Subtle white border (default)
 *   - alert: Neon Coral glow (#FF3366) for injury/error states
 *
 * Uses the glassmorphism specs from galaxy-swan-theme.ts glass.panel.
 */
import React from 'react';
import styled, { css } from 'styled-components';
import { motion, HTMLMotionProps } from 'framer-motion';

type GlassVariant = 'cyan' | 'purple' | 'neutral' | 'alert';

interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'ref'> {
  variant?: GlassVariant;
  padding?: string;
  interactive?: boolean;
  children?: React.ReactNode;
}

const VARIANT_COLORS: Record<GlassVariant, { border: string; glow: string; hoverBorder: string }> = {
  cyan: {
    border: 'rgba(96, 192, 240, 0.2)',
    glow: '0 0 20px rgba(96, 192, 240, 0.15)',
    hoverBorder: 'rgba(96, 192, 240, 0.45)',
  },
  purple: {
    border: 'rgba(139, 92, 246, 0.2)',
    glow: '0 0 20px rgba(139, 92, 246, 0.15)',
    hoverBorder: 'rgba(139, 92, 246, 0.45)',
  },
  neutral: {
    border: 'rgba(224, 236, 244, 0.1)',
    glow: 'none',
    hoverBorder: 'rgba(224, 236, 244, 0.2)',
  },
  alert: {
    border: 'rgba(255, 51, 102, 0.25)',
    glow: '0 0 20px rgba(255, 51, 102, 0.15)',
    hoverBorder: 'rgba(255, 51, 102, 0.5)',
  },
};

const StyledGlass = styled(motion.div)<{ $variant: GlassVariant; $padding: string; $interactive: boolean }>`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  padding: ${({ $padding }) => $padding};

  ${({ $variant }) => css`
    border: 1px solid ${VARIANT_COLORS[$variant].border};
    box-shadow: ${VARIANT_COLORS[$variant].glow}, 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  `}

  ${({ $interactive, $variant }) =>
    $interactive &&
    css`
      cursor: pointer;
      transition: border-color 0.3s cubic-bezier(0.25, 1, 0.5, 1),
                  box-shadow 0.3s cubic-bezier(0.25, 1, 0.5, 1),
                  transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);

      &:hover {
        border-color: ${VARIANT_COLORS[$variant].hoverBorder};
        transform: translateY(-2px);
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
`;

const GlassCard: React.FC<GlassCardProps> = ({
  variant = 'neutral',
  padding = '24px',
  interactive = false,
  children,
  ...motionProps
}) => (
  <StyledGlass $variant={variant} $padding={padding} $interactive={interactive} {...motionProps}>
    {children}
  </StyledGlass>
);

export default GlassCard;
export type { GlassCardProps, GlassVariant };
