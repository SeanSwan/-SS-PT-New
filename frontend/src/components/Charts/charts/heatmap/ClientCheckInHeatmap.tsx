import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';

const WEEKS = ['Wk1', 'Wk2', 'Wk3', 'Wk4'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const data: number[][] = [
  [2,3,1,2,4,3,2,1,3,4,2,3],
  [1,2,3,4,3,2,1,0,2,3,4,2],
  [3,2,1,0,1,2,3,4,3,2,1,0],
  [0,1,2,3,2,1,0,2,4,3,2,1],
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 36px repeat(12, 1fr);
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

const ClientCheckInHeatmap: React.FC = () => (
  <ChartCard role="region" aria-label="Client check-in patterns heatmap" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Check-In Patterns</ChartTitle>
        <ChartSubtitle>Weekly check-ins across 12 months</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <Grid>
        <Label />
        {MONTHS.map(m => <Label key={m}>{m}</Label>)}
        {data.map((row, r) =>
          [<Label key={`w-${r}`}>{WEEKS[r]}</Label>].concat(
            row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} title={`${WEEKS[r]} ${MONTHS[c]}: ${v} check-ins`} />)
          )
        )}
      </Grid>
    </ChartContainer>
  </ChartCard>
);

export default ClientCheckInHeatmap;
