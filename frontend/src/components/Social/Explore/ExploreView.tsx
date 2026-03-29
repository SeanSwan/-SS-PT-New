/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: ExploreView                                       ║
 * ║  PURPOSE: Social Explore tab — discover content, people,      ║
 * ║           challenges, and curated fitness knowledge            ║
 * ║  OWNER: Claude Opus 4.6                                       ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ 🔥 Trending Hashtags (horizontal scroll)                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ Trending Posts                              [See All →]    │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
 * │ │ PostCard │ │ PostCard │ │ PostCard │                   │
 * │ └──────────┘ └──────────┘ └──────────┘                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ Discover People                             [See All →]    │
 * │ [Avatar] [Avatar] [Avatar] (← scroll →)                   │
 * ├────────────────────────────────────────────────────────────┤
 * │ 🔮 Swan Oracle (News · Scholar · YouTube)                  │
 * ├────────────────────────────────────────────────────────────┤
 * │ Active Challenges                           [See All →]    │
 * │ ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
 * │ │Challenge │ │Challenge │ │Challenge │                   │
 * │ └──────────┘ └──────────┘ └──────────┘                   │
 * └────────────────────────────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  (none — self-contained)
 * State:     useExplore() → trending posts, discover users, challenges
 * API Calls: GET /api/social/posts/trending, GET /api/v1/gamification/discover-users,
 *            GET /api/v1/gamification/challenges, GET /api/oracle/*
 * Children:  TrendingHashtags, OracleInsightsWidget
 */

import React, { Suspense } from 'react';
import { TrendingUp, Heart, MessageCircle, Users, Trophy, Flame, Zap } from 'lucide-react';
import { useExplore } from './useExplore';
import TrendingHashtags from '../Hashtags/TrendingHashtags';
import {
  ExploreContainer, SectionHeader, SectionTitle, SeeAllLink,
  PostsGrid, PostCard, PostAuthorRow, PostAvatar, PostAuthorName,
  PostTypeBadge, PostContent, PostMedia, PostStats, StatItem,
  PeopleScroll, PersonCard, PersonAvatar, PersonName, PersonMeta, FollowButton,
  ChallengesGrid, ChallengeCard, ChallengeTitle, ChallengeDesc, ChallengeMeta, XpBadge,
  SkeletonBlock, EmptyState,
} from './ExploreStyles';

