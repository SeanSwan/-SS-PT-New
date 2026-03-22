/**
 * ┌─── SUB-COMPONENT: MuscleRecoveryHeatmap ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory bar chart — days since last training per     │
 * │          muscle group, color-coded by recovery status         │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with days + status            │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

// AI Village Phase 3 consensus: use Crystalline Swan semantic status tokens
const STATUS_COLORS: Record<string, string> = {
  recovering: CHART_COLORS.gildedFern,    // Gilded Fern — warning/recovering
  ready: CHART_COLORS.auroraGreen,        // Aurora Green — success/ready
  overdue: CHART_COLORS.crimsonFrost,     // Crimson Frost — error/overdue
};

const MuscleRecoveryHeatmap: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{
    data: Array<{ x: string; y: number; sessions: number; status: string }>
  }>(userId, 'chart-muscle-recovery');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Muscle Recovery" tabIndex={0}>
      <ChartHeader><ChartTitle>Muscle Recovery</ChartTitle><ChartSubtitle>No data yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  return (
    <ChartCard role="region" aria-label="Muscle Recovery" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Muscle Recovery</ChartTitle>
        <ChartSubtitle>Days since last training — last 30 days</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          domainPadding={{ x: 20 }} horizontal
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis
            tickFormat={(t: string) => t.charAt(0).toUpperCase() + t.slice(1)}
            style={{ tickLabels: { fontSize: 10 } }}
          />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}d`} />
          <VictoryBar
            data={data.data}
            style={{
              data: {
                fill: ({ datum }: any) => STATUS_COLORS[datum.status] || CHART_COLORS.iceWing,
              },
            }}
            cornerRadius={{ top: 4 }}
            labels={({ datum }: any) => `${datum.x}: ${datum.y}d (${datum.status})\n${datum.sessions} sessions`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(MuscleRecoveryHeatmap);
