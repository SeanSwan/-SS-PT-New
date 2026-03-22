/**
 * ┌─── SUB-COMPONENT: CardioEnduranceLine ──────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory multi-line — cardio duration by type (90d)   │
 * │ CARDIO TYPES: running, cycling, elliptical, swimming, rowing  │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with exercise + minutes       │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryLegend, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../UI/SkeletonChart';

interface Props { userId: number | string; }

const CARDIO_COLORS: Record<string, string> = {
  running: CHART_COLORS.iceWing,
  cycling: CHART_COLORS.wingPurple,
  elliptical: CHART_COLORS.gildedFern,
  swimming: CHART_COLORS.arcticCyan,
  rowing: CHART_COLORS.swanLavender,
  other: CHART_COLORS.frostWhite,
};

const CardioEnduranceLine: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Record<string, Array<{ x: string; y: number }>> }>(userId, 'chart-cardio-endurance');

  if (loading) return <SkeletonChart height={320} />;

  const series = data?.data ? Object.entries(data.data) : [];
  if (error || series.length === 0) return (
    <ChartCard role="region" aria-label="Cardio Endurance" tabIndex={0}>
      <ChartHeader><ChartTitle>Cardio Endurance</ChartTitle><ChartSubtitle>No cardio sessions logged yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  const legendData = series.map(([name], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    symbol: { fill: CARDIO_COLORS[name] || FULL_PALETTE[i % FULL_PALETTE.length] },
  }));

  return (
    <ChartCard role="region" aria-label="Cardio Endurance" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Cardio Endurance</ChartTitle>
        <ChartSubtitle>Duration in minutes — last 90 days</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryLegend x={60} y={0} orientation="horizontal" gutter={16} data={legendData}
            style={{ labels: { fill: CHART_COLORS.frostWhite, fontSize: 10, fontFamily: "'Sora', sans-serif" } }}
          />
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}m`} />
          {series.map(([name, points], i) => (
            <VictoryLine
              key={name}
              data={points}
              style={{ data: { stroke: CARDIO_COLORS[name] || FULL_PALETTE[i % FULL_PALETTE.length], strokeWidth: 2.5 } }}
              interpolation="natural"
              labels={({ datum }: any) => `${name}: ${datum.y}m`}
              labelComponent={<VictoryTooltip />}
            />
          ))}
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(CardioEnduranceLine);
