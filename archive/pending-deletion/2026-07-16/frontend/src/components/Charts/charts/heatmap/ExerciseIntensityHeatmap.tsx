import React from 'react';
import styled from 'styled-components';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha } from '../../chartTheme';

const EXERCISES = ['Squat', 'Bench', 'Deadlift', 'OHP', 'Row', 'Pull-up'];
const SESSIONS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

const data: number[][] = [
  [2,3,3,4,2,3,4,3],
  [1,2,3,3,2,2,3,4],
  [3,4,3,2,3,4,4,3],
  [1,1,2,2,3,3,2,2],
  [2,2,3,3,2,1,2,3],
  [0,1,2,2,3,3,4,4],
];

const Grid = styled.div`
  display: grid;
  grid-template-columns: 60px repeat(8, 1fr);
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

const rpeMap = ['RPE 5', 'RPE 6', 'RPE 7', 'RPE 8', 'RPE 9+'];

const ExerciseIntensityHeatmap: React.FC = () => (
  <ChartCard role="region" aria-label="Exercise intensity heatmap by session" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Exercise Intensity</ChartTitle>
        <ChartSubtitle>RPE by exercise across 8 sessions</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <Grid>
        <Label />
        {SESSIONS.map(s => <Label key={s}>{s}</Label>)}
        {data.map((row, r) =>
          [<Label key={`e-${r}`}>{EXERCISES[r]}</Label>].concat(
            row.map((v, c) => <Cell key={`${r}-${c}`} $intensity={v} title={`${EXERCISES[r]} ${SESSIONS[c]}: ${rpeMap[v]}`} />)
          )
        )}
      </Grid>
    </ChartContainer>
  </ChartCard>
);

export default ExerciseIntensityHeatmap;
