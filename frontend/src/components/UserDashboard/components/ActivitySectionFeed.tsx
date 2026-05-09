/**
 * Activity feed list for the active UserDashboard V3 activity section.
 */

import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, ChevronUp } from 'lucide-react';
import { ActivityFeed, ActivityIcon, ActivityItem } from './ActivitySection.styles';
import {
  ActivityContent,
  ActivityDescription,
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
}

const ActivitySectionFeed: React.FC<ActivitySectionFeedProps> = ({
  activities,
  hasMoreActivities,
  showMore,
  onToggleShowMore,
}) => (
  <ActivityFeed>
    {activities.length > 0 ? (
      <AnimatePresence>
        {activities.map((activity, index) => {
          const Icon = activity.Icon;

          return (
            <ActivityItem
              key={activity.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <ActivityIcon $color={activity.color}>
                <Icon size={20} />
              </ActivityIcon>

              <ActivityContent>
                <ActivityItemHeader>
                  <ActivityItemTitle>{activity.title}</ActivityItemTitle>
                  <ActivityTime>{activity.time}</ActivityTime>
                </ActivityItemHeader>

                <ActivityDescription>{activity.description}</ActivityDescription>

                <ActivityMeta>
                  <MetaItem>
                    <MetaLabel>{activity.type}</MetaLabel>
                  </MetaItem>
                </ActivityMeta>
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
        <EmptyTitle>No recent activity yet</EmptyTitle>
        <EmptyCopy>Start a workout or create a post!</EmptyCopy>
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

export default ActivitySectionFeed;
