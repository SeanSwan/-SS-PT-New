/**
 * ============================================================================
 * FILE: SidebarStyles.ts
 * PURPOSE: Styled-components for the FriendSuggestionsSidebar
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Contains all styled-components for the sidebar that
 * shows friend suggestions on the social feed page. Glassmorphism card style
 * with Crystalline Swan theme tokens.
 * HOW IT FITS IN THE APP: Imported by FriendSuggestionsSidebar.tsx
 * KEY DECISIONS: Separated from component to stay under 300-line rule.
 */

import styled, { keyframes } from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../../utils/imageUrl';

// ─────────────────────────────────────────────────────────────
// SECTION: Keyframe Animations
// PURPOSE: Shimmer loading skeleton + subtle hover effects
// ─────────────────────────────────────────────────────────────

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Sidebar Container
// PURPOSE: Root wrapper — hidden on mobile, visible on desktop
// ─────────────────────────────────────────────────────────────

export const SidebarContainer = styled.aside`
  display: none;
  width: 300px;
  flex-shrink: 0;
  position: sticky;
  top: 24px;
  align-self: flex-start;

  @media (min-width: 1024px) {
    display: block;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Glassmorphism Card
// PURPOSE: Main card with frosted glass effect on Midnight Sapphire
// WHY: Matches existing social feed card aesthetic (rgba blue + blur)
// ─────────────────────────────────────────────────────────────

export const SidebarCard = styled.div`
  background: rgba(0, 32, 96, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(96, 192, 240, 0.12);
  overflow: hidden;

  /* Glassmorphism fallback for unsupported browsers */
  @supports not (backdrop-filter: blur(20px)) {
    background: rgba(0, 32, 96, 0.92);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
`;

export const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
`;

export const SidebarTitle = styled.h3`
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0;
  letter-spacing: 0.02em;
`;

export const SeeAllLink = styled.button`
  background: none;
  border: none;
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  transition: background-color 0.2s ease, color 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.1);
    color: #E0ECF4;
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Quick Stats Bar
// PURPOSE: Shows "X friends" and "X following" counts
// ─────────────────────────────────────────────────────────────

export const QuickStats = styled.div`
  display: flex;
  gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);
`;

export const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const StatValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  font-weight: 600;
  color: #60C0F0;
`;

export const StatLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: rgba(224, 236, 244, 0.5);
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Suggestion List & Items
// PURPOSE: Individual user suggestion rows
// ─────────────────────────────────────────────────────────────

export const SuggestionList = styled.div`
  padding: 8px 0;
`;

export const SuggestionItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  transition: background-color 0.2s ease;

  &:hover {
    background: rgba(96, 192, 240, 0.05);
  }
`;

export const Avatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $src }) => {
    const safe = $src ? sanitizeImageUrl($src) : null;
    return safe ? `url(${cssUrlValue(safe)}) center/cover no-repeat` : 'rgba(139, 92, 246, 0.2)';
  }};
  color: #60C0F0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
`;

export const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const UserName = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #E0ECF4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const MutualCount = styled.span`
  display: block;
  font-family: 'Sora', sans-serif;
  font-size: 0.6875rem;
  color: rgba(224, 236, 244, 0.45);
  margin-top: 2px;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Add Friend Button
// PURPOSE: CTA per suggestion — 44px min touch, dual-button glow
// WHY: Blue bg (#002060) gets Wing Purple glow per CLAUDE.md
// ─────────────────────────────────────────────────────────────

export const AddFriendButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 44px;
  min-width: 44px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  background: rgba(0, 32, 96, 0.8);
  color: #60C0F0;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: #8B5CF6;
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
      inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const RequestSentBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.6875rem;
  color: rgba(96, 192, 240, 0.7);
  white-space: nowrap;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Skeleton Loader
// PURPOSE: Frost Shimmer skeleton per CLAUDE.md design system
// WHY: Arctic Cyan shimmer at 10% opacity on surface color
// ─────────────────────────────────────────────────────────────

export const SkeletonBlock = styled.div<{
  $width?: string;
  $height?: string;
  $borderRadius?: string;
}>`
  background: linear-gradient(
    90deg,
    rgba(80, 160, 240, 0.05) 0%,
    rgba(80, 160, 240, 0.1) 50%,
    rgba(80, 160, 240, 0.05) 100%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
  width: ${({ $width }) => $width || '100%'};
  height: ${({ $height }) => $height || '16px'};
  border-radius: ${({ $borderRadius }) => $borderRadius || '4px'};
`;

export const SkeletonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
`;