const OracleInsightsWidget = React.lazy(
  () => import('../../DashBoard/Pages/admin-dashboard/components/OracleInsightsWidget')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Sub-Components (kept inline — each <50 lines)
// ─────────────────────────────────────────────────────────────

const PostsSkeleton: React.FC = () => (
  <PostsGrid>
    {[1, 2, 3].map(i => (
      <PostCard key={i}>
        <PostAuthorRow><SkeletonBlock $w="32px" $h="32px" $r="50%" /><SkeletonBlock $w="100px" $h="14px" /></PostAuthorRow>
        <SkeletonBlock $h="48px" /><SkeletonBlock $w="60%" $h="12px" />
      </PostCard>
    ))}
  </PostsGrid>
);

const PeopleSkeleton: React.FC = () => (
  <PeopleScroll>
    {[1, 2, 3, 4].map(i => (
      <PersonCard key={i} style={{ alignItems: 'center' }}>
        <SkeletonBlock $w="52px" $h="52px" $r="50%" />
        <SkeletonBlock $w="80px" $h="14px" />
        <SkeletonBlock $w="60px" $h="10px" />
      </PersonCard>
    ))}
  </PeopleScroll>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

const ExploreView: React.FC = () => {
  const {
    trendingPosts, discoverUsers, challenges,
    loadingPosts, loadingUsers, loadingChallenges, followUser,
  } = useExplore();

  const getInitials = (first?: string, last?: string) =>
    `${(first || '?')[0]}${(last || '?')[0]}`.toUpperCase();

  return (
    <ExploreContainer>
      {/* Trending Hashtags */}
      <div>
        <TrendingHashtags limit={20} />
      </div>

      {/* Trending Posts */}
      <div>
        <SectionHeader>
          <SectionTitle><Flame size={18} /> Trending Posts</SectionTitle>
        </SectionHeader>
        {loadingPosts ? <PostsSkeleton /> : trendingPosts.length === 0 ? (
          <EmptyState>No trending posts yet. Be the first to post!</EmptyState>
        ) : (
          <PostsGrid>
            {trendingPosts.slice(0, 6).map(post => (
              <PostCard key={post.id}>
                <PostAuthorRow>
                  <PostAvatar $src={post.user?.photo || undefined}>
                    {!post.user?.photo && getInitials(post.user?.firstName, post.user?.lastName)}
                  </PostAvatar>
                  <PostAuthorName>
                    {post.user?.firstName} {post.user?.lastName}
                  </PostAuthorName>
                  {post.type !== 'general' && (
                    <PostTypeBadge>{post.type}</PostTypeBadge>
                  )}
                </PostAuthorRow>
                {post.mediaUrl && <PostMedia src={post.mediaUrl} alt="" loading="lazy" />}
                <PostContent>{post.content}</PostContent>
                <PostStats>
                  <StatItem><Heart size={12} /> {post.likesCount}</StatItem>
                  <StatItem><MessageCircle size={12} /> {post.commentsCount}</StatItem>
                </PostStats>
              </PostCard>
            ))}
          </PostsGrid>
        )}
      </div>

      {/* Discover People */}
      <div>
        <SectionHeader>
          <SectionTitle><Users size={18} /> Discover People</SectionTitle>
        </SectionHeader>
        {loadingUsers ? <PeopleSkeleton /> : discoverUsers.length === 0 ? (
          <EmptyState>No user suggestions available right now.</EmptyState>
        ) : (
          <PeopleScroll>
            {discoverUsers.map(user => (
              <PersonCard key={user.id}>
                <PersonAvatar $src={user.photo || undefined}>
                  {!user.photo && getInitials(user.firstName, user.lastName)}
                </PersonAvatar>
                <PersonName>{user.firstName} {user.lastName}</PersonName>
                <PersonMeta>
                  Lv {user.level || 1} · {user.streakDays || 0}d streak
                </PersonMeta>
                <FollowButton onClick={() => followUser(user.id)}>
                  Follow
                </FollowButton>
              </PersonCard>
            ))}
          </PeopleScroll>
        )}
      </div>

      {/* Swan Oracle — Curated Fitness Content */}
      <div>
        <SectionHeader>
          <SectionTitle><Zap size={18} /> Swan Oracle</SectionTitle>
        </SectionHeader>
        <Suspense fallback={
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading Oracle...
          </div>
        }>
          <OracleInsightsWidget defaultTab="news" compact={false} />
        </Suspense>
      </div>

      {/* Active Challenges */}
      <div>
        <SectionHeader>
          <SectionTitle><Trophy size={18} /> Active Challenges</SectionTitle>
        </SectionHeader>
        {loadingChallenges ? (
          <ChallengesGrid>
            {[1, 2, 3].map(i => (
              <ChallengeCard key={i}>
                <SkeletonBlock $w="70%" $h="16px" />
                <SkeletonBlock $h="32px" />
                <SkeletonBlock $w="50%" $h="10px" />
              </ChallengeCard>
            ))}
          </ChallengesGrid>
        ) : challenges.length === 0 ? (
          <EmptyState>No active challenges. Check back soon!</EmptyState>
        ) : (
          <ChallengesGrid>
            {challenges.slice(0, 6).map(ch => (
              <ChallengeCard key={ch.id}>
                <ChallengeTitle>{ch.title}</ChallengeTitle>
                <ChallengeDesc>{ch.description}</ChallengeDesc>
                <ChallengeMeta>
                  <span>{ch.participantCount || 0} joined</span>
                  <span>·</span>
                  <span>{ch.category}</span>
                  {ch.reward?.xp && (
                    <>
                      <span>·</span>
                      <XpBadge>{ch.reward.xp} XP</XpBadge>
                    </>
                  )}
                </ChallengeMeta>
              </ChallengeCard>
            ))}
          </ChallengesGrid>
        )}
      </div>
    </ExploreContainer>
  );
};

export default ExploreView;
