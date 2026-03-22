/**
 * ┌─── SUB-COMPONENT: WorkoutFrequencyBar ──────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory bar chart — workouts per week (12 weeks)     │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with count                    │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

const WorkoutFrequencyBar: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-workout-frequency');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Workout Frequency" tabIndex={0}>
      <ChartHeader><ChartTitle>Workout Frequency</ChartTitle><ChartSubtitle>No data yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Workout Frequency" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Workout Frequency</ChartTitle>
        <ChartSubtitle>Workouts per week — last 12 weeks</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE} domainPadding={{ x: 15 }}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
          <VictoryBar
            data={data.data}
            style={{ data: { fill: CHART_COLORS.iceWing } }}
            cornerRadius={{ top: 4 }}
            labels={({ datum }: any) => `${datum.y} workouts`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(WorkoutFrequencyBar);
