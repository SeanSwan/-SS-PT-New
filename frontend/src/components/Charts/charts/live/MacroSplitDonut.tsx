/**
 * ┌─── SUB-COMPONENT: MacroSplitDonut ──────────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory pie/donut — macronutrient split (7-day avg)  │
 * │ Props: { userId }                                             │
 * │ DATA SOURCE: daily_macro_logs (food intake tracker)           │
 * │ CLICK-OUTCOMES: Hover → tooltip with macro grams              │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryPie, VictoryTooltip } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, MACRO_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

const MacroSplitDonut: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }>; totalGrams: number }>(userId, 'chart-macro-split');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Macro Split" tabIndex={0}>
      <ChartHeader><ChartTitle>Macro Split</ChartTitle><ChartSubtitle>No nutrition data logged this week</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Macro Split" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Macro Split</ChartTitle>
        <ChartSubtitle>7-day total — {data.totalGrams}g total macros</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryPie
          data={data.data}
          innerRadius={70}
          padAngle={2}
          animate={VICTORY_ANIMATE}
          colorScale={MACRO_PALETTE}
          style={{
            data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
            labels: {
              fill: CHART_COLORS.frostWhite,
              fontSize: 12,
              fontFamily: "'Fira Code', monospace",
            },
          }}
          labels={({ datum }: any) => `${datum.x}\n${datum.y}g`}
          labelComponent={<VictoryTooltip />}
        />
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(MacroSplitDonut);
