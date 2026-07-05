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
  VictoryLine,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import WorkoutDayDrilldown from './WorkoutDayDrilldown';
import ChartWeekDrillTrigger from './ChartWeekDrillTrigger';
import { Activity, Calendar, Flame, Users } from 'lucide-react';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, victoryTheme } from '../../../Charts/chartTheme';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import {
  durationLineProps,
  durationScatterProps,
  intensityLineProps,
  workoutFrequencyBarProps,
} from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
  DrillTriggerButton,
  DrillTriggerRow,
  RingLabel,
  RingNumber,
  RingWrap,
  StatPill,
  StatPillLabel,
  StatPillValue,
  StatStack,
} from './CanonicalProgressChartsGrid.styles';

export const WorkoutFrequencyCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
  // Slice 9: tap a week bar (or the button) to open that training week.
  const [tappedWeek, setTappedWeek] = React.useState<string | null>(null);
  const latestWeek = data.length > 0 ? String(data[data.length - 1].x) : null;

  return (
    <ChartCard data-testid="chart-card-workoutFrequency">
      <CardHeader>
        <CardIcon><Calendar size={16} /></CardIcon>
        <CardTitle>Workout Frequency</CardTitle>
        <CardSubtitle>12 weeks - tap a bar</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No completed workouts yet" hint="Log your first session to start the streak." />
        ) : (
          <VictoryChart
            theme={victoryTheme as any}
            height={200}
            padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
          >
            <VictoryAxis tickFormat={(t) => String(t)} />
            <VictoryAxis dependentAxis />
            <VictoryBar
              data={data}
              {...workoutFrequencyBarProps}
              labels={({ datum }) => `${datum.x}: ${datum.y}`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
              cornerRadius={{ top: 3 }}
              events={[{
                target: 'data',
                eventHandlers: {
                  onClick: (_event, props) => {
                    setTappedWeek(String((props as { datum: ChartPoint }).datum.x));
                    return [];
                  },
                },
              }]}
            />
          </VictoryChart>
        )}
      </ChartBody>
      <ChartWeekDrillTrigger
        latestWeekLabel={latestWeek}
        openLabel={tappedWeek}
        onDialogClose={() => setTappedWeek(null)}
      />
    </ChartCard>
  );
};

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

export const DurationTrendCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
  // Slice 8.4: tap a session point (or the always-visible button — the
  // keyboard/touch-reliable path) to open the exact workout behind it.
  const [drillMd, setDrillMd] = React.useState<string | null>(null);
  const latest = data.length > 0 ? String(data[data.length - 1].x) : null;

  return (
    <ChartCard data-testid="chart-card-durationTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><Activity size={16} /></CardIcon>
        <CardTitle>Session Duration</CardTitle>
        <CardSubtitle>minutes - 90 days - tap a point</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No duration data yet" hint="Logged sessions with a recorded duration will appear here." />
        ) : (
          <>
            <VictoryChart
              theme={victoryTheme as any}
              height={200}
              padding={{ top: 16, bottom: 40, left: 40, right: 12 }}
            >
              <VictoryAxis />
              <VictoryAxis dependentAxis />
              <VictoryLine data={data} {...durationLineProps} />
              <VictoryScatter
                data={data}
                {...durationScatterProps}
                labels={({ datum }) => `${datum.x}: ${datum.y}min`}
                labelComponent={<VictoryTooltip renderInPortal={false} />}
                events={[{
                  target: 'data',
                  eventHandlers: {
                    onClick: (_event, props) => {
                      setDrillMd(String((props as { datum: ChartPoint }).datum.x));
                      return [];
                    },
                  },
                }]}
              />
            </VictoryChart>
            {latest && (
              <DrillTriggerRow>
                <DrillTriggerButton
                  type="button"
                  onClick={() => setDrillMd(latest)}
                  aria-label={`View workout for ${latest}`}
                >
                  View workout - {latest}
                </DrillTriggerButton>
              </DrillTriggerRow>
            )}
          </>
        )}
      </ChartBody>
      {drillMd && <WorkoutDayDrilldown md={drillMd} onClose={() => setDrillMd(null)} />}
    </ChartCard>
  );
};

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
