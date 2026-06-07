/**
 * COMPONENT: WorkoutHistoryExerciseLedgerTab
 * PURPOSE: Show the complete exercise ledger for a client's logged workouts.
 * CALLERS: WorkoutHistoryPanel -> Exercises tab.
 * DATA FLOW: WorkoutHistoryPanel sessions -> buildExerciseLedger -> ranked rows.
 * SAFETY: No extra API calls and no PII; uses already-authorized WorkoutLog rows.
 * UI NOTES: Desktop uses a dense grid; mobile collapses into metric tiles.
 */
import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Activity, Dumbbell, Hash, TrendingUp } from 'lucide-react';

import type { WorkoutSession } from '../../../../../hooks/analytics/useWorkoutAnalytics';
import { formatWorkoutHistoryDate, formatWorkoutHistoryVolume } from './workoutHistoryFormatters';
import { buildExerciseLedger } from './workoutHistoryPanelData';
import { EmptyState } from './WorkoutHistoryPanel.layoutStyles';

export interface WorkoutHistoryExerciseLedgerTabProps {
  sessions: WorkoutSession[];
}

const LedgerShell = styled.div`
  display: grid;
  gap: 10px;
`;

const LedgerHeader = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(180px, 1.5fr) repeat(6, minmax(72px, 1fr));
  gap: 8px;
  align-items: center;
  padding: 0 12px 8px;
  color: var(--text-secondary, #8BA8C8);
  font-family: 'Sora', sans-serif;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;

  @media (max-width: 900px) {
    display: none;
  }
`;

const LedgerRow = styled.div`
  display: grid;
  grid-template-columns: 56px minmax(180px, 1.5fr) repeat(6, minmax(72px, 1fr));
  gap: 8px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent));
  border-radius: 8px;
  background: var(--bg-surface, #141419);

  @media (max-width: 900px) {
    grid-template-columns: 44px 1fr;
    align-items: flex-start;
  }
`;

const RankBadge = styled.span`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #C6A84B);
  background: var(--bg-base, #0A0A0F);
  border: 1px solid var(--border-gold-soft, color-mix(in srgb, var(--accent-gold, #C6A84B) 32%, transparent));
  font-family: 'Fira Code', monospace;
  font-weight: 800;
`;

const ExerciseCell = styled.div`
  min-width: 0;
`;

const ExerciseName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

const ExerciseSubline = styled.div`
  display: none;
  color: var(--text-secondary, #8BA8C8);
  font-size: 0.75rem;
  margin-top: 4px;

  @media (max-width: 900px) {
    display: block;
  }
`;

const MetricCell = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;

  @media (max-width: 900px) {
    display: none;
  }
`;

const PrimaryMetric = styled(MetricCell)`
  color: var(--accent-primary, #60C0F0);
  font-weight: 700;
`;

const MobileMetricGrid = styled.div`
  display: none;

  @media (max-width: 900px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 10px;
  }
`;

const MobileMetric = styled.div`
  min-height: 44px;
  padding: 8px;
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;

  span {
    display: block;
    color: var(--text-secondary, #8BA8C8);
    font-family: 'Sora', sans-serif;
    font-size: 0.65rem;
    margin-bottom: 2px;
  }
`;

const formatMaxWeight = (maxWeight: number): string => (
  maxWeight > 0 ? `${Math.round(maxWeight).toLocaleString()} lbs` : 'BW'
);

const WorkoutHistoryExerciseLedgerTab: React.FC<WorkoutHistoryExerciseLedgerTabProps> = ({
  sessions,
}) => {
  const ledger = useMemo(() => buildExerciseLedger(sessions), [sessions]);

  if (ledger.length === 0) {
    return (
      <EmptyState>
        <Dumbbell size={40} />
        <p>No exercise ledger yet</p>
      </EmptyState>
    );
  }

  return (
    <LedgerShell>
      <LedgerHeader aria-hidden="true">
        <span>Rank</span>
        <span>Exercise</span>
        <span>Sessions</span>
        <span>Sets</span>
        <span>Reps</span>
        <span>Volume</span>
        <span>Max</span>
        <span>Recent</span>
      </LedgerHeader>

      {ledger.map((row, index) => (
        <LedgerRow key={row.exerciseName}>
          <RankBadge aria-label={`Rank ${index + 1}`}>
            {index + 1}
          </RankBadge>
          <ExerciseCell>
            <ExerciseName>{row.exerciseName}</ExerciseName>
            <ExerciseSubline>
              {row.sessionCount} sessions / {row.setCount} sets / {row.totalReps} reps
            </ExerciseSubline>
            <MobileMetricGrid>
              <MobileMetric><span><Hash size={10} /> Volume</span>{formatWorkoutHistoryVolume(row.totalVolume)}</MobileMetric>
              <MobileMetric><span><TrendingUp size={10} /> Max</span>{formatMaxWeight(row.maxWeight)}</MobileMetric>
              <MobileMetric><span><Activity size={10} /> Sessions</span>{row.sessionCount}</MobileMetric>
              <MobileMetric><span><Dumbbell size={10} /> Recent</span>{formatWorkoutHistoryDate(row.lastDate)}</MobileMetric>
            </MobileMetricGrid>
          </ExerciseCell>
          <PrimaryMetric>{row.sessionCount}</PrimaryMetric>
          <MetricCell>{row.setCount}</MetricCell>
          <MetricCell>{row.totalReps}</MetricCell>
          <PrimaryMetric>{formatWorkoutHistoryVolume(row.totalVolume)}</PrimaryMetric>
          <MetricCell>{formatMaxWeight(row.maxWeight)}</MetricCell>
          <MetricCell>{formatWorkoutHistoryDate(row.lastDate)}</MetricCell>
        </LedgerRow>
      ))}
    </LedgerShell>
  );
};

export default React.memo(WorkoutHistoryExerciseLedgerTab);
