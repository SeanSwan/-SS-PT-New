/**
 * SectionTransition — Crystalline divider with aurora gradient
 * ==============================================================
 * Animated gradient divider between homepage sections.
 * Full tier: animated aurora shimmer. Balanced: static gradient. Essential: simple line.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

const auroraShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const DividerWrapper = styled.div<{ $animate: boolean }>`
  position: relative;
  width: 100%;
  height: 2px;
  margin: 0;
  overflow: hidden;
`;

const GradientLine = styled.div<{ $animate: boolean }>`
  width: 80%;
  height: 1px;
  margin: 0 auto;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--accent-purple, #8B5CF6) 20%,
    var(--accent-cyan, #60C0F0) 50%,
    var(--accent-gold, #C6A84B) 80%,
    transparent 100%
  );
  background-size: ${({ $animate }) => ($animate ? '200% 100%' : '100% 100%')};
  animation: ${({ $animate }) => ($animate ? auroraShift : 'none')} 6s ease-in-out infinite;
  opacity: 0.6;
`;

const GlowLayer = styled.div`
  position: absolute;
  top: -4px;
  left: 10%;
  right: 10%;
  height: 10px;
  background: radial-gradient(
    ellipse at center,
    rgba(96, 192, 240, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
`;

interface SectionTransitionProps {
  /** Show aurora animation (full tier) */
  animate?: boolean;
  /** Show glow halo (full tier) */
  showGlow?: boolean;
  className?: string;
}

const SectionTransition: React.FC<SectionTransitionProps> = ({
  animate = true,
  showGlow = true,
  className,
}) => (
  <DividerWrapper $animate={animate} className={className}>
    <GradientLine $animate={animate} />
    {showGlow && <GlowLayer />}
  </DividerWrapper>
);

export default SectionTransition;
