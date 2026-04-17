/**
 * ┌─── SUB-COMPONENT: IntensityRpeTrendLine ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Phase 14 canonical replacement for                   │
 * │          RPEByExerciseScatter. Reads chart-intensity-rpe-     │
 * │          trend (real data: per-session effort score, RPE      │
 * │          when present, session intensity as fallback) and     │
 * │          renders a 0–10 scaled trend line over time.          │
 * │ Props: { userId }                                             │
 * │ DATA: GET /api/analytics/:userId/chart-intensity-rpe-trend    │
 * └───────────────────────────────────────────────────────────────┘
 *
 * Phase 15.4 (2026-04-16): replaces the deprecated
 * `chart-rpe-by-exercise` endpoint chain. The old scatter chart used
 * a PascalCase join chain that returned [] in production and grouped
 * by exercise rather than by session. The canonical replacement
 * frames effort as a single per-session value (RPE precedence,
 * intensity fallback) so trend behavior is visible across time.
 *
 * Mirrors the canonical card shape from
 * `CanonicalProgressChartsGrid.tsx#IntensityRpeCard`.
 */
import React, { useMemo } from 'react';
import {
  VictoryChart, VictoryLine, VictoryAxis, VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, victoryTheme, VICTORY_ANIMATE, sanitizeChartData,
} from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

interface Props { userId: number | string; }

interface IntensityPoint {
  x: string;
  y: number;
  source?: 'rpe' | 'intensity';
}

interface ApiResponse {
  success: boolean;
  data: IntensityPoint[];
}

const IntensityRpeTrendLine: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<ApiResponse>(
    userId,
    'chart-intensity-rpe-trend',
  );

  const points = useMemo(() => {
    if (!data?.data) return [];
    return data.data.filter(
      (p): p is IntensityPoint =>
        typeof p?.x === 'string' && typeof p?.y === 'number' && Number.isFinite(p.y),
    );
  }, [data]);

  if (loading) return <SkeletonChart height={320} />;
  if (error || points.length === 0) {
    return (
      <ChartCard role="region" aria-label="Effort Trend" tabIndex={0}>
        <ChartHeader>
          <ChartTitle>Effort Trend</ChartTitle>
          <ChartSubtitle>No intensity data yet</ChartSubtitle>
        </ChartHeader>
      </ChartCard>
    );
  }

  return (
    <ChartCard role="region" aria-label="Effort Trend" tabIndex={0}>
      <ChartHeader>
        <ChartTitle>Effort Trend</ChartTitle>
        <ChartSubtitle>RPE ▸ intensity · per session</ChartSubtitle>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart
          theme={victoryTheme}
          animate={VICTORY_ANIMATE}
          domain={{ y: [0, 10] }}
          containerComponent={<VictoryVoronoiContainer voronoiDimension="x" />}
        >
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
          <VictoryLine
            data={sanitizeChartData(points)}
            style={{
              data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2.5 },
            }}
            interpolation="monotoneX"
            labels={({ datum }: any) =>
              `${datum.x}: ${datum.y}${datum.source ? ` (${datum.source})` : ''}`
            }
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(IntensityRpeTrendLine);
