/**
 * COMPONENT: AnimatedBadge
 * PURPOSE: CSS-animated wrapper for Legendary-tier badge previews.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { safeBadgeImageUrl } from './BadgeCreatorImageSafety';

const BADGE_MIN_SIZE = 56;
const BADGE_MAX_SIZE = 220;

const clampBadgeSize = (size: number) => {
  if (!Number.isFinite(size)) return 128;
  return Math.min(BADGE_MAX_SIZE, Math.max(BADGE_MIN_SIZE, Math.round(size)));
};

const shimmer = keyframes`
  0% { transform: translateX(-100%) rotate(25deg); }
  100% { transform: translateX(200%) rotate(25deg); }
`;

const pulseGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 8px color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent),
      0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  }
  50% {
    box-shadow:
      0 0 16px color-mix(in srgb, var(--accent-gold, #C6A84B) 50%, transparent),
      0 0 36px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent),
      0 0 48px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  }
`;

const borderCycle = keyframes`
  0% { border-color: var(--accent-gold, #C6A84B); }
  33% { border-color: var(--accent-secondary, #8B5CF6); }
  66% { border-color: var(--accent-primary, #60C0F0); }
  100% { border-color: var(--accent-gold, #C6A84B); }
`;

const Wrapper = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid var(--accent-gold, #C6A84B);
  animation:
    ${borderCycle} 3s ease-in-out infinite,
    ${pulseGlow} 2.5s ease-in-out infinite;
  transition: transform 0.2s ease;

  &:hover {
    transform: scale(1.05) rotate(2deg);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;

    &:hover {
      transform: none;
    }
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
      color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent) 40%,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 12%, transparent) 50%,
      color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent) 60%,
      transparent 100%
    );
    animation: ${shimmer} 3s ease-in-out infinite;
    animation-delay: 0.5s;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  }
`;

interface Props {
  src: string;
  alt: string;
  size?: number;
}

const AnimatedBadge: React.FC<Props> = ({ src, alt, size = 128 }) => {
  const normalizedSize = clampBadgeSize(size);
  const safeSrc = safeBadgeImageUrl(src);

  return (
    <Wrapper $size={normalizedSize}>
      {safeSrc && <img src={safeSrc} alt={alt} />}
      <ShimmerOverlay aria-hidden="true" />
    </Wrapper>
  );
};

export default AnimatedBadge;
