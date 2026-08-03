/**
 * FILE: useHomeTabLiveWidgets.ts
 * PURPOSE: Connects Home tab rail widgets to existing live dashboard APIs.
 */

import { useMemo } from 'react';
import { useChallenges } from '../../../hooks/useChallenges';
import { useActivityTicker } from '../../../hooks/social/useActivityTicker';
import { useTrendingHashtags } from '../../../hooks/useDashboardQueries';
import {
  buildHomeBadgeShowcase,
  buildHomeLiveActivity,
  extractTrendingTagNames,
  selectActiveChallengeSummary,
} from './HomeTabViewModel';

interface UseHomeTabLiveWidgetsInput {
  displayName: string;
  feedPosts: unknown[];
  achievements?: unknown[] | null;
  leaderboard?: unknown[] | null;
  /**
   * @deprecated Vestigial. It fed a synthetic self-row in the leaderboard that
   * reported "#1" to every member; that fabrication is gone. Kept on the public
   * input so existing callers still compile — remove once they stop passing it.
   */
  currentUserPoints?: number;
}

export function useHomeTabLiveWidgets({
  displayName,
  feedPosts,
  achievements,
  leaderboard,
}: UseHomeTabLiveWidgetsInput) {
  const activity = useActivityTicker();
  const challenges = useChallenges();
  const trending = useTrendingHashtags({ limit: 5 });

  const liveActivityItems = useMemo(() => buildHomeLiveActivity({
    displayName,
    events: activity.events,
    feedPosts,
  }), [activity.events, displayName, feedPosts]);

  const activeChallenge = useMemo(() => selectActiveChallengeSummary({
    challenges: challenges.challenges,
    isDemoData: challenges.isDemoData,
  }), [challenges.challenges, challenges.isDemoData]);

  const badgeShowcase = useMemo(() => buildHomeBadgeShowcase({
    achievements,
    leaderboard,
  }), [achievements, leaderboard]);

  const trendingTags = useMemo(
    () => extractTrendingTagNames(trending.data),
    [trending.data],
  );

  return {
    liveActivityItems,
    liveActivityConnected: activity.isConnected,
    activeChallenge,
    challengeLoading: challenges.loading,
    badges: badgeShowcase.badges,
    leaderboardRows: badgeShowcase.leaderboardRows,
    trendingTags,
    trendingLoading: trending.isLoading,
  };
}
