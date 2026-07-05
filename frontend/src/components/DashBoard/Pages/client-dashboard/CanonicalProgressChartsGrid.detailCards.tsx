/**
 * COMPONENT: CanonicalProgressChartsGrid.detailCards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Detail and balance chart cards for the canonical progress grid.
 */

import React, { useMemo } from 'react';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { BarChart3, Dumbbell, HeartPulse, Target, TrendingUp, Trophy } from 'lucide-react';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, FULL_PALETTE, victoryTheme } from '../../../Charts/chartTheme';
import { buildAnchorFacts, buildCategoryFacts, buildPrFacts, buildRecoveryFacts } from '../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../progress-proof/ProgressChartInsightBar';
import { EmptyCard, useNumericBarWidth } from './CanonicalProgressChartsGrid.primitives';
import {
  anchorLegendProps,
  lineStyleProps,
  movementPieProps,
} from './CanonicalProgressChartsGrid.victoryProps';
import {
  BarFill,
  BarLabel,
  BarList,
  BarRow,
  BarTrack,
  BarValue,
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
  RecoveryAlertIcon,
} from './CanonicalProgressChartsGrid.styles';

export const PRTimelineCard: React.FC<{
  data: CanonicalProgressCharts['prTimeline'];
}> = ({ data }) => {
  const bestByExercise = useMemo(() => {
    const map = new Map<string, typeof data[number]>();
    for (const row of data) {
      const cur = map.get(row.exercise);
      if (!cur || row.y > cur.y) map.set(row.exercise, row);
    }
    return Array.from(map.values())
      .sort((a, b) => b.y - a.y)
      .slice(0, 6);
  }, [data]);
  const fills = useNumericBarWidth(bestByExercise.map((r) => ({ x: r.exercise, y: r.y })));

  return (
    <ChartCard data-testid="chart-card-prTimeline">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><Trophy size={16} /></CardIcon>
        <CardTitle>PR Highlights</CardTitle>
        <CardSubtitle>180 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {bestByExercise.length === 0 ? (
          <EmptyCard label="No PRs recorded yet" hint="Log lifts with weight to see PRs surface here." />
        ) : (
          <>
          <ProgressChartInsightBar facts={buildPrFacts(data)} />
          <BarList>
            {bestByExercise.map((row, i) => (
              <BarRow key={row.exercise}>
                <BarLabel title={row.exercise}>{row.exercise}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
                </BarTrack>
                <BarValue>{row.y} lbs x {row.reps}</BarValue>
              </BarRow>
            ))}
          </BarList>
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const AnchorLiftsCard: React.FC<{
  bundle: CanonicalProgressCharts['anchorLifts'];
}> = ({ bundle }) => {
  const series = useMemo(() => {
    return bundle.exercises.map((name, i) => ({
      name,
      color: FULL_PALETTE[i % FULL_PALETTE.length],
      data: (bundle.data[name] || []).map((p) => ({ x: p.x, y: p.y, name })),
    })).filter((s) => s.data.length > 0);
  }, [bundle]);

  return (
    <ChartCard data-testid="chart-card-anchorLifts">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><TrendingUp size={16} /></CardIcon>
        <CardTitle>Anchor Lift Progression</CardTitle>
        <CardSubtitle>top 3 - 90 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {series.length === 0 ? (
          <EmptyCard label="No anchor lifts yet" hint="Repeat 2-3 main lifts across sessions to surface progression." />
        ) : (
          <>
          <ProgressChartInsightBar facts={buildAnchorFacts(bundle)} />
          <VictoryChart
            theme={victoryTheme as any}
            height={200}
            padding={{ top: 24, bottom: 40, left: 44, right: 12 }}
            containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
          >
            <VictoryLegend
              x={44}
              y={0}
              orientation="horizontal"
              gutter={10}
              {...anchorLegendProps}
              data={series.map((s) => ({ name: s.name, symbol: { fill: s.color } }))}
            />
            <VictoryAxis />
            <VictoryAxis dependentAxis />
            {series.map((s) => (
              <VictoryLine
                key={s.name}
                data={s.data}
                {...lineStyleProps(s.color)}
              />
            ))}
          </VictoryChart>
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const ExerciseFrequencyCard: React.FC<{
  data: CanonicalProgressCharts['exerciseFrequency'];
}> = ({ data }) => {
  const fills = useNumericBarWidth(data as ChartPoint[]);
  return (
    <ChartCard data-testid="chart-card-exerciseFrequency">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.arcticCyan}><Dumbbell size={16} /></CardIcon>
        <CardTitle>Exercise Frequency</CardTitle>
        <CardSubtitle>top 8 - all time</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No exercises logged yet" hint="Every logged exercise builds this ranking." />
        ) : (
          <>
          <ProgressChartInsightBar
            facts={buildCategoryFacts(data, { unit: 'logs', itemLabel: 'exercises' })}
          />
          <BarList>
            {data.slice(0, 8).map((row, i) => (
              <BarRow key={row.x}>
                <BarLabel title={row.x}>{row.x}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.arcticCyan} />
                </BarTrack>
                <BarValue>{row.y} x {row.sets} sets</BarValue>
              </BarRow>
            ))}
          </BarList>
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const MovementPatternBalanceCard: React.FC<{
  data: CanonicalProgressCharts['movementPatternBalance'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-movementPatternBalance">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.iceWing}><Target size={16} /></CardIcon>
      <CardTitle>Movement Pattern Balance</CardTitle>
      <CardSubtitle>volume - 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard label="No movement data yet" hint="Squat, hinge, push, pull, carry, core logged over 90 days." />
      ) : (
        <>
        <ProgressChartInsightBar
          facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'patterns' })}
        />
        <VictoryPie
          data={data.map((r) => ({ x: r.x, y: r.y }))}
          colorScale={FULL_PALETTE}
          innerRadius={40}
          padAngle={2}
          height={200}
          {...movementPieProps}
          labels={({ datum }) => `${datum.x}`}
        />
        </>
      )}
    </ChartBody>
  </ChartCard>
);

export const MuscleGroupBalanceCard: React.FC<{
  data: CanonicalProgressCharts['muscleGroupBalance'];
}> = ({ data }) => {
  const fills = useNumericBarWidth(data as ChartPoint[]);
  return (
    <ChartCard data-testid="chart-card-muscleGroupBalance">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><BarChart3 size={16} /></CardIcon>
        <CardTitle>Muscle Group Volume</CardTitle>
        <CardSubtitle>lbs - 90 days</CardSubtitle>
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No muscle-group data yet" hint="Volume by muscle group builds as lifts are logged." />
        ) : (
          <>
          <ProgressChartInsightBar
            facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'groups' })}
          />
          <BarList>
            {data.map((row, i) => (
              <BarRow key={row.x}>
                <BarLabel>{row.x}</BarLabel>
                <BarTrack>
                  <BarFill $pct={fills[i] ?? 0} $color={CHART_COLORS.gildedFern} />
                </BarTrack>
                <BarValue>{Math.round(row.y).toLocaleString()}</BarValue>
              </BarRow>
            ))}
          </BarList>
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const RecoverySignalCard: React.FC<{
  data: CanonicalProgressCharts['recoverySignal'];
}> = ({ data }) => (
  <ChartCard data-testid="chart-card-recoverySignal">
    <CardHeader>
      <CardIcon $color={CHART_COLORS.crimsonFrost}><HeartPulse size={16} /></CardIcon>
      <CardTitle>Recovery Signals</CardTitle>
      <CardSubtitle>pain + RPE 9+ - 90 days</CardSubtitle>
    </CardHeader>
    <ChartBody>
      {data.length === 0 ? (
        <EmptyCard
          label="No recovery flags"
          hint="No pain notes or redline sets. Keep it up."
        />
      ) : (
        <>
        <ProgressChartInsightBar facts={buildRecoveryFacts(data)} />
        <BarList>
          {data.slice(0, 6).map((row) => (
            <BarRow key={row.x}>
              <BarLabel title={row.x}>
                <RecoveryAlertIcon size={11} />
                {row.x}
              </BarLabel>
              <BarTrack>
                <BarFill
                  $pct={Math.min((row.y / Math.max(row.totalSets, 1)) * 100, 100)}
                  $color={CHART_COLORS.crimsonFrost}
                />
              </BarTrack>
              <BarValue>
                {row.painFlags > 0 ? `${row.painFlags} pain` : ''}
                {row.painFlags > 0 && row.highRpeFlags > 0 ? ' - ' : ''}
                {row.highRpeFlags > 0 ? `${row.highRpeFlags} redline` : ''}
              </BarValue>
            </BarRow>
          ))}
        </BarList>
        </>
      )}
    </ChartBody>
  </ChartCard>
);
