/**
 * ============================================================================
 * FILE: MembershipBadge.tsx
 * PURPOSE: Displays SwanStudios or Move Fitness membership badge on profiles
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a pill-shaped membership badge based on the
 * user's clientSource field ('swanstudios' | 'move_fitness' | 'external').
 * SwanStudios gets the Crystalline Swan brand badge, Move Fitness gets
 * a Gilded Fern accent badge. Both display on profiles and social posts.
 *
 * HOW IT FITS IN THE APP: UserProfile header, PostCard author area,
 * ProfileBadgeShowcase, and any component that displays user identity.
 *
 * WIREFRAME:
 * ┌─────────────────────────────────┐
 * │ [Swan Icon] SwanStudios Member  │  ← Midnight Sapphire bg, Ice Wing glow
 * └─────────────────────────────────┘
 * ┌───────────────────────────────────┐
 * │ [Dumbbell Icon] Move Fitness Pro │  ← Carbon bg, Gilded Fern border
 * └───────────────────────────────────┘
 */

import React from 'react';
import styled, { keyframes, css } from 'styled-components';
import { normalizeClientSource, type ClientSource as NormalizedClientSource } from '../../utils/clientSource';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

export type ClientSource = NormalizedClientSource;

interface MembershipBadgeProps {
  clientSource?: ClientSource | string | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const subtlePulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(96, 192, 240, 0.2); }
  50% { box-shadow: 0 0 16px rgba(96, 192, 240, 0.35); }
`;

const goldPulse = keyframes`
  0%, 100% { box-shadow: 0 0 8px rgba(198, 168, 75, 0.2); }
  50% { box-shadow: 0 0 16px rgba(198, 168, 75, 0.35); }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const sizeMap = {
  sm: { height: '24px', padding: '0 8px', fontSize: '0.6875rem', iconSize: 12, gap: '4px' },
  md: { height: '30px', padding: '0 12px', fontSize: '0.75rem', iconSize: 14, gap: '5px' },
  lg: { height: '36px', padding: '0 16px', fontSize: '0.8125rem', iconSize: 16, gap: '6px' },
};

const BadgePill = styled.span<{ $source: ClientSource; $size: 'sm' | 'md' | 'lg' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => sizeMap[$size].gap};
  height: ${({ $size }) => sizeMap[$size].height};
  padding: ${({ $size }) => sizeMap[$size].padding};
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: ${({ $size }) => sizeMap[$size].fontSize};
  font-weight: 600;
  letter-spacing: 0.025em;
  white-space: nowrap;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: scale(1.05);
  }

  ${({ $source }) =>
    $source === 'swanstudios' &&
    css`
      background: linear-gradient(135deg, #002060 0%, #003080 100%);
      border: 1px solid rgba(96, 192, 240, 0.35);
      color: #60C0F0;
      animation: ${subtlePulse} 3s ease-in-out infinite;
    `}

  ${({ $source }) =>
    $source === 'move_fitness' &&
    css`
      background: linear-gradient(135deg, #141419 0%, #1A1A24 100%);
      border: 1px solid rgba(198, 168, 75, 0.4);
      color: #C6A84B;
      animation: ${goldPulse} 3s ease-in-out infinite;
    `}

  ${({ $source }) =>
    $source === 'external' &&
    css`
      background: rgba(26, 26, 36, 0.6);
      border: 1px solid rgba(224, 236, 244, 0.15);
      color: rgba(224, 236, 244, 0.5);
    `}
`;

// ─────────────────────────────────────────────────────────────
// SECTION: SVG Icons (inline to avoid external deps)
// ─────────────────────────────────────────────────────────────

const SwanIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {/* Simplified swan silhouette */}
    <path d="M8 20c0-4 3-6 3-10 0-3-1-5-3-6 2 0 5 2 5 6 0 4-2 6-2 10" />
    <path d="M12 10c2-1 5-1 7 1-1 2-4 3-7 2" />
    <circle cx="6.5" cy="4.5" r="1" fill="currentColor" />
  </svg>
);

const DumbbellIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6.5 6.5h11M6 12h12M6.5 17.5h11" />
    <rect x="3" y="5" width="3" height="14" rx="1" />
    <rect x="18" y="5" width="3" height="14" rx="1" />
    <rect x="1" y="8" width="2" height="8" rx="0.5" />
    <rect x="21" y="8" width="2" height="8" rx="0.5" />
  </svg>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const LABELS: Record<ClientSource, string> = {
  swanstudios: 'SwanStudios',
  move_fitness: 'Move Fitness',
  external: 'Member',
};

const MembershipBadge: React.FC<MembershipBadgeProps> = ({
  clientSource,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const normalizedClientSource = normalizeClientSource(clientSource);

  // Don't render for external clients unless explicitly shown
  if (normalizedClientSource === 'external' && !showLabel) return null;

  const iconSize = sizeMap[size].iconSize;

  return (
    <BadgePill
      $source={normalizedClientSource}
      $size={size}
      className={className}
      title={`${LABELS[normalizedClientSource]} Member`}
    >
      {normalizedClientSource === 'swanstudios' && <SwanIcon size={iconSize} />}
      {normalizedClientSource === 'move_fitness' && <DumbbellIcon size={iconSize} />}
      {showLabel && LABELS[normalizedClientSource]}
    </BadgePill>
  );
};

export default MembershipBadge;
