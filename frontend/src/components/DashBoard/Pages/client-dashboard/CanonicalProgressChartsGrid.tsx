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
import LockedChartCard from './CanonicalProgressChartsGrid.lockedCard';
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
  const { charts, isLoading, error, refetch, nonEmptyChartCount, unavailableChartCount , lockedChartIds } = useClientProgressCharts();
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
        {isProgressChartVisible(activeLensId, 'attendanceReliability') && (lockedChartIds.includes('attendanceReliability') ? <LockedChartCard title="Attendance Reliability" /> : <AttendanceReliabilityCard bundle={charts.attendanceReliability} />)}
        {isProgressChartVisible(activeLensId, 'weeklyVolume') && <WeeklyVolumeCard data={charts.weeklyVolume} />}
        {isProgressChartVisible(activeLensId, 'setsRepsTrend') && (lockedChartIds.includes('setsRepsTrend') ? <LockedChartCard title="Total Sets & Reps" /> : <SetsRepsTrendCard bundle={charts.setsRepsTrend} />)}
        {isProgressChartVisible(activeLensId, 'durationTrend') && (lockedChartIds.includes('durationTrend') ? <LockedChartCard title="Duration Trend" /> : <DurationTrendCard data={charts.durationTrend} />)}
        {isProgressChartVisible(activeLensId, 'intensityRpeTrend') && (lockedChartIds.includes('intensityRpeTrend') ? <LockedChartCard title="Intensity & RPE" /> : <IntensityRpeCard data={charts.intensityRpeTrend} />)}
        {isProgressChartVisible(activeLensId, 'prTimeline') && (lockedChartIds.includes('prTimeline') ? <LockedChartCard title="PR Highlights" /> : <PRTimelineCard data={charts.prTimeline} />)}
        {isProgressChartVisible(activeLensId, 'anchorLifts') && (lockedChartIds.includes('anchorLifts') ? <LockedChartCard title="Anchor Lifts" /> : <AnchorLiftsCard bundle={charts.anchorLifts} />)}
        {isProgressChartVisible(activeLensId, 'exerciseFrequency') && (lockedChartIds.includes('exerciseFrequency') ? <LockedChartCard title="Exercise Frequency" /> : <ExerciseFrequencyCard data={charts.exerciseFrequency} />)}
        {isProgressChartVisible(activeLensId, 'movementPatternBalance') && (lockedChartIds.includes('movementPatternBalance') ? <LockedChartCard title="Movement Pattern Balance" /> : <MovementPatternBalanceCard data={charts.movementPatternBalance} />)}
        {isProgressChartVisible(activeLensId, 'muscleGroupBalance') && (lockedChartIds.includes('muscleGroupBalance') ? <LockedChartCard title="Muscle Group Balance" /> : <MuscleGroupBalanceCard data={charts.muscleGroupBalance} />)}
        {isProgressChartVisible(activeLensId, 'recoverySignal') && (lockedChartIds.includes('recoverySignal') ? <LockedChartCard title="Recovery Signal" /> : <RecoverySignalCard data={charts.recoverySignal} />)}
      </GridWrap>
    </div>
  );
};

export default React.memo(CanonicalProgressChartsGrid);
