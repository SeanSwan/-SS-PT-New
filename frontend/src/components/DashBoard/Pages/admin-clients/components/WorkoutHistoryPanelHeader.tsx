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

const buildSummaryChips = (data: AnalyticsData): Array<{
  key: string;
  content: React.ReactNode;
}> => {
  const chips = [
    { key: 'workouts', content: <><Dumbbell size={14} /> <strong>{data.summary.totalWorkouts}</strong> workouts</> },
    { key: 'exercises', content: <><Activity size={14} /> <strong>{data.summary.totalExercises}</strong> exercises</> },
    { key: 'volume', content: <><Flame size={14} /> <strong>{formatWorkoutHistoryVolume(data.summary.totalVolume)}</strong></> },
    { key: 'prs', content: <><Trophy size={14} /> <strong>{data.personalRecords.length}</strong> PRs</> },
  ];
  if (typeof data.summary.avgIntensity === 'number' && data.summary.avgIntensity > 0) {
    chips.push({
      key: 'intensity',
      content: <><Target size={14} /> <strong>{data.summary.avgIntensity}</strong>/10 intensity</>,
    });
  }
  if (typeof data.summary.avgRPE === 'number' && data.summary.avgRPE > 0) {
    chips.push({ key: 'rpe', content: <>RPE <strong>{data.summary.avgRPE}</strong></> });
  }
  if (data.summary.longestStreak > 1) {
    chips.push({
      key: 'streak',
      content: <><Flame size={14} /> <strong>{data.summary.longestStreak}</strong> day streak</>,
    });
  }
  return chips;
};

const WorkoutHistoryPanelHeader: React.FC<WorkoutHistoryPanelHeaderProps> = ({
  data,
  activeTab,
  onTabChange,
}) => (
  <>
    {data && (
      <SummaryBar>
        {buildSummaryChips(data).map((chip) => (
          <StatChip key={chip.key}>
            {chip.content}
          </StatChip>
        ))}
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
