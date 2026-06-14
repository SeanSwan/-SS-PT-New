/**
 * Summary stat cards for the active UserDashboard V3 workout panel.
 */

import React from 'react';
import { Dumbbell, Flame, TrendingUp } from 'lucide-react';
import {
  StatCard,
  StatIcon,
  StatLabel,
  StatsRow,
  StatValue,
} from './WorkoutsTabStyles';
import type { WorkoutSummaryStats } from './WorkoutsTabData';

interface WorkoutsTabSummaryProps {
  stats: WorkoutSummaryStats;
  streak: number;
}

const WorkoutsTabSummary: React.FC<WorkoutsTabSummaryProps> = ({ stats, streak }) => (
  <StatsRow>
    <StatCard>
      <StatIcon><TrendingUp size={18} /></StatIcon>
      <StatValue>{stats.totalExercises.toLocaleString()}</StatValue>
      <StatLabel>Logged Moves</StatLabel>
    </StatCard>
    <StatCard>
      <StatIcon><Flame size={18} /></StatIcon>
      <StatValue>{stats.mostActiveCategory}</StatValue>
      <StatLabel>Most Active</StatLabel>
    </StatCard>
    <StatCard>
      <StatIcon><Dumbbell size={18} /></StatIcon>
      <StatValue>{streak}</StatValue>
      <StatLabel>Day Streak</StatLabel>
    </StatCard>
  </StatsRow>
);

export default WorkoutsTabSummary;
