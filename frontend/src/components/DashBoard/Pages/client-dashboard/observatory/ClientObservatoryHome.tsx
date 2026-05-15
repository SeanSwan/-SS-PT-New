/**
 * FILE: ClientObservatoryHome.tsx
 * PURPOSE: Canonical client overview composition for /dashboard/client/overview.
 *
 * DATA CONTRACTS:
 * - Gamification profile: /api/v1/gamification/profile via useGamificationData
 * - Community feed: /api/social/posts/feed via useSocialFeed
 * - Challenges: /api/social/challenges/active via useSocialChallenges
 * - Leaderboard: /api/v1/gamification/leaderboard via useLeaderboard
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../../context/AuthContext';
import { useGamificationData } from '../../../../../hooks/gamification/useGamificationData';
import {
  useCreatePost,
  useLeaderboard,
  useSocialChallenges,
  useSocialFeed,
} from '../../../../../hooks/useDashboardQueries';
import ClientObservatoryFeed from './ClientObservatoryFeed';
import ClientObservatoryHero from './ClientObservatoryHero';
import ClientObservatoryWidgets from './ClientObservatoryWidgets';
import {
  ChallengePreview,
  FeedPostPreview,
  LeaderboardPreview,
  type LensId,
  TIER_LABELS,
  avatarFrom,
  clampPercent,
  displayNameFrom,
  handleFrom,
  hashtagsFromPosts,
} from './ClientObservatoryData';
import {
  MainGrid,
  PageShell,
  PrimaryColumn,
  SideColumn,
} from './ClientObservatoryShell.styles';

const ClientObservatoryHome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const gamification = useGamificationData();
  const feedQuery = useSocialFeed({ limit: 6 });
  const challengeQuery = useSocialChallenges();
  const leaderboardQuery = useLeaderboard({ limit: 5 });
  const createPost = useCreatePost();

  const [activeLens, setActiveLens] = useState<LensId>('reels');
  const [postText, setPostText] = useState('');

  const profile = gamification.profile?.data;
  const progress = clampPercent(profile?.nextLevelProgress ?? gamification.levelProgress?.progressPercent);
  const tier = TIER_LABELS[String(profile?.tier || 'bronze')] || TIER_LABELS.bronze;
  const posts = useMemo(() => (Array.isArray(feedQuery.data) ? feedQuery.data : []) as FeedPostPreview[], [feedQuery.data]);
  const challenges = useMemo(() => (Array.isArray(challengeQuery.data) ? challengeQuery.data : []) as ChallengePreview[], [challengeQuery.data]);
  const leaderboard = useMemo(() => (Array.isArray(leaderboardQuery.data) ? leaderboardQuery.data : []) as LeaderboardPreview[], [leaderboardQuery.data]);
  const achievements = useMemo(() => (
    Array.isArray(gamification.achievements?.data)
      ? gamification.achievements.data
      : Array.isArray(profile?.achievements)
        ? profile.achievements
        : []
  ), [gamification.achievements?.data, profile?.achievements]);
  const tags = useMemo(() => hashtagsFromPosts(posts), [posts]);

  const displayName = displayNameFrom(user, profile);
  const userHandle = handleFrom(user, profile);
  const avatar = avatarFrom(user, profile);
  const level = profile?.level ?? 1;
  const points = profile?.points ?? 0;
  const streakDays = profile?.streakDays ?? 0;

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleLensSelect = useCallback((id: LensId, path: string) => {
    setActiveLens(id);
    if (id !== 'reels') navigate(path);
  }, [navigate]);

  const handleCreatePost = useCallback(async (input?: {
    content: string;
    type: string;
    visibility: 'friends';
    media: File | null;
  }) => {
    const content = (input?.content ?? postText).trim();
    if (content.length < 3) return;
    await createPost.mutateAsync(input ? { ...input, content } : content);
    setPostText('');
  }, [createPost, postText]);

  return (
    <PageShell>
      <ClientObservatoryHero
        activeLens={activeLens}
        avatar={avatar}
        displayName={displayName}
        handle={userHandle}
        level={level}
        points={points}
        progress={progress}
        streakDays={streakDays}
        tierLabel={tier.label}
        tierTone={tier.tone}
        onLensSelect={handleLensSelect}
        onNavigate={handleNavigate}
      />

      <MainGrid>
        <PrimaryColumn>
          <ClientObservatoryFeed
            feedLoading={feedQuery.isLoading}
            posts={posts}
            postText={postText}
            creatingPost={createPost.isPending}
            onPostTextChange={setPostText}
            onCreatePost={handleCreatePost}
            onNavigate={handleNavigate}
          />
        </PrimaryColumn>

        <SideColumn>
          <ClientObservatoryWidgets
            achievements={achievements}
            challenge={challenges[0]}
            leaderboard={leaderboard}
            progress={progress}
            streakDays={streakDays}
            tags={tags}
            onNavigate={handleNavigate}
          />
        </SideColumn>
      </MainGrid>
    </PageShell>
  );
};

export default ClientObservatoryHome;
