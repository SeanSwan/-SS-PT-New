/**
 * ┌─── COMPONENT: AnimatedBadge ────────────────────────────────┐
 * │ PURPOSE: CSS-animated wrapper for Legendary-tier badges.    │
 * │ Shimmer overlay + pulsing glow + rotate-on-hover.           │
 * │ Works with static Recraft images (no Lottie dependency).    │
 * │ PHASE 3: Animated badge display for legendary tier.         │
 * └─────────────────────────────────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { transform: translateX(-100%) rotate(25deg); }
  100% { transform: translateX(200%) rotate(25deg); }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 8px rgba(198, 168, 75, 0.3),
      0 0 20px rgba(139, 92, 246, 0.15);
  }
  50% {
    box-shadow:
      0 0 16px rgba(198, 168, 75, 0.5),
      0 0 36px rgba(139, 92, 246, 0.3),
      0 0 48px rgba(96, 192, 240, 0.15);
  }
`;

const borderCycle = keyframes`
  0% { border-color: #C6A84B; }
  33% { border-color: #8B5CF6; }
  66% { border-color: #60C0F0; }
  100% { border-color: #C6A84B; }
`;

const Wrapper = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #C6A84B;
  animation:
    ${borderCycle} 3s ease-in-out infinite,
    ${pulseGlow} 2.5s ease-in-out infinite;
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05) rotate(2deg);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    display: block;
  }
`;

const ShimmerOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 50%;
    height: 200%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.08) 40%,
      rgba(198, 168, 75, 0.12) 50%,
      rgba(255, 255, 255, 0.08) 60%,
      transparent 100%
    );
    animation: ${shimmer} 3s ease-in-out infinite;
    animation-delay: 0.5s;
  }
`;

interface Props {
  src: string;
  alt: string;
  size?: number;
}

const AnimatedBadge: React.FC<Props> = ({ src, alt, size = 128 }) => (
  <Wrapper $size={size}>
    <img src={src} alt={alt} />
    <ShimmerOverlay />
  </Wrapper>
);

export default AnimatedBadge;
