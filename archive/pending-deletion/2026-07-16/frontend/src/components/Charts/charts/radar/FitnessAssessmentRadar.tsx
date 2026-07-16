import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { x: 0, y: 8.2 },
  { x: 1, y: 6.5 },
  { x: 2, y: 5.1 },
  { x: 3, y: 7.0 },
  { x: 4, y: 9.1 },
];

const FitnessAssessmentRadar: React.FC = () => (
  <ChartCard role="region" aria-label="Fitness assessment scores radar chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Fitness Assessment</ChartTitle>
        <ChartSubtitle>Five-pillar score breakdown (1-10 scale)</ChartSubtitle>
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
          tickFormat={['Strength', 'Endurance', 'Flexibility', 'Balance', 'Power']}
          style={{
            axis: { stroke: CHART_COLORS.gridLine },
            tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          }}
        />
        <VictoryArea
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.wingPurple, 0.3),
              stroke: CHART_COLORS.wingPurple,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default FitnessAssessmentRadar;
