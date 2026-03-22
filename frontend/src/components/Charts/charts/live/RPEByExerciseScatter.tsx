/**
 * ┌─── SUB-COMPONENT: RPEByExerciseScatter ─────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory multi-line — RPE per exercise across last    │
 * │          24 sessions, tracking intensity trends per exercise   │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with exercise + RPE + date    │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryLegend, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

const RPEByExerciseScatter: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{
    data: Record<string, Array<{ x: string; y: number }>>;
    exercises: string[];
  }>(userId, 'chart-rpe-by-exercise');

  if (loading) return <SkeletonChart height={320} />;

  const exercises = data?.exercises || [];
  const seriesData = data?.data || {};
  if (error || exercises.length === 0) return (
    <ChartCard role="region" aria-label="Exercise Intensity (RPE)" tabIndex={0}>
      <ChartHeader><ChartTitle>Exercise Intensity</ChartTitle><ChartSubtitle>No RPE data logged yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  const legendData = exercises.slice(0, 6).map((name, i) => ({
    name: name.length > 18 ? name.slice(0, 16) + '…' : name,
    symbol: { fill: FULL_PALETTE[i % FULL_PALETTE.length] },
  }));

  return (
    <ChartCard role="region" aria-label="Exercise Intensity (RPE)" tabIndex={0} $span={2}>
      <ChartHeader>
        <ChartTitle>Exercise Intensity (RPE)</ChartTitle>
        <ChartSubtitle>RPE by exercise — last 24 sessions</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          domain={{ y: [0, 10] }}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryLegend x={50} y={0} orientation="horizontal" gutter={12}
            data={legendData}
            style={{ labels: { fill: CHART_COLORS.frostWhite, fontSize: 9, fontFamily: "'Sora', sans-serif" } }}
          />
          <VictoryAxis tickFormat={(t: string) => t} style={{ tickLabels: { fontSize: 9 } }} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} label="RPE" />
          {exercises.slice(0, 6).map((name, i) => {
            const pts = seriesData[name] || [];
            const color = FULL_PALETTE[i % FULL_PALETTE.length];
            return (
              <React.Fragment key={name}>
                <VictoryLine
                  data={pts}
                  style={{ data: { stroke: color, strokeWidth: 1.5, strokeDasharray: '4 2' } }}
                  interpolation="natural"
                />
                <VictoryScatter
                  data={pts}
                  size={3.5}
                  style={{ data: { fill: color, stroke: CHART_COLORS.midnightSapphire, strokeWidth: 1 } }}
                  labels={({ datum }: any) => `${name}\nRPE: ${datum.y}\n${datum.x}`}
                  labelComponent={<VictoryTooltip />}
                />
              </React.Fragment>
            );
          })}
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(RPEByExerciseScatter);
