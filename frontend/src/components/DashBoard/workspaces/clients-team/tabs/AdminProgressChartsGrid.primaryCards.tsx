/**
 * COMPONENT: AdminProgressChartsGrid.primaryCards
 * PURPOSE: Top six admin/trainer client progress chart environments (C11) -
 *          every card carries a truthful momentum strip + facts rail via the
 *          shared ProgressChartInsightBar, never a bare axes-only chart.
 */

import React from 'react';
import { Activity, BarChart3, Calendar, Flame, Layers, Users } from 'lucide-react';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import type { CanonicalProgressCharts } from '../../../../../hooks/analytics/useAdminClientProgressCharts';
import { buildProgressChartPulse } from '../../../progress-proof/progressChartActions';
import {
  buildAttendanceFacts,
  buildSeriesFacts,
  describeIntensitySource,
} from '../../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../../progress-proof/ProgressChartInsightBar';
import {
  isProgressChartVisible,
  type ProgressChartLensId,
} from '../../../progress-proof/progressChartLens';
import AdminProgressProofShare, {
  buildSetsRepsShareRows,
  chartRowsForPoints,
} from './AdminProgressChartsGrid.share';
import { CHART_COLORS, victoryTheme } from '../../../../Charts/chartTheme';
import ChartExpandTrigger from '../../../progress-proof/ChartExpandTrigger';
import { AdminFrequencyChart, AdminSetsRepsChart, AdminVolumeChart } from './AdminProgressChartsGrid.chartBodies';
import { buildWeeklyVolumeDrilldownRows, buildWorkoutFrequencyRows } from '../../../Pages/client-dashboard/CanonicalProgressChartsGrid.expandRows';
import {
  durationLineProps,
  intensityLineProps,
  selectSetsRepsPulseSource,
  summaryForRows,
} from './AdminProgressChartsGrid.chartConfig';
import {
  AttendanceMeta,
  AttendancePercent,
  AttendanceSummary,
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

export const EmptyState: React.FC<{ lead: string; hint: string }> = ({ lead, hint }) => (
  <Empty><em>{lead}</em><span>{hint}</span></Empty>
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
  const attendanceFacts = buildAttendanceFacts(charts.attendanceReliability)
    .filter((fact) => fact.id !== 'showRate');

  return (
    <>
    {isProgressChartVisible(activeLensId, 'workoutFrequency') && <Card data-testid="admin-chart-workoutFrequency">
      <CardHeader>
        <Calendar size={14} color={CHART_COLORS.iceWing} />
        <CardTitle>Workout Frequency</CardTitle>
        <ChartExpandTrigger
          title="Workout Frequency"
          subtitle="Distinct training days per week"
          renderChart={(w, h) => <AdminFrequencyChart data={charts.workoutFrequency} width={w} height={h} />}
          rows={buildWorkoutFrequencyRows(charts.workoutFrequency)}
          pulse={workoutPulse}
        />
      </CardHeader>
      <CardBody>
        {charts.workoutFrequency.length === 0 ? <EmptyState lead="No completed workouts yet" hint="Log the first session and this chart lights up." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              pulse={workoutPulse}
              facts={buildSeriesFacts(charts.workoutFrequency, { unit: 'workouts', pointsLabel: 'wks' })}
            />
            <AdminProgressProofShare
              chartId="admin-workout-frequency"
              csvRows={workoutRows}
              filename="swan-client-workout-frequency-proof.png"
              pulse={workoutPulse}
              summary={summaryForRows('workout frequency', workoutRows.length)}
              title="Workout Frequency"
            />
            <AdminFrequencyChart data={charts.workoutFrequency} />
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
        {charts.attendanceReliability.data.length === 0 ? <EmptyState lead="No attendance data yet" hint="Scheduled sessions build the reliability record." /> : (
          <ChartStack>
            <AttendanceSummary>
              <AttendancePercent>{charts.attendanceReliability.reliabilityPercent}%</AttendancePercent>
              <AttendanceMeta>show-rate</AttendanceMeta>
            </AttendanceSummary>
            <ProgressChartInsightBar facts={attendanceFacts} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'weeklyVolume') && <Card data-testid="admin-chart-weeklyVolume">
      <CardHeader>
        <BarChart3 size={14} color={CHART_COLORS.wingPurple} />
        <CardTitle>Weekly Volume</CardTitle>
        <ChartExpandTrigger
          title="Weekly Volume"
          subtitle="Total lbs moved per week"
          renderChart={(w, h) => <AdminVolumeChart data={charts.weeklyVolume} width={w} height={h} />}
          rows={buildWeeklyVolumeDrilldownRows(charts.weeklyVolume)}
          pulse={volumePulse}
        />
      </CardHeader>
      <CardBody>
        {charts.weeklyVolume.length === 0 ? <EmptyState lead="No logged lifts yet" hint="Weights and reps saved in the logger feed this proof." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              pulse={volumePulse}
              facts={buildSeriesFacts(charts.weeklyVolume, { unit: 'lbs', pointsLabel: 'wks' })}
            />
            <AdminProgressProofShare
              chartId="admin-weekly-volume"
              csvRows={volumeRows}
              filename="swan-client-weekly-volume-proof.png"
              pulse={volumePulse}
              summary={summaryForRows('weekly volume', volumeRows.length)}
              title="Weekly Volume"
            />
            <AdminVolumeChart data={charts.weeklyVolume} />
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'setsRepsTrend') && <Card data-testid="admin-chart-setsReps">
      <CardHeader>
        <Layers size={14} color={CHART_COLORS.arcticCyan} />
        <CardTitle>Sets & Reps Trend</CardTitle>
        <ChartExpandTrigger
          title="Sets & Reps Trend"
          subtitle="Weekly totals"
          renderChart={(w, h) => <AdminSetsRepsChart sets={charts.setsRepsTrend.sets} reps={charts.setsRepsTrend.reps} width={w} height={h} />}
          rows={setsRepsRows.map((r, i) => ({ id: String(r.period ?? i), label: String(r.period ?? i), value: `${r.sets ?? 0} sets / ${r.reps ?? 0} reps` }))}
          pulse={setsRepsPulse}
        />
      </CardHeader>
      <CardBody>
        {!hasSetsRepsData ? <EmptyState lead="No sets or reps logged yet" hint="Each saved workout adds a set-and-rep proof point." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              pulse={setsRepsPulse}
              facts={buildSeriesFacts(setsRepsSource.points, { unit: setsRepsSource.unit, pointsLabel: 'wks' })}
            />
            <AdminProgressProofShare
              chartId="admin-sets-reps"
              csvRows={setsRepsRows}
              filename="swan-client-sets-reps-proof.png"
              pulse={setsRepsPulse}
              summary={summaryForRows('sets and reps', setsRepsRows.length)}
              title="Sets & Reps Trend"
            />
            <AdminSetsRepsChart sets={charts.setsRepsTrend.sets} reps={charts.setsRepsTrend.reps} />
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
        {charts.durationTrend.length === 0 ? <EmptyState lead="No duration data yet" hint="Sessions with tracked time appear here." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={buildSeriesFacts(charts.durationTrend, { unit: 'min', pointsLabel: 'sessions' })}
            />
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
          </ChartStack>
        )}
      </CardBody>
    </Card>}

    {isProgressChartVisible(activeLensId, 'intensityRpeTrend') && <Card data-testid="admin-chart-intensityRpe">
      <CardHeader>
        <Flame size={14} color={CHART_COLORS.wingPurple} />
        <CardTitle>Effort Trend</CardTitle>
      </CardHeader>
      <CardBody>
        {charts.intensityRpeTrend.length === 0 ? <EmptyState lead="No intensity data yet" hint="Logged RPE and session intensity feed this trend." /> : (
          <ChartStack>
            <ProgressChartInsightBar
              facts={[
                ...buildSeriesFacts(charts.intensityRpeTrend, { decimals: 1, pointsLabel: 'wks' }),
                { id: 'source', label: 'Source', value: describeIntensitySource(charts.intensityRpeTrend) },
              ]}
            />
            <VictoryChart theme={victoryTheme} height={180} padding={compactPadding} domain={{ y: [0, 10] }}>
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryLine data={charts.intensityRpeTrend} {...intensityLineProps} />
            </VictoryChart>
          </ChartStack>
        )}
      </CardBody>
    </Card>}
    </>
  );
};
