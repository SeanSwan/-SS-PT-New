/**
 * ┌─── SUB-COMPONENT: TrendingHashtags ────────────────────────┐
 * │ PARENT: SocialFeed                                          │
 * │ PURPOSE: Shows top trending hashtags from the feed          │
 * │ WIREFRAME:                                                  │
 * │ ┌──────────────────────────────┐                            │
 * │ │ # Trending                   │                            │
 * │ │ #fitcheck     142 posts      │                            │
 * │ │ #legday        89 posts      │                            │
 * │ │ #transformation 67 posts     │                            │
 * │ └──────────────────────────────┘                            │
 * │ Props: none (self-fetching)                                 │
 * │ CLICK-OUTCOMES:                                             │
 * │ [Hashtag] → filters feed by hashtag (future)                │
 * └─────────────────────────────────────────────────────────────┘
 */

import React, { memo, useEffect, useState } from 'react';
import styled from 'styled-components';
import { Hash, TrendingUp } from 'lucide-react';
import api from '../../../services/api';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface TrendingTag {
  id: number;
  name: string;
  weeklyCount: number;
  category: string;
  isDefault?: boolean;
}

interface TrendingHashtagsProps {
  /* Phase 20.2: when true, render an honest empty state ("No trending
     hashtags yet.") instead of returning null on no-data. Default false
     preserves the existing SocialFeed-full-variant behavior (where the
     parent already gates rendering and a null is fine). */
  showEmptyState?: boolean;
}

const DEFAULT_TRENDING_TAGS: TrendingTag[] = [
  {
    id: -1,
    name: 'welcome',
    weeklyCount: 1,
    category: 'community',
    isDefault: true,
  },
];

function extractTrendingTags(payload: unknown): TrendingTag[] {
  if (Array.isArray(payload)) return payload as TrendingTag[];
  if (!payload || typeof payload !== 'object') return [];

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.hashtags)) return record.hashtags as TrendingTag[];
  if (Array.isArray(record.data)) return record.data as TrendingTag[];

  return [];
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TrendingHashtags: React.FC<TrendingHashtagsProps> = memo(({ showEmptyState = false }) => {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  /* Phase 20.2: track loading so the empty state does not flicker before
     the API responds. While loading we render null (parent panel header
     still shows); after the fetch resolves we either render tags or the
     empty state. */
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/api/social/hashtags/trending?limit=8')
      .then(res => setTags(extractTrendingTags(res.data)))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  const displayTags = tags.length ? tags : (showEmptyState ? DEFAULT_TRENDING_TAGS : []);

  if (!displayTags.length) {
    if (!showEmptyState) return null;
    return (
      <TrendingWrap>
        <TrendingTitle>
          <TrendingUp size={14} />
          Trending
        </TrendingTitle>
        <TagEmptyState>No trending hashtags yet.</TagEmptyState>
      </TrendingWrap>
    );
  }

  return (
    <TrendingWrap>
      <TrendingTitle>
        <TrendingUp size={14} />
        Trending
      </TrendingTitle>
      {displayTags.map(tag => (
        <TagRow key={tag.id}>
          <TagName>
            <Hash size={12} />
            {tag.name}
          </TagName>
          <TagCount>{tag.isDefault ? 'Admin welcome' : `${tag.weeklyCount} posts`}</TagCount>
        </TagRow>
      ))}
    </TrendingWrap>
  );
});

TrendingHashtags.displayName = 'TrendingHashtags';
export default TrendingHashtags;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const TrendingWrap = styled.div`
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  margin: 12px 0;
`;

const TrendingTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin: 0 0 10px;
`;

/* Phase 20.2: removed cursor: pointer + hover opacity. The rows have
   no click handler and no real hashtag-filter route is wired, so the
   pointer/hover cues were a Rule 28 false affordance. If hashtag
   filtering ships later, restore these cues alongside the real
   onClick handler that navigates to the filtered feed. */
const TagRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
`;

const TagEmptyState = styled.p`
  margin: 0;
  padding: 4px 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-align: center;
`;

const TagName = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
`;

const TagCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-muted, rgba(224, 236, 244, 0.35));
`;
