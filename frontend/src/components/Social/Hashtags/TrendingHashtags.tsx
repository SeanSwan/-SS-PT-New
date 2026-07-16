/**
 * ============================================================================
 * FILE: TrendingHashtags.tsx
 * PURPOSE: Horizontal scrollable row of trending hashtag chips
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches trending hashtags from the API and renders
 * them as a horizontally scrollable row of HashtagChips. Supports category
 * filtering and highlights the active hashtag.
 *
 * HOW IT FITS IN THE APP: SocialFeed → FeedFilterBar → TrendingHashtags
 *
 * ┌─── SUB-COMPONENT: TrendingHashtags ────────────────┐
 * │ PARENT: FeedFilterBar / ClientCommunityPage         │
 * │ PURPOSE: Show trending tags for content discovery   │
 * │ WIREFRAME:                                          │
 * │ ┌──────────────────────────────────────────────┐    │
 * │ │ 🔥 #legday  #transformation  #dance  #music │    │
 * │ │    (← horizontal scroll →)                   │    │
 * │ └──────────────────────────────────────────────┘    │
 * │ Props: { category?, activeTag?, onTagClick, limit? }│
 * │ CLICK-OUTCOMES:                                     │
 * │ [HashtagChip click] → Toggle: if same tag clicked   │
 * │   again → onTagClick(null) clears filter;           │
 * │   otherwise → onTagClick(hashtag) sets filter       │
 * │ GAMIFICATION: None — display only, no XP rewards    │
 * └─────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { category, activeTag, onTagClick, limit }
 * State:     { hashtags: HashtagData[], loading: boolean }
 * API Calls: GET /api/social/hashtags/trending?category=X&limit=N
 * Events:    onTagClick → parent filter state
 * Children:  HashtagChip (mapped from hashtags array)
 *
 * ARCHITECTURE:
 * graph TD
 *   FeedFilterBar --> TrendingHashtags
 *   TrendingHashtags --> HashtagChip[HashtagChip x N]
 *   TrendingHashtags -->|GET /trending| HashtagAPI
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import HashtagChip, { type HashtagData } from './HashtagChip';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface TrendingHashtagsProps {
  category?: 'fitness' | 'creative' | 'community' | null;
  activeTag?: string | null;
  onTagClick?: (hashtag: HashtagData | null) => void;
  limit?: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────
const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding: 8px 0;
  scrollbar-width: thin;
  scrollbar-color: var(--border-soft, rgba(96, 192, 240, 0.12)) transparent;
  -webkit-overflow-scrolling: touch;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--border-soft, rgba(96, 192, 240, 0.12));
    border-radius: 2px;
  }
`;

const TrendingLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
  flex-shrink: 0;
`;



// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TrendingHashtags: React.FC<TrendingHashtagsProps> = ({
  category = null,
  activeTag = null,
  onTagClick,
  limit = 15
}) => {
  const { authAxios } = useAuth();
  const [hashtags, setHashtags] = useState<HashtagData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    if (!authAxios) return;
    try {
      const params: Record<string, string | number> = { limit };
      if (category) params.category = category;

      const res = await authAxios.get('/api/social/hashtags/trending', { params });
      setHashtags(res.data?.data || []);
    } catch {
      // Silent fail — trending tags are supplementary
    } finally {
      setLoading(false);
    }
  }, [authAxios, category, limit]);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  const handleChipClick = useCallback((hashtag: HashtagData) => {
    // Toggle: if same tag clicked again, clear filter
    if (activeTag === hashtag.slug) {
      onTagClick?.(null);
    } else {
      onTagClick?.(hashtag);
    }
  }, [activeTag, onTagClick]);

  if (loading || hashtags.length === 0) {
    return null; // Don't render empty trending bar
  }

  return (
    <Container role="navigation" aria-label="Trending hashtags">
      <TrendingLabel>
        <TrendingUp size={14} aria-hidden="true" />
        Trending
      </TrendingLabel>
      {hashtags.map((tag) => (
        <HashtagChip
          key={tag.id}
          hashtag={tag}
          isActive={activeTag === tag.slug}
          showCount
          size="sm"
          onClick={handleChipClick}
        />
      ))}
    </Container>
  );
};

export default React.memo(TrendingHashtags);
