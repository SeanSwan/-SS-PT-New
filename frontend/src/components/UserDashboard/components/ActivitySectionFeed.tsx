/**
 * Activity feed list for the active UserDashboard V3 activity section.
 */

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { ActivityFeed, ActivityIcon, ActivityItem } from './ActivitySection.styles';
import {
  ActivityContent,
  ActivityDescription,
  AchievementDetails,
  AchievementDetailsTitle,
  AchievementIconButton,
  ActivityItemHeader,
  ActivityItemTitle,
  ActivityMeta,
  ActivityTime,
  EmptyCopy,
  EmptyIcon,
  EmptyState,
  EmptyTitle,
  MetaItem,
  MetaLabel,
  ShowMoreButton,
} from './ActivitySectionFeed.styles';
import type { DashboardActivity } from './ActivitySection.types';

interface ActivitySectionFeedProps {
  activities: DashboardActivity[];
  hasMoreActivities: boolean;
  showMore: boolean;
  onToggleShowMore: () => void;
  /** Label of the active filter, so an empty result says WHICH view is empty. */
  activeFilterLabel?: string;
  /** True when the member has activity but none of it matches the filter. */
  isFilteredView?: boolean;
}

const ActivitySectionFeed: React.FC<ActivitySectionFeedProps> = ({
  activities,
  hasMoreActivities,
  showMore,
  onToggleShowMore,
  activeFilterLabel,
  isFilteredView = false,
}) => {
  const [expandedAchievementId, setExpandedAchievementId] = useState<string | null>(null);

  return (
    <ActivityFeed>
      {activities.length > 0 ? (
        <AnimatePresence>
          {activities.map((activity, index) => {
            const Icon = activity.Icon;
            const isAchievement = activity.typeKey === 'achievement';
            const isExpanded = expandedAchievementId === activity.id;
            const detailsId = `achievement-details-${activity.id}`;

            return (
              <ActivityItem
                key={activity.id}
                role="article"
                aria-label={`${activity.type}: ${activity.title}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {isAchievement ? (
                  <AchievementIconButton
                    type="button"
                    $color={activity.color}
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    aria-label={`Show achievement details for ${activity.title}`}
                    onClick={() => setExpandedAchievementId(isExpanded ? null : activity.id)}
                  >
                    <Icon size={20} aria-hidden="true" />
                  </AchievementIconButton>
                ) : (
                  <ActivityIcon $color={activity.color}>
                    <Icon size={20} />
                  </ActivityIcon>
                )}

                <ActivityContent>
                  <ActivityItemHeader>
                    <ActivityItemTitle>{activity.title}</ActivityItemTitle>
                    <ActivityTime>{activity.time}</ActivityTime>
                  </ActivityItemHeader>

                  {!isAchievement && (
                    <ActivityDescription>{activity.description}</ActivityDescription>
                  )}

                  <ActivityMeta>
                    <MetaItem>
                      <MetaLabel>{activity.type}</MetaLabel>
                    </MetaItem>
                  </ActivityMeta>

                  {isAchievement && isExpanded && (
                    <AchievementDetails
                      id={detailsId}
                      role="region"
                      aria-label={`Achievement details for ${activity.title}`}
                    >
                      <AchievementDetailsTitle>Why you earned it</AchievementDetailsTitle>
                      This achievement was recorded from your progress feed: {activity.description}
                    </AchievementDetails>
                  )}
                </ActivityContent>
              </ActivityItem>
            );
          })}
        </AnimatePresence>
      ) : (
        <EmptyState>
          <EmptyIcon>
            <Activity size={32} />
          </EmptyIcon>
          {/* Saying "No recent activity yet" under an active filter told
              members with real history that they had none. */}
          <EmptyTitle>
            {isFilteredView && activeFilterLabel
              ? `Nothing under ${activeFilterLabel} yet`
              : 'No recent activity yet'}
          </EmptyTitle>
          <EmptyCopy>
            {isFilteredView
              ? 'Your other activity is still here — switch filters to see it.'
              : 'Start a workout or create a post!'}
          </EmptyCopy>
        </EmptyState>
      )}

      {hasMoreActivities && (
        <ShowMoreButton
          type="button"
          onClick={onToggleShowMore}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showMore ? (
            <>
              Show Less
              <ChevronUp size={16} />
            </>
          ) : (
            <>
              Show More Activities
              <ChevronDown size={16} />
            </>
          )}
        </ShowMoreButton>
      )}
    </ActivityFeed>
  );
};

export default ActivitySectionFeed;
