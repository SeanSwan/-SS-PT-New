/**
 * ============================================================================
 * FILE: HashtagChip.tsx
 * PURPOSE: Clickable hashtag chip with usage count and follow state
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a single hashtag as a clickable chip.
 * Shows the tag name, optional usage count, and official badge.
 * HOW IT FITS IN THE APP: Used in TrendingHashtags, PostCard, HashtagPage
 *
 * ┌─── SUB-COMPONENT: HashtagChip ─────────────────────────────┐
 * │ PARENT: TrendingHashtags / PostCard / HashtagPage           │
 * │ PURPOSE: Atomic hashtag display + click target              │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────┐                                │
 * │ │ # tagname  ✓  1.2k      │                                │
 * │ └──────────────────────────┘                                │
 * │ Props: { hashtag, isActive?, showCount?, size?, onClick? }  │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Chip click] → Calls onClick(hashtag) → Parent decides     │
 * │   action (toggle feed filter or navigate to hashtag page)   │
 * │ GAMIFICATION: None — purely presentational component        │
 * └─────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { hashtag: HashtagData, isActive, showCount, size, onClick }
 * State:     None (stateless presentational component)
 * API Calls: None (parent fetches data)
 * Events:    onClick → parent handler
 * Children:  None (leaf component)
 */

import React from 'react';
import styled, { css } from 'styled-components';
import { Hash, CheckCircle } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface HashtagData {
  id: number;
  name: string;
  slug: string;
  category?: 'fitness' | 'creative' | 'community' | 'general';
  usageCount?: number;
  weeklyCount?: number;
  isOfficial?: boolean;
}

interface HashtagChipProps {
  hashtag: HashtagData;
  isActive?: boolean;
  showCount?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: (hashtag: HashtagData) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Category Colors
// PURPOSE: Map broad categories to accent colors from Crystalline Swan
// ─────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  fitness: '#8B5CF6',    // Wing Purple
  creative: '#C6A84B',   // Gilded Fern
  community: '#60C0F0',  // Ice Wing
  general: '#4070C0',    // Swan Lavender
};

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Chip = styled.button<{ $active: boolean; $color: string; $size: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid ${({ $active, $color }) => $active ? $color : 'var(--border-soft, rgba(96, 192, 240, 0.2))'};
  border-radius: 20px;
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-weight: 500;
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  color: ${({ $active, $color }) => $active ? '#E0ECF4' : 'var(--text-secondary, #94a3b8)'};

  ${({ $size }) => $size === 'sm' && css`
    padding: 4px 10px;
    font-size: 0.75rem;
    min-height: 28px;
  `}
  ${({ $size }) => $size === 'md' && css`
    padding: 6px 14px;
    font-size: 0.8125rem;
    min-height: 36px;
  `}
  ${({ $size }) => $size === 'lg' && css`
    padding: 8px 18px;
    font-size: 0.875rem;
    min-height: 44px;
  `}

  background: ${({ $active, $color }) =>
    $active
      ? `color-mix(in srgb, ${$color} 20%, var(--bg-elevated, #141419))`
      : 'var(--bg-elevated, #141419)'};

  &:hover:not(:disabled) {
    background: color-mix(in srgb, ${({ $color }) => $color} 15%, var(--bg-elevated, #141419));
    border-color: ${({ $color }) => $color};
    color: var(--text-primary, #E0ECF4);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const Count = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.6875rem;
  opacity: 0.7;
`;

const OfficialIcon = styled(CheckCircle)`
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const HashtagChip: React.FC<HashtagChipProps> = ({
  hashtag,
  isActive = false,
  showCount = false,
  size = 'md',
  onClick
}) => {
  const color = CATEGORY_COLORS[hashtag.category || 'general'] || CATEGORY_COLORS.general;

  const formatCount = (n: number): string => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <Chip
      $active={isActive}
      $color={color}
      $size={size}
      onClick={() => onClick?.(hashtag)}
      aria-label={`Hashtag ${hashtag.name}${hashtag.usageCount ? `, ${hashtag.usageCount} posts` : ''}`}
      aria-pressed={isActive}
    >
      <Hash size={size === 'sm' ? 12 : size === 'md' ? 14 : 16} />
      {hashtag.name}
      {hashtag.isOfficial && <OfficialIcon size={size === 'sm' ? 10 : 12} />}
      {showCount && hashtag.usageCount !== undefined && hashtag.usageCount > 0 && (
        <Count>{formatCount(hashtag.usageCount)}</Count>
      )}
    </Chip>
  );
};

export default React.memo(HashtagChip);
