/**
 * ┌─── SUB-COMPONENT: WeightProgressionLive ────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory line chart — body weight over time, with the │
 * │   "Your Journey" (Ghost-Self) overlay: faded past-you flowing  │
 * │   into vivid present-you, and a neutral "since you started"    │
 * │   delta badge. Real series only (no "best" marker: weight has  │
 * │   no universal good direction).                                │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover any point (past or present) → weight     │
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
// green/red - it reports the factual change). flex-shrink:0 + nowrap so it never wraps
// into a distorted pill on narrow (mobile) cards. Tokens-with-fallback (Rule 6).
const JourneyBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font: 800 0.68rem/1 'Sora', sans-serif;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
`;

const SrText = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`;

const GHOST_STROKE = hexAlpha(CHART_COLORS.iceWing, 0.34);
const weightLabel = ({ datum }: any) => `${datum.y} lbs`;

const WeightProgressionLive: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-weight-progression');

  if (loading) return <SkeletonChart height={320} />;

  // Sanitize BEFORE the empty-state check: a present-but-all-invalid payload (all-NaN)
  // must still show the honest empty state, not a blank chart frame.
  const clean = data?.data ? sanitizeChartData(data.data) : [];
  if (error || clean.length === 0) return (
    <ChartCard role="region" aria-label="Weight Progression" tabIndex={0}>
      <ChartHeader><ChartTitle>Weight Progression</ChartTitle><ChartSubtitle>No measurements recorded yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

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
          <JourneyBadge>
            <SrText>Change: </SrText>{journey.startDeltaLabel}
          </JourneyBadge>
        )}
      </ChartHeader>
      <ChartContainer>
        {/* linear interpolation on all layers so the faded/vivid line strokes trace the
            exact top edge of the (full-series) fill - a spline would let the split
            half-series lines bow off their own fill. */}
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t} lbs`} />
          <VictoryArea
            data={clean}
            {...victoryStyleProps({ data: { fill: hexAlpha(CHART_COLORS.iceWing, 0.15), stroke: 'none' } })}
            interpolation="linear"
          />
          {journey ? (
            <VictoryLine
              data={journey.ghost}
              {...victoryStyleProps({ data: { stroke: GHOST_STROKE, strokeWidth: 2, strokeDasharray: '5,5' } })}
              interpolation="linear"
              labels={weightLabel}
              labelComponent={<VictoryTooltip />}
            />
          ) : null}
          <VictoryLine
            data={journey ? journey.current : clean}
            {...victoryStyleProps({ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2.5 } })}
            interpolation="linear"
            labels={weightLabel}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(WeightProgressionLive);
