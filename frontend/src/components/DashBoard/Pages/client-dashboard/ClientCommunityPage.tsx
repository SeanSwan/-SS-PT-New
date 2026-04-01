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

import React, { useState, useMemo } from 'react';
import { Send, Clock, Swords, MessageSquare, Hash, Users, Shield } from 'lucide-react';
import { FeedFilterBar, type FeedFilters } from '../../../Social/Hashtags';
import { FactionLeaderboard, PartyHPBar, PartyCreateJoin } from '../../../Social/RPG';
import { EventsList } from '../../../Social/Events';
import { useFaction } from '../../../../hooks/social/useFaction';
import { useParty } from '../../../../hooks/social/useParty';
import {
  useSocialFeed, useSocialChallenges, useLeaderboard, useCreatePost,
} from '../../../../hooks/useDashboardQueries';
import {
  PageWrap, PostBtn, PostBox, PostInput, HashtagHint, TwoCol, SectionCard,
  ChallengeCard, ChallengeTitle, ChallengeDesc, ChallengeFooter, ProgressBarOuter,
  ProgressBarInner, LeaderRow, RankBadge, FeedPost, EmptyState, ShimmerBlock,
  ErrorBox, PointsChip,
} from './ClientCommunityStyles';

// Styled components extracted to ClientCommunityStyles.ts per 300-line rule
const MAX_POST_LENGTH = 500;

const FALLBACK_LEADERS = [
  { name: 'SwanAthlete1', xp: 12400 },
  { name: 'IronPhoenix', xp: 9800 },
  { name: 'CoreCrusher', xp: 7200 },
  { name: 'FlexMaster', xp: 5100 },
  { name: 'StrideKing', xp: 3600 },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// TanStack Query handles caching, deduplication, abort on unmount
// ─────────────────────────────────────────────────────────────

const ClientCommunityPage: React.FC = () => {
  const [filters, setFilters] = useState<FeedFilters>({ category: 'all', hashtag: null });
  const [postText, setPostText] = useState('');

  // TanStack Query: automatic caching + AbortController on unmount
  const { data: challenges = [], error: challengesError } = useSocialChallenges();
  const { data: feed = [], isLoading: feedLoading, error: feedError } = useSocialFeed({
    limit: 10,
    category: filters.category,
    hashtag: filters.hashtag,
  });
  const { data: leaderboard = [] } = useLeaderboard({ limit: 5 });
  const createPost = useCreatePost();
  const { factions } = useFaction();
  const { party, myRole, leaveParty, createParty, joinParty } = useParty();

  const loading = feedLoading;
  const fetchError = feedError?.message || challengesError?.message || null;

  const handlePost = () => {
    if (!postText.trim()) return;
    createPost.mutate(postText, {
      onSuccess: () => setPostText(''),
    });
  };

  // Memoize leaderboard mapping to avoid recomputing on every render
  const leaderData = useMemo(() => {
    if (leaderboard.length === 0) return FALLBACK_LEADERS;
    return leaderboard.slice(0, 5).map((u: any, i: number) => ({
      name: u.firstName || u.username || `Swan${i + 1}`,
      xp: u.totalPoints || u.points || 0,
    }));
  }, [leaderboard]);

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
            onChange={e => setPostText(e.target.value)}
            placeholder="Share an update... use #hashtags to categorize! #fitness #dance"
            maxLength={MAX_POST_LENGTH}
            aria-label="Write a post"
          />
          <HashtagHint>
            <Hash size={12} />
            Type #hashtags to categorize your post
            <PointsChip>+15 XP</PointsChip>
            <span style={{ marginLeft: 'auto', color: postText.length > MAX_POST_LENGTH * 0.9 ? 'var(--error-accent, #C92A54)' : undefined }}>
              {postText.length}/{MAX_POST_LENGTH}
            </span>
          </HashtagHint>
          {createPost.error && <ErrorBox style={{ marginTop: 8, padding: '0.5rem' }}>{createPost.error.message || 'Failed to create post'}</ErrorBox>}
        </div>
        <PostBtn onClick={handlePost} disabled={createPost.isPending || !postText.trim()} aria-label="Create post">
          <Send size={16} aria-hidden="true" /> Post
        </PostBtn>
      </PostBox>

      {/* Faction & Party RPG Widgets */}
      <TwoCol>
        <SectionCard>
          <h3><Shield size={18} aria-hidden="true" /> Faction War</h3>
          {factions.length > 0 ? (
            <FactionLeaderboard factions={factions} />
          ) : (
            <EmptyState>Factions loading... Join a faction to compete!</EmptyState>
          )}
        </SectionCard>
        <SectionCard>
          <h3><Users size={18} aria-hidden="true" /> Party</h3>
          {party ? (
            <PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} />
          ) : (
            <PartyCreateJoin onCreate={createParty} onJoin={joinParty} />
          )}
        </SectionCard>
      </TwoCol>

      {/* Community Events */}
      <SectionCard>
        <EventsList />
      </SectionCard>

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
