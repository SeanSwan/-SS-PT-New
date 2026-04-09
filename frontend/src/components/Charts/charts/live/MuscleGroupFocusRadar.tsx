/**
 * ┌─── SUB-COMPONENT: MuscleGroupFocusRadar ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory polar/radar — volume by muscle group (90d)   │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with muscle + score           │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis, VictoryTooltip } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE, sanitizeChartData } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

const MuscleGroupFocusRadar: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-muscle-group-focus');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Muscle Group Focus" tabIndex={0}>
      <ChartHeader><ChartTitle>Muscle Group Focus</ChartTitle><ChartSubtitle>No data yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Muscle Group Focus" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Muscle Group Focus</ChartTitle>
        <ChartSubtitle>Volume distribution — last 90 days</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart polar theme={victoryTheme} animate={VICTORY_ANIMATE}
          domain={{ y: [0, 100] }}>
          <VictoryPolarAxis
            tickValues={data.data.map(d => d.x)}
            style={{
              tickLabels: { fill: CHART_COLORS.frostWhite, fontSize: 10, fontFamily: "'Sora', sans-serif" },
              grid: { stroke: CHART_COLORS.gridLine, strokeDasharray: '4 4' },
              axis: { stroke: 'none' },
            }}
          />
          <VictoryPolarAxis dependentAxis
            style={{ axis: { stroke: 'none' }, grid: { stroke: CHART_COLORS.gridLine, strokeDasharray: '2 4' }, tickLabels: { fill: 'transparent' } }}
            tickValues={[25, 50, 75, 100]}
          />
          <VictoryArea
            data={sanitizeChartData(data.data)}
            style={{
              data: {
                fill: hexAlpha(CHART_COLORS.wingPurple, 0.3),
                stroke: CHART_COLORS.wingPurple,
                strokeWidth: 2,
              },
            }}
            labels={({ datum }: any) => `${datum.x}: ${datum.y}%`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(MuscleGroupFocusRadar);
