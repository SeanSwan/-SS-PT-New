import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { x: 0, y: 87 },
  { x: 1, y: 72 },
  { x: 2, y: 65 },
  { x: 3, y: 58 },
  { x: 4, y: 91 },
];

const NutritionBalanceRadar: React.FC = () => (
  <ChartCard role="region" aria-label="Nutrition balance adherence radar chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Nutrition Balance</ChartTitle>
        <ChartSubtitle>Macro & hydration adherence (%)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart polar theme={victoryTheme} animate={VICTORY_ANIMATE} domain={{ y: [0, 100] }}>
        <VictoryPolarAxis
          dependentAxis
          style={{ axis: { stroke: 'none' }, grid: { stroke: CHART_COLORS.gridLine } }}
          tickFormat={() => ''}
        />
        <VictoryPolarAxis
          tickValues={[0, 1, 2, 3, 4]}
          labelPlacement="vertical"
          tickFormat={['Protein', 'Carbs', 'Fats', 'Fiber', 'Hydration']}
          style={{
            axis: { stroke: CHART_COLORS.gridLine },
            tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          }}
        />
        <VictoryArea
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.arcticCyan, 0.3),
              stroke: CHART_COLORS.arcticCyan,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default NutritionBalanceRadar;
