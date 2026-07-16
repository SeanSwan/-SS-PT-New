import React from 'react';
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS } from '../../chartTheme';

const data = [
  { x: 18, y: 32 }, { x: 22, y: 30 }, { x: 25, y: 28 }, { x: 28, y: 26 },
  { x: 30, y: 25 }, { x: 33, y: 23 }, { x: 35, y: 22 }, { x: 38, y: 20 },
  { x: 42, y: 18 }, { x: 45, y: 16 }, { x: 48, y: 14 }, { x: 52, y: 12 },
  { x: 55, y: 10 }, { x: 60, y: 8 }, { x: 65, y: 6 },
];

const AgePerformanceScatter: React.FC = () => (
  <ChartCard role="region" aria-label="Client age vs performance gains scatter chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Age vs Performance</ChartTitle>
        <ChartSubtitle>Client age correlated with strength gains percentage</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryAxis label="Age" />
        <VictoryAxis dependentAxis label="Gains %" />
        <VictoryScatter
          data={data}
          size={6}
          style={{ data: { fill: CHART_COLORS.arcticCyan, opacity: 0.8 } }}
          labels={({ datum }) => `Age ${datum.x}: +${datum.y}%`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default AgePerformanceScatter;
