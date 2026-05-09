/**
 * Stats cards for the active UserDashboard V3 activity section.
 */

import React from 'react';
import {
  StatCard,
  StatIcon,
  StatLabel,
  StatsOverview,
  StatValue,
} from './ActivitySection.styles';
import type { ActivityStat } from './ActivitySection.types';

interface ActivitySectionStatsProps {
  stats: ActivityStat[];
}

const ActivitySectionStats: React.FC<ActivitySectionStatsProps> = ({ stats }) => (
  <StatsOverview>
    {stats.map(({ label, value, color, Icon }, index) => (
      <StatCard
        key={label}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
        whileHover={{ scale: 1.02 }}
      >
        <StatIcon $color={color}>
          <Icon size={24} />
        </StatIcon>
        <StatValue>{value}</StatValue>
        <StatLabel>{label}</StatLabel>
      </StatCard>
    ))}
  </StatsOverview>
);

export default ActivitySectionStats;
