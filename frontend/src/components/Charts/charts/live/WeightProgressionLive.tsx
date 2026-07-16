/**
 * ┌─── SUB-COMPONENT: WeightProgressionLive ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory line chart — body weight over time           │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with weight value             │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE, sanitizeChartData } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface Props { userId: number | string; }

const WeightProgressionLive: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-weight-progression');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Weight Progression" tabIndex={0}>
      <ChartHeader><ChartTitle>Weight Progression</ChartTitle><ChartSubtitle>No measurements recorded yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Weight Progression" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Weight Progression</ChartTitle>
        <ChartSubtitle>Body weight over time</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t} lbs`} />
          <VictoryArea
            data={sanitizeChartData(data.data)}
            {...victoryStyleProps({ data: { fill: hexAlpha(CHART_COLORS.iceWing, 0.15), stroke: 'none' } })}
            interpolation="natural"
          />
          <VictoryLine
            data={sanitizeChartData(data.data)}
            {...victoryStyleProps({ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2.5 } })}
            interpolation="natural"
            labels={({ datum }: any) => `${datum.y} lbs`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(WeightProgressionLive);
