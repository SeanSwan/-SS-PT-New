import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';

const MUSCLES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const data: number[][] = [
  [4,3,2,1,0,0,0],
  [0,0,4,3,2,1,0],
  [0,4,3,2,1,0,0],
  [2,1,0,0,4,3,2],
  [3,2,1,0,0,4,3],
  [1,2,1,2,1,0,0],
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 72px repeat(7, 1fr);
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
    $intensity === 0 ? hexAlpha(CHART_COLORS.success, 0.6) :
    $intensity === 1 ? hexAlpha(CHART_COLORS.iceWing, 0.3) :
    $intensity === 2 ? hexAlpha(CHART_COLORS.warning, 0.4) :
    $intensity === 3 ? hexAlpha(CHART_COLORS.wingPurple, 0.5) :
    hexAlpha(CHART_COLORS.errorRed, 0.7)};
  transition: transform 0.2s ease;
  &:hover { transform: scale(1.3); }
`;

const MuscleRecoveryHeatmap: React.FC = () => (
  <ChartCard role="region" aria-label="Muscle recovery status heatmap" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Muscle Recovery</ChartTitle>
        <ChartSubtitle>Green = fresh, Red = fatigued</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <Grid>
        <Label />
        {DAYS.map(d => <Label key={d}>{d}</Label>)}
        {data.map((row, r) =>
          [<Label key={`m-${r}`}>{MUSCLES[r]}</Label>].concat(
            row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} title={`${MUSCLES[r]} ${DAYS[c]}: ${['Fresh','Low','Moderate','High','Fatigued'][v]}`} />)
          )
        )}
      </Grid>
    </ChartContainer>
  </ChartCard>
);

export default MuscleRecoveryHeatmap;
