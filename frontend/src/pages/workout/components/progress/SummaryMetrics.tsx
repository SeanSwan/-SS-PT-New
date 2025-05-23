/**
 * SummaryMetrics Component
 * =======================
 * Displays summary metrics for client workout progress
 */

import React from 'react';
import { 
  MetricsGrid, 
  MetricCard, 
  MetricValue, 
  MetricLabel 
} from '../../styles/ClientProgress.styles';
import { WorkoutStatistics, ClientProgressData } from '../../types/progress.types';

interface SummaryMetricsProps {
  statistics: WorkoutStatistics;
  progress: ClientProgressData;
}

export const SummaryMetrics: React.FC<SummaryMetricsProps> = ({
  statistics,
  progress
}) => {
  return (
    <MetricsGrid>
      <MetricCard>
        <MetricValue>{statistics.totalWorkouts}</MetricValue>
        <MetricLabel>Total Workouts</MetricLabel>
      </MetricCard>
      
      <MetricCard>
        <MetricValue>{Math.round(statistics.totalDuration / 60)}</MetricValue>
        <MetricLabel>Total Hours</MetricLabel>
      </MetricCard>
      
      <MetricCard>
        <MetricValue>{statistics.totalSets.toLocaleString()}</MetricValue>
        <MetricLabel>Total Sets</MetricLabel>
      </MetricCard>
      
      <MetricCard>
        <MetricValue>{statistics.totalReps.toLocaleString()}</MetricValue>
        <MetricLabel>Total Reps</MetricLabel>
      </MetricCard>
      
      <MetricCard>
        <MetricValue>{Math.round(statistics.totalWeight).toLocaleString()}</MetricValue>
        <MetricLabel>Total Weight (lbs)</MetricLabel>
      </MetricCard>
      
      <MetricCard>
        <MetricValue>{progress.currentStreak}</MetricValue>
        <MetricLabel>Current Streak</MetricLabel>
      </MetricCard>
    </MetricsGrid>
  );
};

export default SummaryMetrics;
