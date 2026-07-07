/**
 * COMPONENT: CanonicalProgressChartsGrid.bodyCards
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Charter v3 4c cards — weight trend, body-fat trend, and the
 *          est-1RM (Brzycki) trend for the client's most-logged lift.
 *          Body-composition cards deliberately carry NO feed-share opt-in
 *          (sensitive by design, Rule 62); the strength estimate does.
 */

import React from 'react';
import { Award, Percent, Scale } from 'lucide-react';
import { VictoryAxis, VictoryChart, VictoryLine } from 'victory';
import {
  type CanonicalProgressCharts,
  type ChartPoint,
} from '../../../../hooks/analytics/useClientProgressCharts';
import { CHART_COLORS, victoryTheme } from '../../../Charts/chartTheme';
import { buildSeriesFacts } from '../../progress-proof/progressChartFacts';
import ProgressChartInsightBar from '../../progress-proof/ProgressChartInsightBar';
import ChartExpandTrigger from '../../progress-proof/ChartExpandTrigger';
import { buildUnitSeriesRows } from './CanonicalProgressChartsGrid.expandRows';
import { EmptyCard } from './CanonicalProgressChartsGrid.primitives';
import { lineStyleProps } from './CanonicalProgressChartsGrid.victoryProps';
import {
  CardHeader,
  CardIcon,
  CardSubtitle,
  CardTitle,
  ChartBody,
  ChartCard,
} from './CanonicalProgressChartsGrid.styles';

const linePadding = { top: 16, bottom: 40, left: 44, right: 12 };

const renderLine = (data: ChartPoint[], color: string) =>
  (width?: number, height = 200) => (
    <VictoryChart
      theme={victoryTheme as any}
      height={height}
      {...(width ? { width } : {})}
      padding={linePadding}
    >
      <VictoryAxis />
      <VictoryAxis dependentAxis />
      <VictoryLine data={data} {...lineStyleProps(color)} />
    </VictoryChart>
  );

export const WeightTrendCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
  const facts = buildSeriesFacts(data, { unit: 'lbs', pointsLabel: 'entries', decimals: 1 });
  const renderChart = renderLine(data, CHART_COLORS.iceWing);
  return (
    <ChartCard data-testid="chart-card-weightTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.iceWing}><Scale size={16} /></CardIcon>
        <CardTitle>Weight Trend</CardTitle>
        <CardSubtitle>logged measurements</CardSubtitle>
        <ChartExpandTrigger
          title="Weight Trend"
          subtitle="Body weight from logged measurements"
          renderChart={renderChart}
          rows={buildUnitSeriesRows(data, 'lbs', 1)}
          facts={facts}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No weight entries yet" hint="Logged body measurements chart themselves here." />
        ) : (
          <>
            <ProgressChartInsightBar facts={facts} />
            {renderChart()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const BodyFatTrendCard: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
  const facts = buildSeriesFacts(data, { unit: '%', pointsLabel: 'entries', decimals: 1 });
  const renderChart = renderLine(data, CHART_COLORS.wingPurple);
  return (
    <ChartCard data-testid="chart-card-bodyFatTrend">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.wingPurple}><Percent size={16} /></CardIcon>
        <CardTitle>Body Fat Trend</CardTitle>
        <CardSubtitle>logged measurements</CardSubtitle>
        <ChartExpandTrigger
          title="Body Fat Trend"
          subtitle="Body-fat percentage from logged measurements"
          renderChart={renderChart}
          rows={buildUnitSeriesRows(data, '%', 1)}
          facts={facts}
        />
      </CardHeader>
      <ChartBody>
        {data.length === 0 ? (
          <EmptyCard label="No body-fat entries yet" hint="Measurements with body-fat percentage appear here." />
        ) : (
          <>
            <ProgressChartInsightBar facts={facts} />
            {renderChart()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};

export const EstOneRmTrendCard: React.FC<{
  bundle: CanonicalProgressCharts['estOneRm'];
}> = ({ bundle }) => {
  const facts = buildSeriesFacts(bundle.data, { unit: 'lbs', pointsLabel: 'wks' });
  const renderChart = renderLine(bundle.data, CHART_COLORS.gildedFern);
  const subtitle = bundle.exercise
    ? `Weekly best estimate - ${bundle.exercise}`
    : 'Weekly best estimate for your top lift';
  return (
    <ChartCard data-testid="chart-card-estOneRm">
      <CardHeader>
        <CardIcon $color={CHART_COLORS.gildedFern}><Award size={16} /></CardIcon>
        <CardTitle>Est. 1RM Trend</CardTitle>
        <CardSubtitle>{bundle.exercise ?? 'top lift'} - 180 days</CardSubtitle>
        <ChartExpandTrigger
          canShareToFeed
          title="Est. 1RM Trend"
          subtitle={subtitle}
          renderChart={renderChart}
          rows={buildUnitSeriesRows(bundle.data, 'lbs')}
          facts={facts}
        />
      </CardHeader>
      <ChartBody>
        {bundle.data.length === 0 ? (
          <EmptyCard
            label="No strength estimate yet"
            hint="Log weighted sets (1-15 reps) and your top lift's estimated 1RM charts here."
          />
        ) : (
          <>
            <ProgressChartInsightBar facts={facts} />
            {renderChart()}
          </>
        )}
      </ChartBody>
    </ChartCard>
  );
};
