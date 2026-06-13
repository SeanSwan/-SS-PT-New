/**
 * COMPONENT: FriendSurfaceShared.styles
 * PURPOSE: Shared Swan UI primitives for canonical social friends surfaces.
 * FLOW: Friend list, request, and suggestion styled files reuse these skeleton/focus helpers.
 * UX: Keeps loading states consistent and keyboard focus visible across the friends tab.
 */
import styled, { css, keyframes } from 'styled-components';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

export const focusRing = css`
  outline: 2px solid var(--focus-ring, #8B5CF6);
  outline-offset: 2px;
`;

export const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent) 0%,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent) 50%,
    color-mix(in srgb, var(--text-primary, #E0ECF4) 5%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
`;

export const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
`;

export const SkeletonTextStack = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
`;

export const CloseButton = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent);
  color: var(--accent-primary, #60C0F0);
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent);
  }

  &:focus-visible {
    ${focusRing}
  }
`;
