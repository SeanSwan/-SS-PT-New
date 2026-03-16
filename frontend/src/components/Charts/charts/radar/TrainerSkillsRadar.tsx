import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { x: 0, y: 9.0 },
  { x: 1, y: 8.4 },
  { x: 2, y: 7.6 },
  { x: 3, y: 6.8 },
  { x: 4, y: 8.9 },
];

const TrainerSkillsRadar: React.FC = () => (
  <ChartCard role="region" aria-label="Trainer skills assessment radar chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Trainer Skills</ChartTitle>
        <ChartSubtitle>Professional competency scores (1-10)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart polar theme={victoryTheme} animate={VICTORY_ANIMATE} domain={{ y: [0, 10] }}>
        <VictoryPolarAxis
          dependentAxis
          style={{ axis: { stroke: 'none' }, grid: { stroke: CHART_COLORS.gridLine } }}
          tickFormat={() => ''}
        />
        <VictoryPolarAxis
          tickValues={[0, 1, 2, 3, 4]}
          labelPlacement="vertical"
          tickFormat={['Certs', 'Ratings', 'Retention', 'Specialties', 'Experience']}
          style={{
            axis: { stroke: CHART_COLORS.gridLine },
            tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          }}
        />
        <VictoryArea
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.swanLavender, 0.3),
              stroke: CHART_COLORS.swanLavender,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default TrainerSkillsRadar;
