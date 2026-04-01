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
}

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TrendingHashtags: React.FC = memo(() => {
  const [tags, setTags] = useState<TrendingTag[]>([]);

  useEffect(() => {
    api.get('/api/social/hashtags/trending?limit=8')
      .then(res => setTags(res.data.hashtags || res.data || []))
      .catch(() => {});
  }, []);

  if (!tags.length) return null;

  return (
    <TrendingWrap>
      <TrendingTitle>
        <TrendingUp size={14} />
        Trending
      </TrendingTitle>
      {tags.map(tag => (
        <TagRow key={tag.id}>
          <TagName>
            <Hash size={12} />
            {tag.name}
          </TagName>
          <TagCount>{tag.weeklyCount} posts</TagCount>
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

const TagRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover { opacity: 0.8; }
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
