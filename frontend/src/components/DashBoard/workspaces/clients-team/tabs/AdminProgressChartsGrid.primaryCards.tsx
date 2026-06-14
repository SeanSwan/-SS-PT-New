/**
 * COMPONENT: AdminProgressChartsGrid.primaryCards
 * PURPOSE: Top six admin/trainer client progress charts.
 */

import React from 'react';
import { Activity, BarChart3, Calendar, Flame, Layers, Users } from 'lucide-react';
import {
  VictoryArea,
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import {
  buildProgressChartPulse,
  type ProgressChartPulse,
} from '../../../progress-proof/progressChartActions';
import {
  isProgressChartVisible,
  type ProgressChartLensId,
} from '../../../progress-proof/progressChartLens';
import AdminProgressProofShare, {
  buildSetsRepsShareRows,
  chartRowsForPoints,
} from './AdminProgressChartsGrid.share';
import { CHART_COLORS, victoryTheme } from '../../../../Charts/chartTheme';
import {
  durationLineProps,
  intensityLineProps,
  repsBarProps,
  setsBarProps,
  weeklyVolumeAreaProps,
  workoutFrequencyBarProps,
} from './AdminProgressChartsGrid.chartConfig';
import {
  AttendanceMeta,
  AttendancePercent,
  AttendanceSummary,
  AdminPulseDetail,
  AdminPulseLabel,
  AdminPulseStrip,
  AdminPulseValue,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  ChartStack,
  Empty,
} from './AdminProgressChartsGrid.styles';

interface AdminProgressPrimaryCardsProps {
  charts: CanonicalProgressCharts;
  activeLensId: ProgressChartLensId;
}

const compactPadding = { top: 12, bottom: 36, left: 36, right: 8 };
const volumePadding = { top: 12, bottom: 36, left: 48, right: 8 };
const groupedPadding = { top: 20, bottom: 36, left: 44, right: 8 };

const selectSetsRepsPulseSource = (bundle: CanonicalProgressCharts['setsRepsTrend']) => (
  bundle.reps.length > 0
    ? { label: 'Rep Pulse', points: bundle.reps, unit: 'reps' }
    : { label: 'Set Pulse', points: bundle.sets, unit: 'sets' }
);

const AdminProgressPulse: React.FC<{ pulse: ProgressChartPulse }> = ({ pulse }) => (
  <AdminPulseStrip $tone={pulse.tone} aria-label={`${pulse.label}: ${pulse.value}`}>
    <AdminPulseLabel>{pulse.label}</AdminPulseLabel>
    <AdminPulseValue>{pulse.value}</AdminPulseValue>
    <AdminPulseDetail>{pulse.detail}</AdminPulseDetail>
  </AdminPulseStrip>
);

const summaryForRows = (title: string, rowCount: number) => (
  `Showing ${rowCount} verified ${title} point${rowCount === 1 ? '' : 's'} for this client.`
);

export const AdminProgressPrimaryCards: React.FC<AdminProgressPrimaryCardsProps> = ({ charts, activeLensId }) => {
  const workoutPulse = buildProgressChartPulse(charts.workoutFrequency, {
    label: 'Frequency Pulse',
    unit: 'workouts',
  });
  const volumePulse = buildProgressChartPulse(charts.weeklyVolume, {
    label: 'Volume Pulse',
    unit: 'lbs',
  });
  const setsRepsSource = selectSetsRepsPulseSource(charts.setsRepsTrend);
  const setsRepsPulse = buildProgressChartPulse(setsRepsSource.points, {
    label: setsRepsSource.label,
    unit: setsRepsSource.unit,
  });
  const hasSetsRepsData = charts.setsRepsTrend.sets.length > 0 || charts.setsRepsTrend.reps.length > 0;
  const workoutRows = chartRowsForPoints(charts.workoutFrequency, 'period', 'workouts');
  const volumeRows = chartRowsForPoints(charts.weeklyVolume, 'week', 'volume_lbs');
  const setsRepsRows = buildSetsRepsShareRows(charts.setsRepsTrend.sets, charts.setsRepsTrend.reps);

  return (
    <>
    {isProgressChartVisible(activeLensId, 'workoutFrequency') && <Card data-testid="admin-chart-workoutFrequency">
      <CardHeader>
        <Calendar size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Workout Frequency</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.workoutFrequency.length === 0 ? <Empty>No completed workouts yet</Empty> : (
          <ChartStack>
            <AdminProgressPulse pulse={workoutPulse} />
            <AdminProgressProofShare
              chartId="admin-workout-frequency"
              csvRows={workoutRows}
              filename="swan-client-workout-frequency-proof.png"
              pulse={workoutPulse}
              summary={summaryForRows('workout frequency', workoutRows.length)}
              title="Workout Frequency"
            />
            <VictoryChart
              theme={victoryTheme}
              height={180}
              padding={compactPadding}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryBar
                data={charts.workoutFrequency}
                {...workoutFrequencyBarProps}
                cornerRadius={{ top: 3 }}
                labels={({ datum }) => `${datum.x}: ${datum.y}`}
                labelComponent={<VictoryTooltip renderInPortal={false} />}
              />
            </VictoryChart>
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'attendanceReliability') && <Card data-testid="admin-chart-attendance">
      <CardHeader>
        <Users size={14} color={CHART_COLORS.gildedFern} />
        <CardTitle>Attendance Reliability</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.attendanceReliability.data.length === 0 ? <Empty>No attendance data yet</Empty> : (
          <AttendanceSummary>
            <AttendancePercent>{charts.attendanceReliability.reliabilityPercent}%</AttendancePercent>
            <AttendanceMeta>
              show-rate<br />
              {charts.attendanceReliability.totals.completed} completed / {charts.attendanceReliability.totals.resolved} resolved
            </AttendanceMeta>
          </AttendanceSummary>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'weeklyVolume') && <Card data-testid="admin-chart-weeklyVolume">
      <CardHeader>
        <BarChart3 size={14} color={CHART_COLORS.wingPurple} />
        <CardTitle>Weekly Volume</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.weeklyVolume.length === 0 ? <Empty>No logged lifts yet</Empty> : (
          <ChartStack>
            <AdminProgressPulse pulse={volumePulse} />
            <AdminProgressProofShare
              chartId="admin-weekly-volume"
              csvRows={volumeRows}
              filename="swan-client-weekly-volume-proof.png"
              pulse={volumePulse}
              summary={summaryForRows('weekly volume', volumeRows.length)}
              title="Weekly Volume"
            />
            <VictoryChart
              theme={victoryTheme}
              height={180}
              padding={volumePadding}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryArea
                data={charts.weeklyVolume}
                {...weeklyVolumeAreaProps}
                labels={({ datum }) => `${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs`}
                labelComponent={<VictoryTooltip renderInPortal={false} />}
              />
            </VictoryChart>
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'setsRepsTrend') && <Card data-testid="admin-chart-setsReps">
      <CardHeader>
        <Layers size={14} color={CHART_COLORS.arcticCyan} />
        <CardTitle>Sets & Reps Trend</CardTitle>
      </CardHeader>
      <CardBody>
        {!hasSetsRepsData ? <Empty>No sets or reps logged yet</Empty> : (
          <ChartStack>
            <AdminProgressPulse pulse={setsRepsPulse} />
            <AdminProgressProofShare
              chartId="admin-sets-reps"
              csvRows={setsRepsRows}
              filename="swan-client-sets-reps-proof.png"
              pulse={setsRepsPulse}
              summary={summaryForRows('sets and reps', setsRepsRows.length)}
              title="Sets & Reps Trend"
            />
            <VictoryChart
              theme={victoryTheme}
              height={180}
              padding={groupedPadding}
              containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryGroup offset={8}>
                <VictoryBar data={charts.setsRepsTrend.sets} {...setsBarProps} />
                <VictoryBar data={charts.setsRepsTrend.reps} {...repsBarProps} />
              </VictoryGroup>
            </VictoryChart>
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'durationTrend') && <Card data-testid="admin-chart-duration">
      <CardHeader>
        <Activity size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Session Duration</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.durationTrend.length === 0 ? <Empty>No duration data yet</Empty> : (
          <VictoryChart
            theme={victoryTheme}
            height={180}
            padding={compactPadding}
            containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
          >
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryLine
              data={charts.durationTrend}
              {...durationLineProps}
              labels={({ datum }) => `${datum.x}: ${datum.y}min`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
          </VictoryChart>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'intensityRpeTrend') && <Card data-testid="admin-chart-intensityRpe">
      <CardHeader>
        <Flame size={14} color={CHART_COLORS.wingPurple} />
        <CardTitle>Effort Trend</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.intensityRpeTrend.length === 0 ? <Empty>No intensity data yet</Empty> : (
          <VictoryChart theme={victoryTheme} height={180} padding={compactPadding} domain={{ y: [0, 10] }}>
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryLine data={charts.intensityRpeTrend} {...intensityLineProps} />
          </VictoryChart>
        )}
      </CardBody>
    </Card>}
    </>
  );
};
