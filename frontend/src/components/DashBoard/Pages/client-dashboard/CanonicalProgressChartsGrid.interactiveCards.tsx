/**
 * COMPONENT: CanonicalProgressChartsGrid.interactiveCards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Interactive Progress Proof cards with range, legend, detail, and CSV controls.
 */

import React, { useMemo, useState } from 'react';
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryGroup,
  VictoryLegend,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryArea,
} from 'victory';
import { BarChart3, Layers } from 'lucide-react';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import ProgressChartActionBar from '../../progress-proof/ProgressChartActionBar';
import {
  PROGRESS_CHART_RANGE_LABELS,
  sliceChartPointsByRange,
  type ProgressChartTimeRange,
} from '../../progress-proof/progressChartActions';
import { CHART_COLORS, victoryTheme } from '../../../Charts/chartTheme';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import {
  repsBarProps,
  setsBarProps,
  setsRepsLegendProps,
  weeklyVolumeAreaProps,
} from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
} from './CanonicalProgressChartsGrid.styles';

type SeriesId = 'sets' | 'reps';

const formatWhole = (value: number) => Math.round(value).toLocaleString();

const summarizeTopPoint = (points: ChartPoint[], unit: string) => {
  if (points.length === 0) return 'No verified chart rows are available for this range.';
  const top = [...points].sort((a, b) => b.y - a.y)[0];
  return `Showing ${points.length} verified points. Highest: ${top.x} at ${formatWhole(top.y)} ${unit}.`;
};

export const WeeklyVolumeCard: React.FC<{
  data: CanonicalProgressCharts['weeklyVolume'];
}> = ({ data }) => {
  const [range, setRange] = useState<ProgressChartTimeRange>('quarter');
  const visibleData = useMemo(() => sliceChartPointsByRange(data, range), [data, range]);
  const summary = summarizeTopPoint(visibleData, 'lbs');
  const rows = visibleData.map((row) => ({
    id: row.x,
    label: row.x,
    value: `${formatWhole(row.y)} lbs`,
    detail: `${row.workouts ?? 0} logged workout${row.workouts === 1 ? '' : 's'} in this point.`,
  }));

  return (
    <ChartCard data-testid="chart-card-weeklyVolume">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.wingPurple}><BarChart3 size={16} /></CardIcon>
        <CardTitle>Weekly Training Volume</CardTitle>
        <CardSubtitle>{PROGRESS_CHART_RANGE_LABELS[range]}</CardSubtitle>
      </CardHeader>
      <ProgressChartActionBar
        chartId="weekly-volume"
        csvRows={visibleData.map((row) => ({
          week: row.x,
          volume_lbs: Math.round(row.y),
          workouts: row.workouts,
        }))}
        drilldownRows={rows}
        filename="swan-weekly-volume.csv"
        range={range}
        summary={summary}
        onRangeChange={setRange}
      />
      <ChartBody data-chart-export="weekly-volume">
        {visibleData.length === 0 ? (
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
              data={visibleData}
              {...weeklyVolumeAreaProps}
              labels={({ datum }) => `${datum.x}: ${formatWhole(datum.y)} lbs`}
              labelComponent={<VictoryTooltip renderInPortal={false} />}
            />
          </VictoryChart>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const SetsRepsTrendCard: React.FC<{
  bundle: CanonicalProgressCharts['setsRepsTrend'];
}> = ({ bundle }) => {
  const [range, setRange] = useState<ProgressChartTimeRange>('quarter');
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesId, boolean>>({ sets: true, reps: true });
  const visibleSets = useMemo(() => sliceChartPointsByRange(bundle.sets, range), [bundle.sets, range]);
  const visibleReps = useMemo(() => sliceChartPointsByRange(bundle.reps, range), [bundle.reps, range]);
  const hasVisibleSeries = visibleSeries.sets || visibleSeries.reps;
  const hasData = visibleSets.length > 0 || visibleReps.length > 0;

  const csvRows = useMemo(() => {
    const byPoint = new Map<string, { point: string; sets?: number; reps?: number }>();
    visibleSets.forEach((row) => byPoint.set(row.x, { ...(byPoint.get(row.x) || { point: row.x }), sets: row.y }));
    visibleReps.forEach((row) => byPoint.set(row.x, { ...(byPoint.get(row.x) || { point: row.x }), reps: row.y }));
    return Array.from(byPoint.values());
  }, [visibleReps, visibleSets]);

  const toggleSeries = (id: string) => {
    if (id !== 'sets' && id !== 'reps') return;
    setVisibleSeries((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <ChartCard data-testid="chart-card-setsRepsTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.arcticCyan}><Layers size={16} /></CardIcon>
        <CardTitle>Total Sets &amp; Reps</CardTitle>
        <CardSubtitle>{PROGRESS_CHART_RANGE_LABELS[range]}</CardSubtitle>
      </CardHeader>
      <ProgressChartActionBar
        chartId="sets-reps-trend"
        csvRows={csvRows}
        drilldownRows={csvRows.map((row) => ({
          id: row.point,
          label: row.point,
          value: `${row.sets ?? 0} sets / ${row.reps ?? 0} reps`,
        }))}
        filename="swan-sets-reps-trend.csv"
        range={range}
        summary={hasData ? 'Toggle sets and reps to isolate the work signal behind this trend.' : 'No verified set or rep rows are available yet.'}
        legendItems={[
          { id: 'sets', label: 'Sets', color: CHART_COLORS.arcticCyan, active: visibleSeries.sets },
          { id: 'reps', label: 'Reps', color: CHART_COLORS.gildedFern, active: visibleSeries.reps },
        ]}
        onRangeChange={setRange}
        onToggleLegend={toggleSeries}
      />
      <ChartBody data-chart-export="sets-reps-trend">
        {!hasData ? (
          <EmptyCard label="No sets or reps logged yet" />
        ) : !hasVisibleSeries ? (
          <EmptyCard label="All series hidden" hint="Turn Sets or Reps back on to view the chart." />
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
                visibleSeries.sets && { name: 'Sets', symbol: { fill: CHART_COLORS.arcticCyan } },
                visibleSeries.reps && { name: 'Reps', symbol: { fill: CHART_COLORS.gildedFern } },
              ].filter(Boolean) as any}
            />
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            <VictoryGroup offset={8}>
              {visibleSeries.sets && (
                <VictoryBar
                  data={visibleSets}
                  {...setsBarProps}
                  labels={({ datum }) => `Sets ${datum.x}: ${datum.y}`}
                  labelComponent={<VictoryTooltip renderInPortal={false} />}
                />
              )}
              {visibleSeries.reps && (
                <VictoryBar
                  data={visibleReps}
                  {...repsBarProps}
                  labels={({ datum }) => `Reps ${datum.x}: ${datum.y}`}
                  labelComponent={<VictoryTooltip renderInPortal={false} />}
                />
              )}
            </VictoryGroup>
          </VictoryChart>
        )}
      </ChartBody>
    </ChartCard>
  );
};
