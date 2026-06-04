/**
 * COMPONENT: CanonicalProgressChartsGrid.primaryCards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: First six canonical progress chart cards.
 */

import React from 'react';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
  VictoryLine,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryArea,
} from 'victory';
import { Activity, BarChart3, Calendar, Flame, Layers, Users } from 'lucide-react';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, victoryTheme } from '../../../Charts/chartTheme';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import {
  durationLineProps,
  intensityLineProps,
  repsBarProps,
  setsBarProps,
  setsRepsLegendProps,
  weeklyVolumeAreaProps,
  workoutFrequencyBarProps,
} from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
  RingLabel,
  RingNumber,
  RingWrap,
  StatPill,
  StatPillLabel,
  StatPillValue,
  StatStack,
} from './CanonicalProgressChartsGrid.styles';

export const WorkoutFrequencyCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => (
  <ChartCard data-testid="chart-card-workoutFrequency">
    <CardHeader>
      <CardIcon><Calendar size={16} /></CardIcon>
      <CardTitle>Workout Frequency</CardTitle>
      <CardSubtitle>12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No completed workouts yet" hint="Log your first session to start the streak." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis tickFormat={(t) => String(t)} />
          <VictoryAxis dependentAxis />
          <VictoryBar
            data={data}
            {...workoutFrequencyBarProps}
            labels={({ datum }) => `${datum.x}: ${datum.y}`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
            cornerRadius={{ top: 3 }}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

export const AttendanceReliabilityCard: React.FC<{
  bundle: CanonicalProgressCharts['attendanceReliability'];
}> = ({ bundle }) => (
  <ChartCard data-testid="chart-card-attendanceReliability">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.gildedFern}><Users size={16} /></CardIcon>
      <CardTitle>Attendance Reliability</CardTitle>
      <CardSubtitle>90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {bundle.data.length === 0 ? (
        <EmptyCard label="No attendance data yet" hint="Booked sessions will appear here." />
      ) : (
        <RingWrap>
          <div>
            <RingNumber>{bundle.reliabilityPercent}%</RingNumber>
            <RingLabel>Show-rate</RingLabel>
          </div>
          <StatStack>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.auroraGreen}>
                {bundle.totals.completed}
              </StatPillValue>
              <StatPillLabel>Completed</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.warning}>
                {bundle.totals.skipped}
              </StatPillValue>
              <StatPillLabel>Skipped</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue $color={CHART_COLORS.crimsonFrost}>
                {bundle.totals.cancelled}
              </StatPillValue>
              <StatPillLabel>Cancelled</StatPillLabel>
            </StatPill>
            <StatPill>
              <StatPillValue>{bundle.totals.resolved}</StatPillValue>
              <StatPillLabel>Resolved</StatPillLabel>
            </StatPill>
          </StatStack>
        </RingWrap>
      )}
    </ChartBody>
  </ChartCard>
);

export const WeeklyVolumeCard: React.FC<{
  data: CanonicalProgressCharts['weeklyVolume'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-weeklyVolume">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.wingPurple}><BarChart3 size={16} /></CardIcon>
      <CardTitle>Weekly Training Volume</CardTitle>
      <CardSubtitle>lbs - 12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No logged lifts yet" hint="Sets x reps x weight will populate once workouts are logged." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 52, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryArea
            data={data}
            {...weeklyVolumeAreaProps}
            labels={({ datum }) => `${datum.x}: ${Math.round(datum.y).toLocaleString()} lbs`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

export const SetsRepsTrendCard: React.FC<{
  bundle: CanonicalProgressCharts['setsRepsTrend'];
}> = ({ bundle }) => (
  <ChartCard data-testid="chart-card-setsRepsTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.arcticCyan}><Layers size={16} /></CardIcon>
      <CardTitle>Total Sets &amp; Reps</CardTitle>
      <CardSubtitle>12 weeks</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {bundle.sets.length === 0 ? (
        <EmptyCard label="No sets logged yet" />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 24, bottom: 40, left: 50, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryLegend
            x={50}
            y={0}
            orientation="horizontal"
            gutter={16}
            {...setsRepsLegendProps}
            data={[
              { name: 'Sets', symbol: { fill: CHART_COLORS.arcticCyan } },
              { name: 'Reps', symbol: { fill: CHART_COLORS.gildedFern } },
            ]}
          />
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryGroup offset={8}>
            <VictoryBar
              data={bundle.sets}
              {...setsBarProps}
              labels={({ datum }) => `Sets ${datum.x}: ${datum.y}`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
            <VictoryBar
              data={bundle.reps}
              {...repsBarProps}
              labels={({ datum }) => `Reps ${datum.x}: ${datum.y}`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
          </VictoryGroup>
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

export const DurationTrendCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => (
  <ChartCard data-testid="chart-card-durationTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.iceWing}><Activity size={16} /></CardIcon>
      <CardTitle>Session Duration</CardTitle>
      <CardSubtitle>minutes - 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No duration data yet" hint="Logged sessions with a recorded duration will appear here." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryLine
            data={data}
            {...durationLineProps}
            labels={({ datum }) => `${datum.x}: ${datum.y}min`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);

export const IntensityRpeCard: React.FC<{
  data: CanonicalProgressCharts['intensityRpeTrend'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-intensityRpeTrend">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.wingPurple}><Flame size={16} /></CardIcon>
      <CardTitle>Effort Trend</CardTitle>
      <CardSubtitle>RPE / intensity</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No intensity data yet" hint="Add RPE to sets, or rate the session intensity 1-10." />
      ) : (
        <VictoryChart
          theme={victoryTheme as any}
          height={200}
          padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          domain={{ y: [0, 10] }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryLine
            data={data}
            {...intensityLineProps}
            labels={({ datum }) => `${datum.x}: ${datum.y} (${datum.source})`}
            labelComponent={<VictoryTooltip renderInPortal={false} />}
          />
        </VictoryChart>
      )}
    </ChartBody>
  </ChartCard>
);
