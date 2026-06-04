/**
 * COMPONENT: CanonicalProgressChartsGrid
 * PARENT: ClientProgressDashboardPage
 * PURPOSE: Canonical 12-chart client progress grid from logged workout data.
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { useClientProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import {
  AnchorLiftsCard,
  ExerciseFrequencyCard,
  MovementPatternBalanceCard,
  MuscleGroupBalanceCard,
  PRTimelineCard,
  RecoverySignalCard,
} from './CanonicalProgressChartsGrid.detailCards';
import {
  AttendanceReliabilityCard,
  DurationTrendCard,
  IntensityRpeCard,
  SetsRepsTrendCard,
  WeeklyVolumeCard,
  WorkoutFrequencyCard,
} from './CanonicalProgressChartsGrid.primaryCards';
import {
  ErrorLoadingStrip,
  GridWrap,
  LoadingStrip,
  SectionHeader,
} from './CanonicalProgressChartsGrid.styles';

interface CanonicalProgressChartsGridProps {
  userId?: number | string;
}

const CanonicalProgressChartsGrid: React.FC<CanonicalProgressChartsGridProps> = () => {
  const { charts, isLoading, error, nonEmptyChartCount } = useClientProgressCharts();

  if (isLoading && nonEmptyChartCount === 0) {
    return <LoadingStrip>Loading progress charts...</LoadingStrip>;
  }

  if (error) {
    return <ErrorLoadingStrip>{error}</ErrorLoadingStrip>;
  }

  return (
    <div data-testid="canonical-progress-charts-grid">
      <SectionHeader>
        <TrendingUp size={13} />
        <span>Progress overview - {nonEmptyChartCount} of 12 charts populated</span>
      </SectionHeader>
      <GridWrap>
        <WorkoutFrequencyCard data={charts.workoutFrequency} />
        <AttendanceReliabilityCard bundle={charts.attendanceReliability} />
        <WeeklyVolumeCard data={charts.weeklyVolume} />
        <SetsRepsTrendCard bundle={charts.setsRepsTrend} />
        <DurationTrendCard data={charts.durationTrend} />
        <IntensityRpeCard data={charts.intensityRpeTrend} />
        <PRTimelineCard data={charts.prTimeline} />
        <AnchorLiftsCard bundle={charts.anchorLifts} />
        <ExerciseFrequencyCard data={charts.exerciseFrequency} />
        <MovementPatternBalanceCard data={charts.movementPatternBalance} />
        <MuscleGroupBalanceCard data={charts.muscleGroupBalance} />
        <RecoverySignalCard data={charts.recoverySignal} />
      </GridWrap>
    </div>
  );
};

export default React.memo(CanonicalProgressChartsGrid);
