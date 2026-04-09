/**
 * ┌─── SUB-COMPONENT: SessionFrequencyArea ─────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory area chart — sessions per week (24 weeks)    │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with sessions + minutes       │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryArea, VictoryLine, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE, sanitizeChartData } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

const SessionFrequencyArea: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number; minutes: number }> }>(userId, 'chart-session-frequency');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Session Frequency" tabIndex={0}>
      <ChartHeader><ChartTitle>Session Frequency</ChartTitle><ChartSubtitle>No sessions yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Session Frequency" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Session Frequency</ChartTitle>
        <ChartSubtitle>Sessions per week — last 24 weeks</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
          <VictoryArea
            data={sanitizeChartData(data.data)}
            style={{ data: { fill: hexAlpha(CHART_COLORS.wingPurple, 0.2), stroke: 'none' } }}
            interpolation="natural"
          />
          <VictoryLine
            data={sanitizeChartData(data.data)}
            style={{ data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2.5 } }}
            interpolation="natural"
            labels={({ datum }: any) => `${datum.y} sessions\n${datum.minutes || 0} min`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(SessionFrequencyArea);
