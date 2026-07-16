/**
 * ┌─── SUB-COMPONENT: BodyFatTrendLine ─────────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory line chart — body fat % over time            │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with BF%                      │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryScatter, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE, sanitizeChartData } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface Props { userId: number | string; }

const BodyFatTrendLine: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-body-fat-trend');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Body Fat Trend" tabIndex={0}>
      <ChartHeader><ChartTitle>Body Fat Trend</ChartTitle><ChartSubtitle>No body fat measurements yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Body Fat Trend" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Body Fat Trend</ChartTitle>
        <ChartSubtitle>Body fat % over time</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}%`} />
          <VictoryArea
            data={sanitizeChartData(data.data)}
            {...victoryStyleProps({ data: { fill: hexAlpha(CHART_COLORS.gildedFern, 0.15), stroke: 'none' } })}
            interpolation="natural"
          />
          <VictoryLine
            data={sanitizeChartData(data.data)}
            {...victoryStyleProps({ data: { stroke: CHART_COLORS.gildedFern, strokeWidth: 2.5 } })}
            interpolation="natural"
          />
          <VictoryScatter
            data={sanitizeChartData(data.data)}
            size={4}
            {...victoryStyleProps({ data: { fill: CHART_COLORS.gildedFern, stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 } })}
            labels={({ datum }: any) => `${datum.y}%`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(BodyFatTrendLine);
