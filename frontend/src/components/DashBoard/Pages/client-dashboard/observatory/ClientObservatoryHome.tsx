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

import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  CardInner,
  MainGrid,
  MutedText,
  ObservatoryCard,
  PageShell,
  PrimaryColumn,
  SectionTitle,
  SideColumn,
} from './ClientObservatoryShell.styles';

const FriendsList = lazy(() => import('../../../../Social/Friends/FriendsList'));
const ChallengesView = lazy(() => import('../../../../Social/Challenges/ChallengesView'));
const VerticalReels = lazy(() => import('../../../../Social/Reels/VerticalReels'));

const lensFromRoute = (tab?: string): LensId => {
  if (tab === 'reels' || tab === 'friends' || tab === 'challenges') return tab;
  return 'feed';
};

const ClientObservatoryHome: React.FC = () => {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { user } = useAuth();
  const gamification = useGamificationData();
  const feedQuery = useSocialFeed({ limit: 6 });
  const challengeQuery = useSocialChallenges();
  const leaderboardQuery = useLeaderboard({ limit: 5 });
  const createPost = useCreatePost();

  const [activeLens, setActiveLens] = useState<LensId>(() => lensFromRoute(tab));
  const [postText, setPostText] = useState('');
  const [postReceipt, setPostReceipt] = useState<{
    pointsAwarded: number;
    message: string;
  } | null>(null);

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

  useEffect(() => {
    setActiveLens(lensFromRoute(tab));
  }, [tab]);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleLensSelect = useCallback((id: LensId, path: string) => {
    setActiveLens(id);
    navigate(path);
  }, [navigate]);

  const handleCreatePost = useCallback(async (input?: {
    content: string;
    type: string;
    visibility: 'friends';
    media: File | null;
  }) => {
    const content = (input?.content ?? postText).trim();
    if (content.length < 3) return;
    const result = await createPost.mutateAsync(input ? { ...input, content } : content);
    const pointsAwarded = Number(result?.pointsAwarded ?? result?.data?.pointsAwarded ?? 0);
    if (pointsAwarded > 0) {
      setPostReceipt({
        pointsAwarded,
        message: String(
          result?.pointMessage ||
          result?.data?.pointMessage ||
          `You earned ${pointsAwarded} points for sharing an update.`
        ),
      });
    } else {
      setPostReceipt(null);
    }
    setPostText('');
  }, [createPost, postText]);

  const handlePostTextChange = useCallback((value: string) => {
    setPostText(value);
    if (postReceipt) setPostReceipt(null);
  }, [postReceipt]);

  const primaryContent = useMemo(() => {
    if (activeLens === 'reels') {
      return (
        <ObservatoryCard>
          <CardInner>
            <SectionTitle>Reels</SectionTitle>
            <MutedText>Review training clips and creator media in the observatory feed.</MutedText>
            <Suspense fallback={<MutedText>Loading reels...</MutedText>}>
              <VerticalReels frame="dashboard" />
            </Suspense>
          </CardInner>
        </ObservatoryCard>
      );
    }

    if (activeLens === 'friends') {
      return (
        <ObservatoryCard>
          <CardInner>
            <SectionTitle>Friends</SectionTitle>
            <MutedText>Find and manage community connections from the same observatory surface.</MutedText>
            <Suspense fallback={<MutedText>Loading friends...</MutedText>}>
              <FriendsList />
            </Suspense>
          </CardInner>
        </ObservatoryCard>
      );
    }

    if (activeLens === 'challenges') {
      return (
        <ObservatoryCard>
          <CardInner>
            <SectionTitle>Challenges</SectionTitle>
            <MutedText>Join challenges, track goals, and turn social activity into progress.</MutedText>
            <Suspense fallback={<MutedText>Loading challenges...</MutedText>}>
              <ChallengesView />
            </Suspense>
          </CardInner>
        </ObservatoryCard>
      );
    }

    return (
      <ClientObservatoryFeed
        feedLoading={feedQuery.isLoading}
        posts={posts}
        postText={postText}
        creatingPost={createPost.isPending}
        postReceipt={postReceipt}
        onPostTextChange={handlePostTextChange}
        onCreatePost={handleCreatePost}
        onNavigate={handleNavigate}
      />
    );
  }, [
    activeLens,
    createPost.isPending,
    feedQuery.isLoading,
    handleCreatePost,
    handleNavigate,
    handlePostTextChange,
    postReceipt,
    postText,
    posts,
  ]);

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
          {primaryContent}
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
