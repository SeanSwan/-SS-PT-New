/**
 * CanonicalProgressChartsGrid.balanceCards.tsx — Anchor Lifts + Movement Pattern
 * ================================================================================
 * The two Victory-rendered detail cards, extracted from detailCards during the
 * Phase-4b drill-down sweep (Rule 4 cap) and wired to the expand modal.
 * Re-exported from detailCards so consumers are untouched.
 */
import React, { useMemo } from 'react';
import {
  VictoryAxis,
  VictoryChart,
  VictoryLegend,
  VictoryLine,
  VictoryPie,
  VictoryVoronoiContainer,
} from 'victory';
import { Target, TrendingUp } from 'lucide-react';
import { type CanonicalProgressCharts } from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, FULL_PALETTE, victoryTheme } from '../../../Charts/chartTheme';
import { buildAnchorFacts, buildCategoryFacts } from '../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../progress-proof/ProgressChartInsightBar';
import ChartExpandTrigger from '../../progress-proof/ChartExpandTrigger';
import { buildAnchorLiftRows, buildNamedValueRows } from './CanonicalProgressChartsGrid.expandRows';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import { anchorLegendProps, lineStyleProps, movementPieProps } from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
} from './CanonicalProgressChartsGrid.styles';

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

  const renderAnchorChart = (width?: number, height = 200) => (
    <VictoryChart
      theme={victoryTheme as any}
      height={height}
      {...(width ? { width } : {})}
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
        <VictoryLine key={s.name} data={s.data} {...lineStyleProps(s.color)} />
      ))}
    </VictoryChart>
  );

  return (
    <ChartCard data-testid="chart-card-anchorLifts">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><TrendingUp size={16} /></CardIcon>
        <CardTitle>Anchor Lift Progression</CardTitle>
        <CardSubtitle>top 3 - 90 days</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Anchor Lift Progression"
          subtitle="Heaviest set per day — top 3 lifts, 90 days"
          renderChart={renderAnchorChart}
          rows={buildAnchorLiftRows(series.map((s) => ({ exerciseName: s.name, points: s.data })))}
          facts={buildAnchorFacts(bundle)}
        />
      </CardHeader>
      <ChartBody>
        {series.length === 0 ? (
          <EmptyCard label="No anchor lifts yet" hint="Repeat 2-3 main lifts across sessions to surface progression." />
        ) : (
          <>
            <ProgressChartInsightBar facts={buildAnchorFacts(bundle)} />
            {renderAnchorChart()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const MovementPatternBalanceCard: React.FC<{
  data: CanonicalProgressCharts['movementPatternBalance'];
}> = ({ data }) => {
  // The pie sizes each wedge by VOLUME. Bodyweight-only patterns (sets>0,
  // volume=0) are KEPT in `data` so the drill-down table + facts still count
  // them (that's the data-truth fix), but a zero-value VictoryPie datum draws a
  // zero-angle wedge whose label collides with its neighbour — so the wedge
  // render itself skips zero-volume rows. (A sets-based balance metric that
  // shows bodyweight work as a real wedge is the recommended follow-up.)
  const pieData = data.filter((r) => r.y > 0).map((r) => ({ x: r.x, y: r.y }));
  const renderPie = (width?: number, height = 200) => (
    <VictoryPie
      data={pieData}
      colorScale={FULL_PALETTE}
      innerRadius={40}
      padAngle={2}
      height={height}
      {...(width ? { width } : {})}
      {...movementPieProps}
      labels={({ datum }) => `${datum.x}`}
    />
  );
  return (
    <ChartCard data-testid="chart-card-movementPatternBalance">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><Target size={16} /></CardIcon>
        <CardTitle>Movement Pattern Balance</CardTitle>
        <CardSubtitle>volume - 90 days</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Movement Pattern Balance"
          subtitle="Training volume by movement pattern, 90 days"
          renderChart={renderPie}
          rows={buildNamedValueRows(data, 'lbs')}
          facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'patterns' })}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No movement data yet" hint="Squat, hinge, push, pull, carry, core logged over 90 days." />
        ) : (
          <>
            <ProgressChartInsightBar
              facts={buildCategoryFacts(data, { unit: 'lbs', itemLabel: 'patterns' })}
            />
            {renderPie()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};
