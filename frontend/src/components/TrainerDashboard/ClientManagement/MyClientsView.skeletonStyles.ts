/**
 * MyClientsView.skeletonStyles.ts
 * -------------------------------
 * Crystalline shimmer skeleton for the canonical trainer /clients loading state.
 * Mirrors the TrainerClientCard layout so the grid holds shape while data loads
 * (GLM 5.2 design mandate Finding 4). Reduced-motion safe.
 */

import styled, { keyframes } from 'styled-components';

const clientSkeletonSweep = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export const SkeletonCard = styled.div`
  background: var(--surface-dark, #141419);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid color-mix(in srgb, var(--wing-purple, #8B5CF6) 10%, transparent);
`;

export const SkeletonHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  > div {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 0.5rem;
  }
`;

export const SkeletonShimmer = styled.div<{ $variant?: 'avatar' | 'title' | 'chip' | 'line' }>`
  position: relative;
  overflow: hidden;
  border-radius: ${({ $variant }) => ($variant === 'avatar' ? '50%' : '4px')};
  background: color-mix(in srgb, var(--ice-wing, #60C0F0) 10%, var(--surface-elevated, #1A1A24));
  width: ${({ $variant }) =>
    $variant === 'avatar' ? '60px' : $variant === 'title' ? '60%' : $variant === 'chip' ? '30%' : '100%'};
  height: ${({ $variant }) =>
    $variant === 'avatar' ? '60px' : $variant === 'title' ? '1.1rem' : $variant === 'chip' ? '1.4rem' : '0.85rem'};

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--ice-wing, #60C0F0) 20%, transparent),
      transparent
    );
    transform: translateX(-100%);
    animation: ${clientSkeletonSweep} 1.5s infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after { animation: none; }
  }
`;
