/**
 * COMPONENT: CanonicalProgressChartsGrid
 * PARENT: ClientProgressDashboardPage
 * PURPOSE: Canonical 15-chart client progress grid from logged workout data.
 */

import React, { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useClientProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import { getProgressProofStatusText } from '../../../../utils/progressProofStatusText';
import { WORKOUT_LOGGED_EVENT } from '../../../../utils/workoutLoggedEvent';
import ClientExerciseMegaStats from '../../progress/ClientExerciseMegaStats';
import MetricConstellation from '../../../Charts/MetricConstellation';
import ExerciseCodexMatrix from '../../progress/ExerciseCodexMatrix';
import ProgressChartCube from '../../progress/ProgressChartCube';
import ProgressChartRecoveryObservatory from '../../progress/ProgressChartRecoveryObservatory';
import ProgressChartWarRoomBoard from '../../progress/ProgressChartWarRoomBoard';
import ProgressProofCockpit from '../../progress-proof/ProgressProofCockpit';
import ProofFacetRail from '../../progress-proof/ProofFacetRail';
import ProgressReportPdfButton from '../../progress-proof/ProgressReportPdfButton';
import LockedChartCard from './CanonicalProgressChartsGrid.lockedCard';
import { LensChartPaletteProvider } from './CanonicalProgressChartsGrid.lensPalette';
import SafeChart from '../../../Charts/SafeChart';
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
  BodyFatTrendCard,
  EstOneRmTrendCard,
  WeightTrendCard,
} from './CanonicalProgressChartsGrid.bodyCards';
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
  // Client self-view: the subject IS the logged-in user, so white-label their
  // progress-report PDF by their own source (move_fitness -> Move Fitness only).
  const { user } = useAuth();
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
    <LensChartPaletteProvider>
    <div data-testid="canonical-progress-charts-grid">
      <ProgressProofCockpit
        activeLensId={activeLensId}
        audience="client"
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
        onLensChange={setActiveLensId}
      />
      <ProofFacetRail populated={nonEmptyChartCount} />
      <ProgressChartCube
        charts={charts}
        nonEmptyChartCount={nonEmptyChartCount}
        unavailableChartCount={unavailableChartCount}
      />
      <ProgressChartWarRoomBoard charts={charts} />
      <ProgressChartRecoveryObservatory charts={charts} />
      <MetricConstellation charts={charts} />
      <SectionHeader>
        <TrendingUp size={13} />
        <span>Progress overview - {getProgressProofStatusText(nonEmptyChartCount, unavailableChartCount)}</span>
        <ProgressReportPdfButton charts={charts} clientSource={user?.clientSource} />
      </SectionHeader>
      <ExerciseCodexMatrix loggedExercises={charts.exerciseFrequency} />
      <ClientExerciseMegaStats exercises={charts.exerciseFrequency} />
      <GridWrap className="lens2-collection">
        {isProgressChartVisible(activeLensId, 'workoutFrequency') && <SafeChart chartName="Workout Frequency"><WorkoutFrequencyCard data={charts.workoutFrequency} /></SafeChart>}
        {isProgressChartVisible(activeLensId, 'attendanceReliability') && <SafeChart chartName="Attendance Reliability">{lockedChartIds.includes('attendanceReliability') ? <LockedChartCard title="Attendance Reliability" /> : <AttendanceReliabilityCard bundle={charts.attendanceReliability} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'weeklyVolume') && <SafeChart chartName="Weekly Volume"><WeeklyVolumeCard data={charts.weeklyVolume} /></SafeChart>}
        {isProgressChartVisible(activeLensId, 'setsRepsTrend') && <SafeChart chartName="Total Sets & Reps">{lockedChartIds.includes('setsRepsTrend') ? <LockedChartCard title="Total Sets & Reps" /> : <SetsRepsTrendCard bundle={charts.setsRepsTrend} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'durationTrend') && <SafeChart chartName="Duration Trend">{lockedChartIds.includes('durationTrend') ? <LockedChartCard title="Duration Trend" /> : <DurationTrendCard data={charts.durationTrend} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'intensityRpeTrend') && <SafeChart chartName="Intensity & RPE">{lockedChartIds.includes('intensityRpeTrend') ? <LockedChartCard title="Intensity & RPE" /> : <IntensityRpeCard data={charts.intensityRpeTrend} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'prTimeline') && <SafeChart chartName="PR Highlights">{lockedChartIds.includes('prTimeline') ? <LockedChartCard title="PR Highlights" /> : <PRTimelineCard data={charts.prTimeline} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'anchorLifts') && <SafeChart chartName="Anchor Lifts">{lockedChartIds.includes('anchorLifts') ? <LockedChartCard title="Anchor Lifts" /> : <AnchorLiftsCard bundle={charts.anchorLifts} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'exerciseFrequency') && <SafeChart chartName="Exercise Frequency">{lockedChartIds.includes('exerciseFrequency') ? <LockedChartCard title="Exercise Frequency" /> : <ExerciseFrequencyCard data={charts.exerciseFrequency} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'movementPatternBalance') && <SafeChart chartName="Movement Pattern Balance">{lockedChartIds.includes('movementPatternBalance') ? <LockedChartCard title="Movement Pattern Balance" /> : <MovementPatternBalanceCard data={charts.movementPatternBalance} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'muscleGroupBalance') && <SafeChart chartName="Muscle Group Balance">{lockedChartIds.includes('muscleGroupBalance') ? <LockedChartCard title="Muscle Group Balance" /> : <MuscleGroupBalanceCard data={charts.muscleGroupBalance} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'recoverySignal') && <SafeChart chartName="Recovery Signal">{lockedChartIds.includes('recoverySignal') ? <LockedChartCard title="Recovery Signal" /> : <RecoverySignalCard data={charts.recoverySignal} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'weightTrend') && <SafeChart chartName="Weight Trend">{lockedChartIds.includes('weightTrend') ? <LockedChartCard title="Weight Trend" /> : <WeightTrendCard data={charts.weightTrend} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'bodyFatTrend') && <SafeChart chartName="Body Fat Trend">{lockedChartIds.includes('bodyFatTrend') ? <LockedChartCard title="Body Fat Trend" /> : <BodyFatTrendCard data={charts.bodyFatTrend} />}</SafeChart>}
        {isProgressChartVisible(activeLensId, 'estOneRm') && <SafeChart chartName="Est. 1RM Trend">{lockedChartIds.includes('estOneRm') ? <LockedChartCard title="Est. 1RM Trend" /> : <EstOneRmTrendCard bundle={charts.estOneRm} />}</SafeChart>}
      </GridWrap>
    </div>
    </LensChartPaletteProvider>
  );
};

export default React.memo(CanonicalProgressChartsGrid);
