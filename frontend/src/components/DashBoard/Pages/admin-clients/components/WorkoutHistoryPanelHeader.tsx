/**
 * WorkoutHistoryPanelHeader
 *
 * Renders the summary chips and History/Charts/PRs tab controls for the
 * canonical workout-history panel. Fetching and save behavior stay in parent.
 */
import React from 'react';
import { Activity, BarChart3, Dumbbell, Flame, ListChecks, Target, Trophy } from 'lucide-react';

import type { AnalyticsData } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryVolume } from './workoutHistoryFormatters';
import { StatChip, SummaryBar, Tab, TabBar } from './WorkoutHistoryPanel.layoutStyles';

export type WorkoutHistoryPanelTab = 'history' | 'charts' | 'exercises' | 'prs';

interface WorkoutHistoryPanelHeaderProps {
  data: AnalyticsData | null;
  activeTab: WorkoutHistoryPanelTab;
  onTabChange(tab: WorkoutHistoryPanelTab): void;
}

const tabs: Array<{
  id: WorkoutHistoryPanelTab;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: 'history', label: 'History', icon: <Dumbbell size={16} /> },
  { id: 'charts', label: 'Charts', icon: <BarChart3 size={16} /> },
  { id: 'exercises', label: 'Exercises', icon: <ListChecks size={16} /> },
  { id: 'prs', label: 'PRs', icon: <Trophy size={16} /> },
];

const WorkoutHistoryPanelHeader: React.FC<WorkoutHistoryPanelHeaderProps> = ({
  data,
  activeTab,
  onTabChange,
}) => (
  <>
    {data && (
      <SummaryBar>
        <StatChip><Dumbbell size={14} /> <strong>{data.summary.totalWorkouts}</strong> workouts</StatChip>
        <StatChip><Activity size={14} /> <strong>{data.summary.totalExercises}</strong> exercises</StatChip>
        <StatChip><Flame size={14} /> <strong>{formatWorkoutHistoryVolume(data.summary.totalVolume)}</strong></StatChip>
        {data.summary.avgIntensity > 0 && (
          <StatChip><Target size={14} /> <strong>{data.summary.avgIntensity}</strong>/10 intensity</StatChip>
        )}
        {data.summary.avgRPE > 0 && (
          <StatChip>RPE <strong>{data.summary.avgRPE}</strong></StatChip>
        )}
        <StatChip><Trophy size={14} /> <strong>{data.personalRecords.length}</strong> PRs</StatChip>
        {data.summary.longestStreak > 1 && (
          <StatChip>{'\uD83D\uDD25'} <strong>{data.summary.longestStreak}</strong> day streak</StatChip>
        )}
      </SummaryBar>
    )}

    <TabBar role="tablist" aria-label="Workout data views">
      {tabs.map((tab) => (
        <Tab
          key={tab.id}
          type="button"
          $active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-controls={`tab-${tab.id}`}
        >
          {tab.icon} {tab.label}
        </Tab>
      ))}
    </TabBar>
  </>
);

export default React.memo(WorkoutHistoryPanelHeader);
