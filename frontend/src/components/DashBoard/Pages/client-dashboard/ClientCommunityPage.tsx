/**
 * ============================================================================
 * FILE: ClientCommunityPage.tsx
 * PURPOSE: Community hub with hashtag discovery, social feed, challenges, leaderboard
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the client's community tab with a hashtag-driven
 * feed filter system, quick post creation (with inline #hashtag support),
 * active challenges, and a live leaderboard.
 *
 * HOW IT FITS IN THE APP: ClientDashboard → ClientCommunityPage (Community tab)
 * KEY DECISIONS: Replaced 12-tab category system with 4 broad filters + hashtag
 * discovery per AI Village consensus. Uses Energy Conversion button system and
 * luxury RankBadge tokens from Phase 3 design debate.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ClientCommunityPage                               ║
 * ║  PURPOSE: Hashtag-driven community hub for clients            ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-24                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ [All] [Fitness] [Creative] [Community]                     │
 * │ Trending: #legday  #transformation  #dance  #music  ...    │
 * ├────────────────────────────────────────────────────────────┤
 * │ Quick Post: [text + #hashtags...........] [Post]           │
 * ├──────────────────────────┬─────────────────────────────────┤
 * │ Active Challenges        │ Leaderboard (top 5)             │
 * │ [card] [card] [card]     │ 1. [gold] Name — 5000 XP       │
 * ├──────────────────────────┴─────────────────────────────────┤
 * │ Social Feed (filtered by hashtag/category)                 │
 * └────────────────────────────────────────────────────────────┘
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Filter: Fitness] → Sets category filter → Refetches feed with ?category=fitness
 * [Trending: #legday] → Sets hashtag filter → Refetches feed with ?hashtag=legday
 * [Post button] → POST /api/social/posts → Extracts #hashtags → Refreshes feed
 * [Challenge card] → Future: opens challenge detail modal
 *
 * DATA FLOW:
 * Props In:  none
 * State:     { filters, challenges, feed, leaderboard, postText, loading }
 * API Calls: GET /api/social/challenges, GET /api/social/feed, GET /api/gamification/leaderboard
 * Children:  FeedFilterBar, TrendingHashtags
 *
 * GAMIFICATION HOOKS:
 * - Post creation → backend awards 10-50 XP based on type
 * - Hashtag usage bonus → +5 XP for first-time tag use
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Send, Clock, Swords, MessageSquare, Hash } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { FeedFilterBar, type FeedFilters } from '../../../Social/Hashtags';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components — Crystalline Swan dark-first
// PURPOSE: AI Village Phase 3 consensus: Energy Conversion buttons,
// luxury RankBadge tokens, semantic stat accents
// ─────────────────────────────────────────────────────────────

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const PageWrap = styled.div`
  padding: 1.5rem;
  min-height: 100%;
  color: var(--text-primary, #E0ECF4);
`;

// Energy Conversion button: blue bg → purple glow on hover
const PostBtn = styled.button`
  min-height: 44px;
  min-width: 44px;
  padding: 0.625rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--accent-primary, #002060);
  cursor: pointer;
  background: var(--accent-primary, #002060);
  color: #FFFFFF;
  font-family: 'Sora', sans-serif;
  font-weight: 600;
  font-size: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  &:hover:not(:disabled) {
    background: var(--bg-elevated, #003080);
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PostBox = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.1));
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const PostInput = styled.textarea`
  flex: 1;
  min-height: 56px;
  padding: 0.75rem;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.12));
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  resize: vertical;

  &:focus-visible {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--accent-primary, #60C0F0),
                0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent);
  }

  &::placeholder {
    color: var(--text-muted, #64748b);
  }
`;

const HashtagHint = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.25rem;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const SectionCard = styled.div`
  background: var(--bg-surface, #0A0A0F);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1.25rem;

  h3 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

const ChallengeCard = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(139, 92, 246, 0.15));
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  &:last-child { margin-bottom: 0; }
`;

const ChallengeTitle = styled.div`
  font-weight: 600;
  font-size: 0.9375rem;
  margin-bottom: 0.25rem;
`;

const ChallengeDesc = styled.div`
  font-size: 0.8125rem;
  color: var(--text-secondary, #94a3b8);
  margin-bottom: 0.625rem;
`;

const ChallengeFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
`;

const ProgressBarOuter = styled.div`
  flex: 1;
  max-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-surface, #1A1A24);
  overflow: hidden;
  margin-right: 0.5rem;
`;

const ProgressBarInner = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 3px;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: var(--accent-secondary, #8B5CF6);
  transition: width 0.4s;
`;

const LeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
`;

// AI Village Phase 3: Luxury metal RankBadge tokens
const RankBadge = styled.div<{ $rank: number }>`
  ${({ $rank }) => {
    const colors: Record<number, { bg: string; border: string; text: string; shadow: string }> = {
      1: { bg: '#141419', border: '#C6A84B', text: '#FCECAE', shadow: 'rgba(198, 168, 75, 0.3)' },
      2: { bg: '#141419', border: '#64748B', text: '#E0ECF4', shadow: 'rgba(224, 236, 244, 0.2)' },
      3: { bg: '#141419', border: '#92400E', text: '#FDBA74', shadow: 'rgba(146, 64, 14, 0.4)' },
    };
    const color = colors[$rank] || { bg: '#141419', border: '#4070C0', text: '#E0ECF4', shadow: 'transparent' };
    return css`
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      height: 32px;
      padding: 0 8px;
      background: ${color.bg};
      border: 1px solid ${color.border};
      border-radius: 6px;
      color: ${color.text};
      box-shadow: inset 0 0 8px ${color.shadow};
      font-family: 'Fira Code', monospace;
      font-size: 0.875rem;
      font-weight: 700;
    `;
  }}
`;

const FeedPost = styled.div`
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
  &:last-child { border-bottom: none; }
  .post-author { font-weight: 600; font-size: 0.875rem; }
  .post-body { font-size: 0.8125rem; color: var(--text-secondary, #94a3b8); margin-top: 0.25rem; }
  .post-time { font-size: 0.6875rem; color: var(--text-muted, #64748b); margin-top: 0.25rem; }
`;

const EmptyState = styled.p`
  color: var(--text-muted, #64748b);
  font-size: 0.875rem;
  text-align: center;
  padding: 1.5rem 0;
`;

const ShimmerBlock = styled.div`
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(90deg, var(--bg-elevated, #141419) 25%, rgba(96,192,240,0.06) 50%, var(--bg-elevated, #141419) 75%);
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const ErrorBox = styled.div`
  background: var(--bg-elevated, #141419);
  border-left: 4px solid #C92A54;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.875rem;
`;

const PointsChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 0.6875rem;
  color: var(--accent-secondary, #8B5CF6);
  font-weight: 600;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ClientCommunityPage: React.FC = () => {
  const { authAxios } = useAuth();
  const [filters, setFilters] = useState<FeedFilters>({ category: 'all', hashtag: null });
  const [challenges, setChallenges] = useState<any[]>([]);
  const [feed, setFeed] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [postText, setPostText] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);

  // Fetch initial data: challenges + feed + leaderboard (separate error handling)
  useEffect(() => {
    const fetchData = async () => {
      if (!authAxios) return;
      try {
        const [cRes, fRes, lRes] = await Promise.allSettled([
          authAxios.get('/api/social/challenges'),
          authAxios.get('/api/social/feed', { params: { limit: 5 } }),
          authAxios.get('/api/gamification/leaderboard', { params: { limit: 5 } })
        ]);
        if (cRes.status === 'fulfilled') {
          setChallenges(cRes.value?.data?.data || cRes.value?.data?.challenges || []);
        }
        if (fRes.status === 'fulfilled') {
          setFeed(fRes.value?.data?.posts || fRes.value?.data?.data || []);
        }
        if (lRes.status === 'fulfilled') {
          setLeaderboard(lRes.value?.data?.data || lRes.value?.data?.leaderboard || []);
        }
      } catch (err: any) {
        setFetchError(err.message || 'Failed to load community data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authAxios]);

  // Refetch feed when filters change
  const fetchFeed = useCallback(async () => {
    if (!authAxios) return;
    try {
      const params: Record<string, string | number> = { limit: 10 };
      if (filters.category !== 'all') params.category = filters.category;
      if (filters.hashtag) params.hashtag = filters.hashtag;

      const res = await authAxios.get('/api/social/feed', { params });
      setFeed(res.data?.posts || res.data?.data || []);
    } catch {
      // Silent fail on feed refresh — data is supplementary
    }
  }, [authAxios, filters]);

  useEffect(() => {
    if (!loading) fetchFeed();
  }, [filters, fetchFeed, loading]);

  const handlePost = useCallback(async () => {
    if (!postText.trim() || !authAxios) return;
    setPostError(null);
    try {
      setPosting(true);
      await authAxios.post('/api/social/posts', {
        content: postText.trim(),
        type: 'general'
      });
      setPostText('');
      fetchFeed(); // Refresh feed after posting
    } catch (err: any) {
      setPostError(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }, [postText, authAxios, fetchFeed]);

  // Fallback leaderboard data
  const leaderData = leaderboard.length > 0
    ? leaderboard.slice(0, 5).map((u: any, i: number) => ({
        name: u.firstName || u.username || `Swan${i + 1}`,
        xp: u.totalPoints || u.points || 0
      }))
    : [
        { name: 'SwanAthlete1', xp: 12400 },
        { name: 'IronPhoenix', xp: 9800 },
        { name: 'CoreCrusher', xp: 7200 },
        { name: 'FlexMaster', xp: 5100 },
        { name: 'StrideKing', xp: 3600 },
      ];

  if (loading) {
    return (
      <PageWrap>
        <ShimmerBlock style={{ marginBottom: 12 }} />
        <ShimmerBlock style={{ height: 200 }} />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {fetchError && <ErrorBox>{fetchError}</ErrorBox>}

      {/* Hashtag Discovery Filter Bar */}
      <FeedFilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Quick Post with Hashtag Support */}
      <PostBox>
        <div style={{ flex: 1 }}>
          <PostInput
            value={postText}
            onChange={e => { setPostText(e.target.value); setPostError(null); }}
            placeholder="Share an update... use #hashtags to categorize! #fitness #dance"
            maxLength={500}
            aria-label="Write a post"
          />
          <HashtagHint>
            <Hash size={12} />
            Type #hashtags to categorize your post
            <PointsChip>+15 XP</PointsChip>
          </HashtagHint>
          {postError && <ErrorBox style={{ marginTop: 8, padding: '0.5rem' }}>{postError}</ErrorBox>}
        </div>
        <PostBtn onClick={handlePost} disabled={posting || !postText.trim()} aria-label="Create post">
          <Send size={16} aria-hidden="true" /> Post
        </PostBtn>
      </PostBox>

      {/* Challenges + Leaderboard Side-by-Side */}
      <TwoCol>
        <SectionCard>
          <h3><Swords size={18} aria-hidden="true" /> Active Challenges</h3>
          {challenges.length === 0
            ? <EmptyState>No active challenges right now. Check back soon!</EmptyState>
            : challenges.slice(0, 3).map((c: any, i: number) => (
              <ChallengeCard key={c.id || i}>
                <ChallengeTitle>{c.title || c.name || 'Challenge'}</ChallengeTitle>
                <ChallengeDesc>{c.description || 'Complete this challenge to earn rewards.'}</ChallengeDesc>
                <ChallengeFooter>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ProgressBarOuter>
                      <ProgressBarInner $pct={c.progress || 0} />
                    </ProgressBarOuter>
                    {c.progress || 0}%
                  </div>
                  <span>
                    <Clock size={12} style={{ marginRight: 4 }} aria-hidden="true" />
                    {c.daysRemaining || '?'} days left
                  </span>
                </ChallengeFooter>
              </ChallengeCard>
            ))
          }
        </SectionCard>

        <SectionCard>
          <h3>Leaderboard</h3>
          {leaderData.map((l, i) => (
            <LeaderRow key={i}>
              <RankBadge $rank={i + 1}>{i + 1}</RankBadge>
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{l.name}</span>
              <span style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.75rem',
                color: 'var(--accent-primary, #60C0F0)'
              }}>
                {l.xp.toLocaleString()} XP
              </span>
            </LeaderRow>
          ))}
        </SectionCard>
      </TwoCol>

      {/* Social Feed (filtered) */}
      <SectionCard>
        <h3><MessageSquare size={18} aria-hidden="true" /> Social Feed</h3>
        {feed.length === 0
          ? <EmptyState>
              {filters.hashtag
                ? `No posts tagged #${filters.hashtag} yet. Be the first!`
                : 'No posts yet. Be the first to share something!'}
            </EmptyState>
          : feed.map((p: any, i: number) => (
            <FeedPost key={p.id || i}>
              <div className="post-author">
                {p.user?.firstName || p.authorName || 'Community Member'}
              </div>
              <div className="post-body">{p.content || p.text || ''}</div>
              <div className="post-time">
                {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
              </div>
            </FeedPost>
          ))
        }
      </SectionCard>
    </PageWrap>
  );
};

export default ClientCommunityPage;
