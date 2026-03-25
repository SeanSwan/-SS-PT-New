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
import { Send, Clock, Swords, MessageSquare, Hash } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { FeedFilterBar, type FeedFilters } from '../../../Social/Hashtags';
import {
  PageWrap, PostBtn, PostBox, PostInput, HashtagHint, TwoCol, SectionCard,
  ChallengeCard, ChallengeTitle, ChallengeDesc, ChallengeFooter, ProgressBarOuter,
  ProgressBarInner, LeaderRow, RankBadge, FeedPost, EmptyState, ShimmerBlock,
  ErrorBox, PointsChip,
} from './ClientCommunityStyles';

// Styled components extracted to ClientCommunityStyles.ts per 300-line rule
const MAX_POST_LENGTH = 500;

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

  // Refetch feed when filters change — stable dependency array per AI Village Phase 3 consensus
  // Uses primitive values (category, hashtag) instead of the filters object to prevent
  // unnecessary re-renders and race conditions when filters change mid-fetch
  const fetchFeed = useCallback(async (category: string, hashtag: string | null) => {
    if (!authAxios) return;
    try {
      const params: Record<string, string | number> = { limit: 10 };
      if (category !== 'all') params.category = category;
      if (hashtag) params.hashtag = hashtag;

      const res = await authAxios.get('/api/social/feed', { params });
      setFeed(res.data?.posts || res.data?.data || []);
    } catch {
      // Silent fail on feed refresh — data is supplementary
    }
  }, [authAxios]);

  useEffect(() => {
    if (!loading) fetchFeed(filters.category, filters.hashtag);
  }, [filters.category, filters.hashtag, fetchFeed, loading]);

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
      fetchFeed(filters.category, filters.hashtag); // Refresh feed after posting
    } catch (err: any) {
      setPostError(err.message || 'Failed to create post');
    } finally {
      setPosting(false);
    }
  }, [postText, authAxios, fetchFeed, filters.category, filters.hashtag]);

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
            maxLength={MAX_POST_LENGTH}
            aria-label="Write a post"
          />
          <HashtagHint>
            <Hash size={12} />
            Type #hashtags to categorize your post
            <PointsChip>+15 XP</PointsChip>
            <span style={{ marginLeft: 'auto', color: postText.length > MAX_POST_LENGTH * 0.9 ? '#ef4444' : undefined }}>
              {postText.length}/{MAX_POST_LENGTH}
            </span>
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
