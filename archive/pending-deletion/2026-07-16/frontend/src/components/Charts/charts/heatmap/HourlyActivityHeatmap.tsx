import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 14 }, (_, i) => `${i + 6}`);

const data: number[][] = [
  [0,0,1,2,3,4,3,2,1,2,3,2,1,0],
  [0,1,2,3,4,3,2,1,0,1,2,3,2,0],
  [0,0,1,2,3,4,4,3,2,1,2,1,0,0],
  [0,1,2,3,3,2,1,1,2,3,4,3,1,0],
  [1,2,3,4,4,3,2,1,1,2,3,4,2,1],
  [0,0,0,1,2,3,4,4,3,2,1,0,0,0],
  [0,0,0,0,1,2,3,3,2,1,0,0,0,0],
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 36px repeat(14, 1fr);
  gap: 3px;
  flex: 1;
  align-content: start;
`;

const Label = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  color: ${CHART_COLORS.textSecondary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Cell = styled.div<{ $intensity: number }>`
  border-radius: 3px;
  aspect-ratio: 1;
  background: ${({ $intensity }) =>
    $intensity === 0 ? hexAlpha(CHART_COLORS.iceWing, 0.05) :
    $intensity === 1 ? hexAlpha(CHART_COLORS.iceWing, 0.2) :
    $intensity === 2 ? hexAlpha(CHART_COLORS.iceWing, 0.4) :
    $intensity === 3 ? hexAlpha(CHART_COLORS.wingPurple, 0.5) :
    hexAlpha(CHART_COLORS.wingPurple, 0.8)};
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.3); }
`;

const HourlyActivityHeatmap: React.FC = () => (
  <ChartCard role="region" aria-label="Hourly activity heatmap by day of week" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Peak Gym Hours</ChartTitle>
        <ChartSubtitle>Activity intensity by hour and day</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <Grid>
        <Label />
        {HOURS.map(h => <Label key={h}>{h}</Label>)}
        {data.map((row, r) =>
          [<Label key={`d-${r}`}>{DAYS[r]}</Label>].concat(
            row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} title={`${DAYS[r]} ${HOURS[c]}:00 — ${v}/4`} />)
          )
        )}
      </Grid>
    </ChartContainer>
  </ChartCard>
);

export default HourlyActivityHeatmap;
