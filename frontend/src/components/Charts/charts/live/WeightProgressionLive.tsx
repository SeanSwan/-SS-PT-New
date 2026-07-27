/**
 * ┌─── SUB-COMPONENT: WeightProgressionLive ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory line chart — body weight over time, with the │
 * │   "Your Journey" (Ghost-Self) overlay: faded past-you flowing  │
 * │   into vivid present-you, a gold personal-best marker, and a   │
 * │   "since you started" delta badge. Real series only.           │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover → tooltip with weight value             │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import {
  VictoryChart, VictoryLine, VictoryArea, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer,
} from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE, sanitizeChartData,
} from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';
import { buildGhostSelf } from './ghostSelf';

interface Props { userId: number | string; }

// Neutral delta badge (weight has no universal "good" direction, so it is not tinted
// green/red - it reports the factual change). Tokens-with-fallback (Rule 6).
const JourneyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font: 800 0.68rem/1 'Sora', sans-serif;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
`;

const GHOST_STROKE = hexAlpha(CHART_COLORS.iceWing, 0.34);

const WeightProgressionLive: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-weight-progression');

  if (loading) return <SkeletonChart height={320} />;
  if (error || !data?.data?.length) return (
    <ChartCard role="region" aria-label="Weight Progression" tabIndex={0}>
      <ChartHeader><ChartTitle>Weight Progression</ChartTitle><ChartSubtitle>No measurements recorded yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  const clean = sanitizeChartData(data.data);
  // Weight goal direction is client-specific; keep the journey direction-neutral.
  const journey = buildGhostSelf(clean, { unit: 'lbs' });

  return (
    <ChartCard role="region" aria-label="Weight Progression" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Weight Progression</ChartTitle>
          <ChartSubtitle>
            {journey ? 'Body weight over time · faded line = earlier you' : 'Body weight over time'}
          </ChartSubtitle>
        </div>
        {journey && (
          <JourneyBadge aria-label={`Change ${journey.startDeltaLabel}`}>
            {journey.startDeltaLabel}
          </JourneyBadge>
        )}
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t} lbs`} />
          <VictoryArea
            data={clean}
            {...victoryStyleProps({ data: { fill: hexAlpha(CHART_COLORS.iceWing, 0.15), stroke: 'none' } })}
            interpolation="natural"
          />
          {journey ? (
            <VictoryLine
              data={journey.ghost}
              {...victoryStyleProps({ data: { stroke: GHOST_STROKE, strokeWidth: 2, strokeDasharray: '5,5' } })}
              interpolation="natural"
            />
          ) : null}
          {/* No "personal best" marker here: body weight has no universal good
              direction, so a gold "best" dot would mislead a weight-loss client.
              The bestPoint is kept in the ghostSelf module for direction-known
              metrics (body fat, est-1RM) to surface. */}
          <VictoryLine
            data={journey ? journey.current : clean}
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