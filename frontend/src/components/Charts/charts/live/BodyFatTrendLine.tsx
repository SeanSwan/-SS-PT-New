/**
 * ┌─── SUB-COMPONENT: BodyFatTrendLine ─────────────────────────┐
 * │ PARENT: ClientAnalyticsPanel, ProfileChartsSection            │
 * │ PURPOSE: Victory line chart — body fat % over time, with the  │
 * │   "Your Journey" (Ghost-Self) overlay. Body fat is direction-  │
 * │   KNOWN (lower = better), so it earns a gold personal-best     │
 * │   marker (lowest reading) + a tone-aware "since you started"   │
 * │   delta badge. Real series only.                              │
 * │ Props: { userId }                                             │
 * │ CLICK-OUTCOMES: Hover any point → BF% (+ the best point)      │
 * └───────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import {
  VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryScatter,
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

// Direction-aware badge: a drop in body fat is an improvement (green); a rise or a flat
// reading stays neutral (factual, never punitive). flex-shrink:0 + nowrap so it never
// wraps on narrow cards. Tokens-with-fallback (Rule 6).
const JourneyBadge = styled.span<{ $improved: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font: 800 0.68rem/1 'Sora', sans-serif;
  color: ${({ $improved }) => ($improved ? 'var(--success, #22c55e)' : 'var(--accent-primary, #60C0F0)')};
  background: ${({ $improved }) => ($improved
    ? 'color-mix(in srgb, var(--success, #22c55e) 15%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)')};
  border: 1px solid ${({ $improved }) => ($improved
    ? 'color-mix(in srgb, var(--success, #22c55e) 28%, transparent)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent)')};
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

const GHOST_STROKE = hexAlpha(CHART_COLORS.gildedFern, 0.34);
const bfLabel = ({ datum }: any) => `${datum.y}%`;

const BodyFatTrendLine: React.FC<Props> = ({ userId }) => {
  const { data, loading, error } = useAnalytics<{ data: Array<{ x: string; y: number }> }>(userId, 'chart-body-fat-trend');

  if (loading) return <SkeletonChart height={320} />;

  // Sanitize before the empty-state check so an all-invalid payload still shows honest empty.
  const clean = data?.data ? sanitizeChartData(data.data) : [];
  if (error || clean.length === 0) return (
    <ChartCard role="region" aria-label="Body Fat Trend" tabIndex={0}>
      <ChartHeader><ChartTitle>Body Fat Trend</ChartTitle><ChartSubtitle>No body fat measurements yet</ChartSubtitle></ChartHeader>
    </ChartCard>
  );

  // Body fat is direction-known: lower is better.
  const journey = buildGhostSelf(clean, { unit: '%', higherIsBetter: false });

  return (
    <ChartCard role="region" aria-label="Body Fat Trend" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Body Fat Trend</ChartTitle>
          <ChartSubtitle>
            {journey ? 'Body fat % over time · faded line = earlier you' : 'Body fat % over time'}
          </ChartSubtitle>
        </div>
        {journey && (
          <JourneyBadge $improved={journey.improved}>
            <SrText>Change: </SrText>{journey.startDeltaLabel}
          </JourneyBadge>
        )}
      </ChartHeader>
      <ChartContainer>
        {/* linear interpolation so the faded/vivid strokes trace their fill exactly. */}
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE}
          containerComponent={<VictoryVoronoiContainer />}>
          <VictoryAxis tickFormat={(t: string) => t} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}%`} />
          <VictoryArea
            data={clean}
            {...victoryStyleProps({ data: { fill: hexAlpha(CHART_COLORS.gildedFern, 0.15), stroke: 'none' } })}
            interpolation="linear"
          />
          {journey ? (
            <VictoryLine
              data={journey.ghost}
              {...victoryStyleProps({ data: { stroke: GHOST_STROKE, strokeWidth: 2, strokeDasharray: '5,5' } })}
              interpolation="linear"
            />
          ) : null}
          <VictoryLine
            data={journey ? journey.current : clean}
            {...victoryStyleProps({ data: { stroke: CHART_COLORS.gildedFern, strokeWidth: 2.5 } })}
            interpolation="linear"
          />
          {/* Hover across ALL points (small dots). */}
          <VictoryScatter
            data={clean}
            size={3}
            {...victoryStyleProps({ data: { fill: CHART_COLORS.gildedFern, stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 } })}
            labels={bfLabel}
            labelComponent={<VictoryTooltip />}
          />
          {/* Honest personal-best marker (lowest BF% = best for a direction-known metric). */}
          {journey ? (
            <VictoryScatter
              data={[journey.bestPoint]}
              size={7}
              {...victoryStyleProps({ data: { fill: CHART_COLORS.gildedFern, stroke: hexAlpha(CHART_COLORS.gildedFern, 0.45), strokeWidth: 5 } })}
              labels={() => `Personal best: ${journey.bestPoint.y}%`}
              labelComponent={<VictoryTooltip />}
            />
          ) : null}
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(BodyFatTrendLine);
