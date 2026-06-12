import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../context/AuthContext';
import { useGamificationData } from '../../../../hooks/gamification/useGamificationData';
import { useActivityTicker } from '../../../../hooks/social/useActivityTicker';
import { useFaction } from '../../../../hooks/social/useFaction';
import { useParty } from '../../../../hooks/social/useParty';
import { useSocialFeed } from '../../../../hooks/social/useSocialFeed';
import type { FeedStatsSummary } from '../components/SocialFeedPanels';
import type { CoverIdentity } from '../components/FeedCoverStudio';

export type SocialFeedVariant = 'full' | 'compact';

const RECENT_ACTIVITY_WINDOW_MS = 300000;
const RECENT_ACTIVITY_VISIBLE_MS = 10000;

const STAT_COUNTER_BY_POST_TYPE = {
  workout: 'workoutPosts',
  achievement: 'achievementPosts',
  transformation: 'transformationPosts',
} as const;

const createEmptyStats = (): FeedStatsSummary => ({
  totalPosts: 0,
  workoutPosts: 0,
  achievementPosts: 0,
  transformationPosts: 0,
  totalLikes: 0,
  totalComments: 0,
});

const getComposerScrollBehavior = (): ScrollBehavior => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'smooth';
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
};

const focusComposerInput = (composer: HTMLElement, delayMs: number) => {
  globalThis.setTimeout(() => {
    composer.querySelector<HTMLElement>('textarea, input, [contenteditable="true"]')
      ?.focus({ preventScroll: true });
  }, delayMs);
};

export const useSocialFeedViewModel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const feed = useSocialFeed();
  const { profile } = useGamificationData();
  const { events: activityEvents, isConnected: tickerConnected } = useActivityTicker();
  const { factions } = useFaction();
  const { party, myRole, createParty, joinParty, leaveParty } = useParty();
  const [recentActivity, setRecentActivity] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const createPostAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !feed.hasMore) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !feed.isLoadingMore) feed.loadMore();
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [feed.hasMore, feed.isLoadingMore, feed.loadMore]);

  /* Merge M2: identity strip data for the cover — REAL gamification profile
     first (points/tier/streak derive from logged work), auth user as the
     name/photo fallback. Null when nothing identifies the user, so the cover
     degrades to its anonymous form instead of rendering empty chrome. */
  const identity = useMemo((): CoverIdentity | null => {
    const p = profile.data;
    const displayName = [p?.firstName || user?.firstName, p?.lastName || user?.lastName]
      .filter(Boolean)
      .join(' ');
    const username = p?.username || user?.username || '';
    if (!displayName && !username) return null;
    return {
      photo: p?.photo || user?.photo || null,
      displayName: displayName || username,
      username,
      tier: p?.tier || null,
      points: p?.points ?? null,
      streakDays: p?.streakDays ?? null,
    };
  }, [profile.data, user]);

  const feedStats = useMemo(() => {
    return feed.posts.reduce((acc, post) => {
      acc.totalPosts += 1;
      const counterKey = STAT_COUNTER_BY_POST_TYPE[post.type as keyof typeof STAT_COUNTER_BY_POST_TYPE];
      if (counterKey) acc[counterKey] += 1;
      acc.totalLikes += post.likesCount ?? 0;
      acc.totalComments += post.commentsCount ?? 0;
      return acc;
    }, createEmptyStats());
  }, [feed.posts]);

  useEffect(() => {
    if (feed.posts.length === 0) return;

    const latestPost = feed.posts[0];
    const timeDiff = Date.now() - new Date(latestPost.createdAt).getTime();
    if (timeDiff >= RECENT_ACTIVITY_WINDOW_MS) return;

    setRecentActivity(`New ${latestPost.type} post from ${latestPost.user.firstName}`);
    const timer = globalThis.setTimeout(
      () => setRecentActivity(null),
      RECENT_ACTIVITY_VISIBLE_MS,
    );
    return () => globalThis.clearTimeout(timer);
  }, [feed.posts]);

  const handleLikeToggle = useCallback((postId: string, isLiked: boolean) => {
    return isLiked ? feed.unlikePost(postId) : feed.likePost(postId);
  }, [feed.likePost, feed.unlikePost]);

  const handleCreatePostFocus = useCallback(() => {
    const composer = createPostAnchorRef.current;
    if (!composer) return;

    const scrollBehavior = getComposerScrollBehavior();

    composer.scrollIntoView({
      behavior: scrollBehavior,
      block: 'start',
    });
    focusComposerInput(composer, scrollBehavior === 'auto' ? 0 : 240);
  }, []);

  const handleBrowseChallenges = useCallback(() => {
    navigate('/user-dashboard/challenges');
  }, [navigate]);

  const handleFindFriends = useCallback(() => {
    navigate('/user-dashboard/friends');
  }, [navigate]);

  return {
    ...feed,
    activityEvents,
    createParty,
    createPostAnchorRef,
    factions,
    feedStats,
    firstName: user?.firstName,
    handleBrowseChallenges,
    handleCreatePostFocus,
    handleFindFriends,
    handleLikeToggle,
    identity,
    joinParty,
    leaveParty,
    myRole,
    party,
    profileData: profile.data,
    recentActivity,
    sentinelRef,
    tickerConnected,
  };
};

export type SocialFeedViewModel = ReturnType<typeof useSocialFeedViewModel>;
