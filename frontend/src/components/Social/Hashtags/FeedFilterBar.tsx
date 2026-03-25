/**
 * ============================================================================
 * FILE: FeedFilterBar.tsx
 * PURPOSE: Broad category filter bar + trending hashtags for social feed
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders 4 broad feed filters (All, Fitness, Creative,
 * Community) with a trending hashtags row below. Replaces the old 12-tab
 * category system with a flexible hashtag-driven discovery UX.
 *
 * ┌─── SUB-COMPONENT: FeedFilterBar ───────────────────┐
 * │ PARENT: SocialFeed / ClientCommunityPage            │
 * │ WIREFRAME:                                          │
 * │ ┌──────────────────────────────────────────────┐    │
 * │ │ [All] [Fitness] [Creative] [Community]       │    │
 * │ ├──────────────────────────────────────────────┤    │
 * │ │ 🔥 #legday  #dance  #transformation  ...    │    │
 * │ ├──────────────────────────────────────────────┤    │
 * │ │ Showing posts tagged #legday  [Clear]        │    │
 * │ └──────────────────────────────────────────────┘    │
 * │ Props: { filters, onFiltersChange }                 │
 * │ CLICK-OUTCOMES:                                     │
 * │ [Category btn] → onFiltersChange({category, null})  │
 * │   → Clears hashtag, parent refetches with ?category │
 * │ [Trending tag] → onFiltersChange({..., hashtag})    │
 * │   → Parent refetches feed with ?hashtag=slug        │
 * │ [Clear btn] → onFiltersChange({..., hashtag: null}) │
 * │   → Removes hashtag filter, parent refetches        │
 * │ GAMIFICATION: None — filter controls only           │
 * └─────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { filters: FeedFilters, onFiltersChange: fn }
 * State:     None (controlled component — parent owns filter state)
 * API Calls: None (TrendingHashtags child fetches trending)
 * Events:    onFiltersChange → parent refetches feed
 * Children:  TrendingHashtags
 *
 * ARCHITECTURE:
 * graph TD
 *   ClientCommunityPage --> FeedFilterBar
 *   FeedFilterBar --> CategoryButtons[FilterBtn x 4]
 *   FeedFilterBar --> TrendingHashtags
 *   FeedFilterBar --> ActiveHashtagBadge
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { Flame, Dumbbell, Palette, Users, Search } from 'lucide-react';
import TrendingHashtags from './TrendingHashtags';
import type { HashtagData } from './HashtagChip';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type FeedCategory = 'all' | 'fitness' | 'creative' | 'community';

export interface FeedFilters {
  category: FeedCategory;
  hashtag: string | null;
}

interface FeedFilterBarProps {
  filters: FeedFilters;
  onFiltersChange: (filters: FeedFilters) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// ─────────────────────────────────────────────────────────────
const CATEGORIES: { key: FeedCategory; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <Flame size={16} /> },
  { key: 'fitness', label: 'Fitness', icon: <Dumbbell size={16} /> },
  { key: 'creative', label: 'Creative', icon: <Palette size={16} /> },
  { key: 'community', label: 'Community', icon: <Users size={16} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Container = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 12px 16px 8px;
  margin-bottom: 16px;
`;

const FilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const FilterBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 22px;
  border: 1px solid ${({ $active }) =>
    $active ? 'var(--accent-primary, #60C0F0)' : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, var(--bg-elevated, #141419))'
      : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) =>
    $active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, #94a3b8)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419));
    border-color: var(--accent-primary, #60C0F0);
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ActiveHashtagBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-top: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-primary, #E0ECF4);
`;

const ClearBtn = styled.button`
  background: none;
  border: none;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover { text-decoration: underline; }
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const FeedFilterBar: React.FC<FeedFilterBarProps> = ({ filters, onFiltersChange }) => {
  const handleCategoryClick = useCallback((key: FeedCategory) => {
    onFiltersChange({
      category: key,
      hashtag: null // Clear hashtag when switching category
    });
  }, [onFiltersChange]);

  const handleHashtagClick = useCallback((hashtag: HashtagData | null) => {
    onFiltersChange({
      ...filters,
      hashtag: hashtag?.slug || null
    });
  }, [filters, onFiltersChange]);

  const clearHashtag = useCallback(() => {
    onFiltersChange({ ...filters, hashtag: null });
  }, [filters, onFiltersChange]);

  return (
    <Container>
      <FilterRow role="tablist" aria-label="Feed category filter">
        {CATEGORIES.map(({ key, label, icon }) => (
          <FilterBtn
            key={key}
            $active={filters.category === key}
            onClick={() => handleCategoryClick(key)}
            role="tab"
            aria-selected={filters.category === key}
            aria-label={`Filter by ${label}`}
          >
            {icon}
            {label}
          </FilterBtn>
        ))}
      </FilterRow>

      <TrendingHashtags
        category={filters.category === 'all' ? null : filters.category}
        activeTag={filters.hashtag}
        onTagClick={handleHashtagClick}
      />

      {filters.hashtag && (
        <ActiveHashtagBadge>
          Showing posts tagged <strong>#{filters.hashtag}</strong>
          <ClearBtn onClick={clearHashtag} aria-label="Clear hashtag filter">
            Clear
          </ClearBtn>
        </ActiveHashtagBadge>
      )}
    </Container>
  );
};

export default React.memo(FeedFilterBar);
