import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';

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
}

const WorkoutHeatmapCalendar: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_DATA;
  const isDemo = !data || data.length === 0;

  return (
    <ChartCard role="region" aria-label="Workout frequency heatmap calendar" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Workout Frequency{isDemo ? ' (Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Last 12 weeks — GitHub-style calendar</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        <Grid>
          {chartData.map((row, r) =>
            [<DayLabel key={`d-${r}`}>{DAYS[r]}</DayLabel>].concat(
              row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} $isDemo={isDemo} title={`${DAYS[r]} Wk${c + 1}: ${v} sessions`} />)
            )
          )}
        </Grid>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(WorkoutHeatmapCalendar);
