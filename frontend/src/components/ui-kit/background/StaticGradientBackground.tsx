// frontend/src/components/ui-kit/background/StaticGradientBackground.tsx

import React from 'react';
import styled from 'styled-components';

interface StaticGradientBackgroundProps {
  colorFrom?: string;
  colorTo?: string;
  className?: string;
}

/**
 * Static Gradient Background Component
 *
 * Minimal-tier fallback for LivingConstellation.
 * Renders a static CSS gradient with zero animation overhead.
 *
 * Used when:
 * - User has prefers-reduced-motion enabled
 * - Device is low-end (< 4 CPU cores or < 4GB RAM)
 * - Performance tier is 'minimal'
 *
 * Performance: 0% CPU, 0% GPU, instant render
 *
 * @example
 * ```tsx
 * <StaticGradientBackground
 *   colorFrom="#00ffff"
 *   colorTo="#7851a9"
 * />
 * ```
 */
const StaticGradientBackground: React.FC<StaticGradientBackgroundProps> = ({
  colorFrom = '#00ffff',
  colorTo = '#7851a9',
  className
}) => {
  return (
    <GradientContainer
      className={className}
      $colorFrom={colorFrom}
      $colorTo={colorTo}
    />
  );
};

const GradientContainer = styled.div<{ $colorFrom: string; $colorTo: string }>`
  position: absolute;
  inset: 0;
  z-index: -1;

  /* Static gradient - no animations */
  background: linear-gradient(
    135deg,
    ${props => props.$colorFrom}20 0%,
    ${props => props.$colorTo}40 50%,
    ${props => props.$colorFrom}20 100%
  );

  /* Subtle overlay for depth */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 0%,
      rgba(0, 0, 0, 0.2) 100%
    );
    pointer-events: none;
  }
`;

export default StaticGradientBackground;
