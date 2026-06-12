/**
 * ============================================================================
 * FILE: SocialRightRail.tsx
 * PURPOSE: Desktop third column on the /social feed tab (merge M3).
 * AUTHOR: Claude Fable 5 | CREATED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Four live widgets beside the feed — Live Activity
 * (shared socket stream), Active Challenge (real challenges lane), Leaderboard
 * top-3 (gamification), and Next Best Action (computed from the real profile).
 * All data comes from already-cached hooks / the shared activity singleton, so
 * the rail adds no duplicate sockets and minimal cost.
 *
 * HOW IT FITS IN THE APP: Mounted by SocialPage.V3 as the 3rd grid column,
 * feed-tab + desktop only. Hidden below the 3-col breakpoint (the same data is
 * reachable via the Challenges tab, the dashboard leaderboard, and the logger).
 *
 * KEY DECISIONS:
 * - Reuses useActivityTicker (now a singleton — merge M3) so it shares the
 *   feed's one socket instead of opening a second.
 * - Honest empty states everywhere; never fabricates activity/challenges.
 * - Arctic Cyan reserved for DATA values only (rule: data-only color).
 */

import React, { useMemo } from 'react';
import { Activity, Trophy, Crown, Compass, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useActivityTicker, type ActivityEvent } from '../../../hooks/social/useActivityTicker';
import { useChallenges } from '../../../hooks/useChallenges';
import { useGamificationData } from '../../../hooks/gamification/useGamificationData';
import { useAuth } from '../../../context/AuthContext';
import { getLogWorkoutDashboardPath } from '../../../components/UserDashboard/components/swanCoachDashboardRoute';
import {
  LiveDot,
  NbaButton,
  NbaText,
  RailCard,
  RailColumn,
  RailEmpty,
  RailHeader,
  RailLink,
  RailMeta,
  RailName,
  RailRank,
  RailRow,
  RailTitle,
} from './SocialRightRail.styles';

const activityText = (e: ActivityEvent): string => {
  const who = e.userName || 'A member';
  switch (e.type) {
    case 'workout_completed': return `${who} completed a workout`;
    case 'streak_milestone': return e.preview || `${who} hit a streak milestone`;
    case 'achievement_unlocked': return e.preview || `${who} unlocked an achievement`;
    case 'post_created': return `${who} shared a ${e.postType || 'post'}`;
    case 'reaction_added': return `${who} reacted to a post`;
    case 'comment_added': return `${who} commented`;
    default: return `${who} is active`;
  }
};

const SocialRightRail: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events } = useActivityTicker();
  const { challenges } = useChallenges();
  const { leaderboard, profile } = useGamificationData();

  const liveEvents = events.slice(0, 4);

  const topChallenge = useMemo(
    () => challenges.find((c) => c.status === 'active'),
    [challenges],
  );

  const topThree = (leaderboard.data ?? []).slice(0, 3);

  const nba = useMemo(() => {
    const p = profile.data;
    const streak = p?.streakDays ?? 0;
    const progress = p?.nextLevelProgress ?? 0;
    const level = p?.level ?? 1;
    if (streak > 0) {
      return `Log a workout today to keep your ${streak}-day streak alive.`;
    }
    if (progress > 0) {
      return `You're ${progress}% to Level ${level + 1}. Log a workout to close the gap.`;
    }
    return 'Log your first workout to start your streak and level up.';
  }, [profile.data]);

  return (
    <RailColumn aria-label="Community activity">
      {/* Live Activity */}
      <RailCard>
        <RailHeader>
          <Activity size={16} />
          <RailTitle>Live Activity</RailTitle>
          <LiveDot aria-hidden="true" />
        </RailHeader>
        {liveEvents.length === 0 ? (
          <RailEmpty>Quiet right now — be the first to move.</RailEmpty>
        ) : (
          liveEvents.map((e) => (
            <RailRow key={e.id}>{activityText(e)}</RailRow>
          ))
        )}
      </RailCard>

      {/* Active Challenge */}
      <RailCard>
        <RailHeader>
          <Trophy size={16} />
          <RailTitle>Active Challenge</RailTitle>
        </RailHeader>
        {topChallenge ? (
          <>
            <RailRow>
              <RailName>{topChallenge.title}</RailName>
              {topChallenge.daysLeft != null && (
                <RailMeta>{topChallenge.daysLeft}d left</RailMeta>
              )}
            </RailRow>
            <RailRow>
              <RailName>{topChallenge.participants} in</RailName>
              <RailMeta>{topChallenge.reward}</RailMeta>
            </RailRow>
          </>
        ) : (
          <RailEmpty>No active challenge right now.</RailEmpty>
        )}
        <RailLink onClick={() => navigate('/social/challenges')}>
          All challenges <ChevronRight size={14} />
        </RailLink>
      </RailCard>

      {/* Leaderboard top-3 */}
      <RailCard>
        <RailHeader>
          <Crown size={16} />
          <RailTitle>Leaderboard</RailTitle>
        </RailHeader>
        {topThree.length === 0 ? (
          <RailEmpty>Leaderboard fills as the community trains.</RailEmpty>
        ) : (
          topThree.map((entry, i) => (
            <RailRow key={entry.userId}>
              <RailRank>{i + 1}</RailRank>
              <RailName>{entry.client?.firstName || entry.client?.username || 'Member'}</RailName>
              <RailMeta>Lvl {entry.overallLevel}</RailMeta>
            </RailRow>
          ))
        )}
      </RailCard>

      {/* Next Best Action */}
      <RailCard>
        <RailHeader>
          <Compass size={16} />
          <RailTitle>Next Best Action</RailTitle>
        </RailHeader>
        <NbaText>{nba}</NbaText>
        <NbaButton onClick={() => navigate(getLogWorkoutDashboardPath(user?.role))}>
          Log a workout
        </NbaButton>
      </RailCard>
    </RailColumn>
  );
};

export default SocialRightRail;
