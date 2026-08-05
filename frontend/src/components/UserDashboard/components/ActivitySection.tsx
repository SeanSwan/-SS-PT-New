/**
 * COMPONENT: ActivitySection
 * PURPOSE: Active UserDashboard V3 progress activity surface.
 * OWNER: Codex
 * LAST VALIDATED: 2026-05-09
 *
 * WIREFRAME:
 * [Recent Activity title] [filter chips]
 * [stats cards]
 * [activity feed / empty state / show more]
 *
 * DATA FLOW:
 * Props In: none.
 * State: activeFilter, showMore.
 * API Calls: useProfile supplies stats/posts.
 * Events: filter chips change visible feed category; show-more toggles feed count.
 * Children: ActivitySectionFilters, ActivitySectionStats, ActivitySectionFeed.
 *
 * ARCHITECTURE:
 * ActivitySection -> useProfile -> mapping helpers -> presentational children
 */

import React, { useMemo, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { useProfile } from '../../../hooks/profile/useProfile';
import {
  buildActivityStats,
  filterActivities,
  mapPostsToActivities,
} from './ActivitySection.data';
import {
  ActivityContainer,
  ActivityHeader,
  ActivityTitle,
} from './ActivitySection.styles';
import ActivitySectionFeed from './ActivitySectionFeed';
import {
  LoadingContainer,
  LoadingText,
} from './ActivitySectionFeed.styles';
import ActivitySectionFilters from './ActivitySectionFilters';
import ActivitySectionStats from './ActivitySectionStats';
import type { ActivityFilterId, ProfileActivityPost, ProfileStatsSnapshot } from './ActivitySection.types';

const ActivitySection: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<ActivityFilterId>('all');
  const [showMore, setShowMore] = useState(false);
  const { stats, posts, isLoadingStats, isLoadingPosts, statsStatus } = useProfile();

  const activityStats = useMemo(
    () => buildActivityStats(stats as ProfileStatsSnapshot | null),
    [stats],
  );
  const activities = useMemo(
    () => mapPostsToActivities(posts as ProfileActivityPost[] | null),
    [posts],
  );
  const filteredActivities = useMemo(
    () => filterActivities(activities, activeFilter),
    [activities, activeFilter],
  );
  const displayedActivities = showMore ? filteredActivities : filteredActivities.slice(0, 4);
  const hasMoreActivities = filteredActivities.length > 4;

  // `useProfile` substitutes zeros on a stats failure with no error surface,
  // so a loading-only gate let "Workouts 0 - Streak 0 - Followers 0 - Level 1"
  // render as the member's record.
  if (statsStatus === 'unavailable') {
    return (
      <ActivityContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <LoadingContainer role="status">
          <LoadingText>
            We couldn&apos;t load your activity stats just now. Nothing you logged is lost.
          </LoadingText>
        </LoadingContainer>
      </ActivityContainer>
    );
  }

  if (statsStatus === 'loading' || isLoadingPosts) {
    return (
      <ActivityContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <LoadingContainer>
          <Loader2 size={40} />
          <LoadingText>Loading activity...</LoadingText>
        </LoadingContainer>
      </ActivityContainer>
    );
  }

  return (
    <ActivityContainer initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
      <ActivityHeader>
        <ActivityTitle>
          <Activity size={24} />
          Recent Activity
        </ActivityTitle>
        <ActivitySectionFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
      </ActivityHeader>

      <ActivitySectionStats stats={activityStats} />
      <ActivitySectionFeed
        activities={displayedActivities}
        hasMoreActivities={hasMoreActivities}
        showMore={showMore}
        onToggleShowMore={() => setShowMore((current) => !current)}
      />
    </ActivityContainer>
  );
};

export default ActivitySection;
