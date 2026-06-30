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
 * [Challenge card] -> Opens the first-class Challenge Board
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

import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CharacterCounter, ChallengeProgressInline, ChallengeTime, CompactErrorBox,
  LeaderName, LeaderPoints, PostContentArea,
} from './ClientCommunityStyles';
import {
  getSafeCommunityLoadError,
  getSafeCreatePostErrorCopy,
  getAwardedPostPoints,
  normalizeCommunityChallenge,
  normalizeCommunityFeedPost,
  normalizeLeaderboardEntry,
  prepareCommunityPost,
  type CommunityChallenge,
  type CommunityFeedPost,
  type LeaderboardEntry,
} from './ClientCommunityPage.helpers';

// Styled components extracted to ClientCommunityStyles.ts per 300-line rule
const MAX_POST_LENGTH = 500;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// TanStack Query handles caching, deduplication, abort on unmount
// ─────────────────────────────────────────────────────────────

const ClientCommunityPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FeedFilters>({ category: 'all', hashtag: null });
  const [postText, setPostText] = useState('');
  const [postReceiptPoints, setPostReceiptPoints] = useState<number | null>(null);
  const postSubmittingRef = useRef(false);

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
  const fetchError = getSafeCommunityLoadError(feedError, challengesError);
  const createPostError = getSafeCreatePostErrorCopy(createPost.error);

  const handlePost = () => {
    const trimmedPost = postText.trim();
    if (!trimmedPost || createPost.isPending || postSubmittingRef.current) return;

    postSubmittingRef.current = true;
    setPostReceiptPoints(null);
    try {
      createPost.mutate(prepareCommunityPost(trimmedPost), {
        onSuccess: (result) => {
          setPostText('');
          setPostReceiptPoints(getAwardedPostPoints(result));
        },
        onSettled: () => {
          postSubmittingRef.current = false;
        },
      });
    } catch (error) {
      postSubmittingRef.current = false;
      throw error;
    }
  };

  // Memoize leaderboard mapping to avoid recomputing on every render
  const leaderData = useMemo(() => {
    return (leaderboard as LeaderboardEntry[]).slice(0, 5).map(normalizeLeaderboardEntry);
  }, [leaderboard]);

  if (loading) {
    return (
      <PageWrap>
        <ShimmerBlock $bottom="12px" />
        <ShimmerBlock $height="200px" />
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      {fetchError && <ErrorBox role="alert">{fetchError}</ErrorBox>}

      {/* Hashtag Discovery Filter Bar */}
      <FeedFilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Quick Post with Hashtag Support */}
      <PostBox>
        <PostContentArea>
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
            {postReceiptPoints
              ? <PointsChip role="status">+{postReceiptPoints} XP earned</PointsChip>
              : <PointsChip>XP varies by type</PointsChip>}
            <CharacterCounter $danger={postText.length > MAX_POST_LENGTH * 0.9}>
              {postText.length}/{MAX_POST_LENGTH}
            </CharacterCounter>
          </HashtagHint>
          {createPostError && <CompactErrorBox role="alert">{createPostError}</CompactErrorBox>}
        </PostContentArea>
        <PostBtn type="button" onClick={handlePost} disabled={createPost.isPending || !postText.trim()} aria-label="Create post">
          <Send size={16} aria-hidden="true" /> Post
        </PostBtn>
      </PostBox>

      {/* Faction & Party RPG Widgets */}
      <TwoCol>
        <SectionCard>
          <h3><Shield size={18} aria-hidden="true" /> Faction War</h3>
          {factions.length > 0 ? (
            <FactionLeaderboard factions={factions} frameless />
          ) : (
            <EmptyState>Factions loading... Join a faction to compete!</EmptyState>
          )}
        </SectionCard>
        <SectionCard>
          <h3><Users size={18} aria-hidden="true" /> Party</h3>
          {party ? (
            <PartyHPBar party={party} myRole={myRole} onLeave={leaveParty} frameless />
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
            : (challenges as CommunityChallenge[]).slice(0, 3).map((rawChallenge, i) => {
              const challenge = normalizeCommunityChallenge(rawChallenge, i);
              return (
              <ChallengeCard
                key={challenge.id}
                type="button"
                onClick={() => navigate('/dashboard/client/challenges')}
                aria-label={`Open Challenge Board for ${challenge.title}`}
              >
                <ChallengeTitle>{challenge.title}</ChallengeTitle>
                <ChallengeDesc>{challenge.description}</ChallengeDesc>
                <ChallengeFooter>
                  <ChallengeProgressInline>
                    <ProgressBarOuter>
                      <ProgressBarInner $pct={challenge.progress} />
                    </ProgressBarOuter>
                    {challenge.progress}%
                  </ChallengeProgressInline>
                  <ChallengeTime>
                    <Clock size={12} aria-hidden="true" />
                    {challenge.daysRemaining} days left
                  </ChallengeTime>
                </ChallengeFooter>
              </ChallengeCard>
            );
            })
          }
        </SectionCard>

        <SectionCard>
          <h3>Leaderboard</h3>
          {leaderData.length === 0
            ? (
              <EmptyState>
                No leaderboard entries yet. Log activity or join a challenge to start the board.
              </EmptyState>
            )
            : leaderData.map((l, i) => (
              <LeaderRow key={l.id}>
                <RankBadge $rank={i + 1}>{i + 1}</RankBadge>
                <LeaderName>{l.name}</LeaderName>
                <LeaderPoints>
                  {l.xp.toLocaleString()} XP
                </LeaderPoints>
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
          : (feed as CommunityFeedPost[]).map((rawPost, i) => {
            const post = normalizeCommunityFeedPost(rawPost, i);
            return (
            <FeedPost key={post.id}>
              <div className="post-author">
                {post.author}
              </div>
              <div className="post-body">{post.body}</div>
              <div className="post-time">
                {post.createdAt}
              </div>
            </FeedPost>
          );
          })
        }
      </SectionCard>
    </PageWrap>
  );
};

export default ClientCommunityPage;
