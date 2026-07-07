import React, { useMemo } from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';
import { useAnalytics } from '../../../../hooks/useAnalytics';
import SkeletonChart from '../../../ui/SkeletonChart';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEKS = 12;

const DEMO_DATA: number[][] = [
  [0,1,2,3,2,1,0,2,3,4,3,2],
  [1,0,1,2,3,2,1,0,2,3,4,3],
  [2,1,0,1,2,3,2,1,0,1,2,3],
  [3,2,1,0,1,2,3,4,3,2,1,0],
  [2,3,2,1,0,1,2,3,4,3,2,1],
  [0,0,1,0,0,1,0,0,1,0,1,2],
  [0,0,0,1,0,0,0,1,0,0,0,1],
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 24px repeat(${WEEKS}, 1fr);
  gap: 3px;
  flex: 1;
  align-content: start;
`;

const DayLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: ${CHART_COLORS.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div<{ $intensity: number; $isDemo: boolean }>`
  border-radius: 3px;
  aspect-ratio: 1;
  opacity: ${({ $isDemo }) => ($isDemo ? 0.5 : 1)};
  background: ${({ $intensity }) =>
    $intensity === 0 ? hexAlpha(CHART_COLORS.iceWing, 0.05) :
    $intensity === 1 ? hexAlpha(CHART_COLORS.iceWing, 0.2) :
    $intensity === 2 ? hexAlpha(CHART_COLORS.iceWing, 0.4) :
    $intensity === 3 ? hexAlpha(CHART_COLORS.wingPurple, 0.5) :
    hexAlpha(CHART_COLORS.wingPurple, 0.8)};
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.3); }
`;

interface Props {
  data?: number[][];
  /** When set (profile/analytics mounts), real logged sessions feed the grid. */
  userId?: number | string;
}

/**
 * Builds the 7xWEEKS day-grid from the per-session duration-trend series
 * (one point per logged session day, 'MM/DD' labels, last 90 days) by
 * walking back from today — 84 cells cannot collide across years.
 */
export const buildHeatmapGridFromSessions = (
  points: Array<{ x: string }>,
  today = new Date(),
): number[][] | null => {
  if (!points.length) return null;
  const counts = new Map<string, number>();
  points.forEach((point) => {
    counts.set(point.x, (counts.get(point.x) ?? 0) + 1);
  });
  // grid[dayOfWeek Mon=0][weekIndex oldest=0]
  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: WEEKS }, () => 0));
  for (let daysBack = 0; daysBack < WEEKS * 7; daysBack += 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysBack);
    const label = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const dayRow = (date.getDay() + 6) % 7; // JS Sunday=0 -> Monday-first rows
    const weekCol = WEEKS - 1 - Math.floor(daysBack / 7);
    if (weekCol >= 0) grid[dayRow][weekCol] = counts.get(label) ?? 0;
  }
  return grid;
};

const WorkoutHeatmapCalendar: React.FC<Props> = ({ data, userId }) => {
  const shouldFetch = !data && userId != null;
  const { data: sessionsRes, loading } = useAnalytics<{ data: Array<{ x: string }> }>(
    userId,
    'chart-duration-trend',
    shouldFetch,
  );
  const fetchedGrid = useMemo(
    () => (shouldFetch && sessionsRes?.data?.length ? buildHeatmapGridFromSessions(sessionsRes.data) : null),
    [shouldFetch, sessionsRes],
  );

  const realData = (data && data.length > 0) ? data : fetchedGrid;
  const hasRealData = !!(realData && realData.length > 0);
  const allowDemoFallback = !hasRealData && !shouldFetch && import.meta.env.DEV;
  const chartData = hasRealData ? realData! : (allowDemoFallback ? DEMO_DATA : []);

  if (shouldFetch && loading) return <SkeletonChart height={280} />;

  if (chartData.length === 0) {
    return (
      <ChartCard role="region" aria-label="Workout frequency heatmap calendar" tabIndex={0}>
        <ChartHeader>
          <div>
            <ChartTitle>Workout Calendar</ChartTitle>
            <ChartSubtitle>No workout calendar data yet</ChartSubtitle>
          </div>
        </ChartHeader>
      </ChartCard>
    );
  }

  return (
    <ChartCard role="region" aria-label="Workout frequency heatmap calendar" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Workout Calendar{allowDemoFallback ? ' (Dev Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Last 12 weeks — GitHub-style calendar</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        <Grid>
          {chartData.map((row, r) =>
            [<DayLabel key={`d-${r}`}>{DAYS[r]}</DayLabel>].concat(
              row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} $isDemo={allowDemoFallback} title={`${DAYS[r]} Wk${c + 1}: ${v} sessions`} />)
            )
          )}
        </Grid>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(WorkoutHeatmapCalendar);
