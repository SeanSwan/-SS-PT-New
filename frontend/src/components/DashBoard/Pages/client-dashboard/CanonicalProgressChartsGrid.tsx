/**
 * COMPONENT: CanonicalProgressChartsGrid
 * PARENT: ClientProgressDashboardPage
 * PURPOSE: Canonical 12-chart client progress grid from logged workout data.
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useClientProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import { getProgressProofStatusText } from '../../../../utils/progressProofStatusText';
import { WORKOUT_LOGGED_EVENT } from '../../../../utils/workoutLoggedEvent';
import ClientExerciseMegaStats from '../../progress/ClientExerciseMegaStats';
import ExerciseCodexMatrix from '../../progress/ExerciseCodexMatrix';
import ProgressChartCube from '../../progress/ProgressChartCube';
import ProgressChartRecoveryObservatory from '../../progress/ProgressChartRecoveryObservatory';
import ProgressChartWarRoomBoard from '../../progress/ProgressChartWarRoomBoard';
import ProgressProofCockpit from '../../progress-proof/ProgressProofCockpit';
import {
  isProgressChartVisible,
  type ProgressChartLensId,
} from '../../progress-proof/progressChartLens';
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
  WorkoutFrequencyCard,
} from './CanonicalProgressChartsGrid.primaryCards';
import {
  SetsRepsTrendCard,
  WeeklyVolumeCard,
} from './CanonicalProgressChartsGrid.interactiveCards';
import {
  ErrorLoadingStrip,
  GridWrap,
  LoadingStrip,
  SectionHeader,
} from './CanonicalProgressChartsGrid.styles';

const CanonicalProgressChartsGrid: React.FC = () => {
  const { charts, isLoading, error, refetch, nonEmptyChartCount, unavailableChartCount } = useClientProgressCharts();
  const [activeLensId, setActiveLensId] = useState<ProgressChartLensId>('all');

  useEffect(() => {
    window.addEventListener(WORKOUT_LOGGED_EVENT, refetch);
    return () => window.removeEventListener(WORKOUT_LOGGED_EVENT, refetch);
  }, [refetch]);

  if (isLoading && nonEmptyChartCount === 0) {
    return <LoadingStrip>Loading progress charts...</LoadingStrip>;
  }

  if (error) {
    return <ErrorLoadingStrip>{error}</ErrorLoadingStrip>;
  }

  return (
    <div data-testid="canonical-progress-charts-grid">
      <ProgressProofCockpit
        activeLensId={activeLensId}
        audience="client"
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
        onLensChange={setActiveLensId}
      />
      <ProgressChartCube
        charts={charts}
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
      />
      <ProgressChartWarRoomBoard charts={charts} />
      <ProgressChartRecoveryObservatory charts={charts} />
      <SectionHeader>
        <TrendingUp size={13} />
        <span>Progress overview - {getProgressProofStatusText(nonEmptyChartCount, unavailableChartCount)}</span>
      </SectionHeader>
      <ExerciseCodexMatrix loggedExercises={charts.exerciseFrequency} />
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <GridWrap>
        {isProgressChartVisible(activeLensId, 'workoutFrequency') && <WorkoutFrequencyCard data={charts.workoutFrequency} />}
        {isProgressChartVisible(activeLensId, 'attendanceReliability') && <AttendanceReliabilityCard bundle={charts.attendanceReliability} />}
        {isProgressChartVisible(activeLensId, 'weeklyVolume') && <WeeklyVolumeCard data={charts.weeklyVolume} />}
        {isProgressChartVisible(activeLensId, 'setsRepsTrend') && <SetsRepsTrendCard bundle={charts.setsRepsTrend} />}
        {isProgressChartVisible(activeLensId, 'durationTrend') && <DurationTrendCard data={charts.durationTrend} />}
        {isProgressChartVisible(activeLensId, 'intensityRpeTrend') && <IntensityRpeCard data={charts.intensityRpeTrend} />}
        {isProgressChartVisible(activeLensId, 'prTimeline') && <PRTimelineCard data={charts.prTimeline} />}
        {isProgressChartVisible(activeLensId, 'anchorLifts') && <AnchorLiftsCard bundle={charts.anchorLifts} />}
        {isProgressChartVisible(activeLensId, 'exerciseFrequency') && <ExerciseFrequencyCard data={charts.exerciseFrequency} />}
        {isProgressChartVisible(activeLensId, 'movementPatternBalance') && <MovementPatternBalanceCard data={charts.movementPatternBalance} />}
        {isProgressChartVisible(activeLensId, 'muscleGroupBalance') && <MuscleGroupBalanceCard data={charts.muscleGroupBalance} />}
        {isProgressChartVisible(activeLensId, 'recoverySignal') && <RecoverySignalCard data={charts.recoverySignal} />}
      </GridWrap>
    </div>
  );
};

export default React.memo(CanonicalProgressChartsGrid);
