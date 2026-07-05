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
import ChartWeekDrillTrigger from './ChartWeekDrillTrigger';
import {
  buildProgressChartPulse,
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
type SetsRepsCsvRow = { point: string; sets?: number; reps?: number };

const formatWhole = (value: number) => Math.round(value).toLocaleString();

const summarizeTopPoint = (points: ChartPoint[], unit: string) => {
  if (points.length === 0) return 'No verified chart rows are available for this range.';
  const top = [...points].sort((a, b) => b.y - a.y)[0];
  return `Showing ${points.length} verified points. Highest: ${top.x} at ${formatWhole(top.y)} ${unit}.`;
};

const buildSetsRepsRows = (sets: ChartPoint[], reps: ChartPoint[]): SetsRepsCsvRow[] => {
  const byPoint = new Map<string, SetsRepsCsvRow>();
  sets.forEach((row) => byPoint.set(row.x, { ...(byPoint.get(row.x) || { point: row.x }), sets: row.y }));
  reps.forEach((row) => byPoint.set(row.x, { ...(byPoint.get(row.x) || { point: row.x }), reps: row.y }));
  return Array.from(byPoint.values());
};

const selectSetsRepsPulseSource = (sets: ChartPoint[], reps: ChartPoint[]) => (
  reps.length > 0
    ? { label: 'Rep Pulse', points: reps, unit: 'reps' }
    : { label: 'Set Pulse', points: sets, unit: 'sets' }
);

const buildSetsRepsDrilldownRows = (rows: SetsRepsCsvRow[]) => rows.map((row) => ({
  id: row.point,
  label: row.point,
  value: `${row.sets ?? 0} sets / ${row.reps ?? 0} reps`,
}));

const buildSetsRepsLegendItems = (visibleSeries: Record<SeriesId, boolean>) => [
  { id: 'sets', label: 'Sets', color: CHART_COLORS.arcticCyan, active: visibleSeries.sets },
  { id: 'reps', label: 'Reps', color: CHART_COLORS.gildedFern, active: visibleSeries.reps },
];

const buildVictoryLegendData = (visibleSeries: Record<SeriesId, boolean>) => (
  [
    { enabled: visibleSeries.sets, name: 'Sets', symbol: { fill: CHART_COLORS.arcticCyan } },
    { enabled: visibleSeries.reps, name: 'Reps', symbol: { fill: CHART_COLORS.gildedFern } },
  ]
    .filter((item) => item.enabled)
    .map(({ name, symbol }) => ({ name, symbol }))
);

const visibleChartPoints = (enabled: boolean, points: ChartPoint[]) => (
  enabled ? points : []
);

const isSeriesId = (id: string): id is SeriesId => id === 'sets' || id === 'reps';

const buildSetsRepsSummary = (hasData: boolean) => (
  hasData
    ? 'Toggle sets and reps to isolate the work signal behind this trend.'
    : 'No verified set or rep rows are available yet.'
);

const visiblePulse = (
  hasVisibleSeries: boolean,
  pulse: ReturnType<typeof buildProgressChartPulse>,
) => (
  hasVisibleSeries ? pulse : undefined
);

const hasAnyVisibleSeries = (visibleSeries: Record<SeriesId, boolean>) => (
  Boolean(visibleSeries.sets || visibleSeries.reps)
);

const hasAnySetsRepsData = (sets: ChartPoint[], reps: ChartPoint[]) => (
  Boolean(sets.length || reps.length)
);

const toggleVisibleSeries = (
  setVisibleSeries: React.Dispatch<React.SetStateAction<Record<SeriesId, boolean>>>,
  id: string,
) => {
  if (!isSeriesId(id)) return;
  setVisibleSeries((current) => ({ ...current, [id]: !current[id] }));
};

const SetsRepsChartBody: React.FC<{
  hasData: boolean;
  hasVisibleSeries: boolean;
  visibleReps: ChartPoint[];
  visibleSeries: Record<SeriesId, boolean>;
  visibleSets: ChartPoint[];
}> = ({ hasData, hasVisibleSeries, visibleReps, visibleSeries, visibleSets }) => {
  if (!hasData) return <EmptyCard label="No sets or reps logged yet" />;
  if (!hasVisibleSeries) return <EmptyCard label="All series hidden" hint="Turn Sets or Reps back on to view the chart." />;

  const setsData = visibleChartPoints(visibleSeries.sets, visibleSets);
  const repsData = visibleChartPoints(visibleSeries.reps, visibleReps);

  return (
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
        data={buildVictoryLegendData(visibleSeries)}
      />
      <VictoryAxis />
      <VictoryAxis dependentAxis />
      <VictoryGroup offset={8}>
        <VictoryBar
          data={setsData}
          {...setsBarProps}
          labels={({ datum }) => `Sets ${datum.x}: ${datum.y}`}
          labelComponent={<VictoryTooltip renderInPortal={false} />}
        />
        <VictoryBar
          data={repsData}
          {...repsBarProps}
          labels={({ datum }) => `Reps ${datum.x}: ${datum.y}`}
          labelComponent={<VictoryTooltip renderInPortal={false} />}
        />
      </VictoryGroup>
    </VictoryChart>
  );
};

export const WeeklyVolumeCard: React.FC<{
  data: CanonicalProgressCharts['weeklyVolume'];
}> = ({ data }) => {
  const [range, setRange] = useState<ProgressChartTimeRange>('quarter');
  const visibleData = useMemo(() => sliceChartPointsByRange(data, range), [data, range]);
  const pulse = useMemo(() => buildProgressChartPulse(visibleData, {
    label: 'Volume Pulse',
    unit: 'lbs',
  }), [visibleData]);
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
        chartTitle="Weekly Training Volume"
        csvRows={visibleData.map((row) => ({
          week: row.x,
          volume_lbs: Math.round(row.y),
          workouts: row.workouts,
        }))}
        drilldownRows={rows}
        filename="swan-weekly-volume.csv"
        pulse={pulse}
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
      {/* Slice 9: set-level week drill-down (button path — the area chart has
          no visible point targets and voronoi owns its pointer events). */}
      <ChartWeekDrillTrigger
        latestWeekLabel={visibleData.length > 0 ? String(visibleData[visibleData.length - 1].x) : null}
      />
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
  const pulseSets = visibleSeries.sets ? visibleSets : [];
  const pulseReps = visibleSeries.reps ? visibleReps : [];
  const pulse = useMemo(() => {
    const source = selectSetsRepsPulseSource(pulseSets, pulseReps);
    return buildProgressChartPulse(source.points, { label: source.label, unit: source.unit });
  }, [pulseReps, pulseSets]);
  const hasVisibleSeries = hasAnyVisibleSeries(visibleSeries);
  const hasData = hasAnySetsRepsData(visibleSets, visibleReps);
  const csvRows = useMemo(() => buildSetsRepsRows(visibleSets, visibleReps), [visibleReps, visibleSets]);
  const summary = buildSetsRepsSummary(hasData);

  const toggleSeries = (id: string) => toggleVisibleSeries(setVisibleSeries, id);

  return (
    <ChartCard data-testid="chart-card-setsRepsTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.arcticCyan}><Layers size={16} /></CardIcon>
        <CardTitle>Total Sets &amp; Reps</CardTitle>
        <CardSubtitle>{PROGRESS_CHART_RANGE_LABELS[range]}</CardSubtitle>
      </CardHeader>
      <ProgressChartActionBar
        chartId="sets-reps-trend"
        chartTitle="Total Sets & Reps"
        csvRows={csvRows}
        drilldownRows={buildSetsRepsDrilldownRows(csvRows)}
        filename="swan-sets-reps-trend.csv"
        pulse={visiblePulse(hasVisibleSeries, pulse)}
        range={range}
        summary={summary}
        legendItems={buildSetsRepsLegendItems(visibleSeries)}
        onRangeChange={setRange}
        onToggleLegend={toggleSeries}
      />
      <ChartBody data-chart-export="sets-reps-trend">
        <SetsRepsChartBody
          hasData={hasData}
          hasVisibleSeries={hasVisibleSeries}
          visibleReps={visibleReps}
          visibleSeries={visibleSeries}
          visibleSets={visibleSets}
        />
      </ChartBody>
    </ChartCard>
  );
};
