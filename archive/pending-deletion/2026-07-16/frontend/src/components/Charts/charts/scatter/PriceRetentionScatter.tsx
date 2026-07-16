import React from 'react';
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS } from '../../chartTheme';

const data = [
  { x: 50, y: 2 }, { x: 75, y: 4 }, { x: 100, y: 6 }, { x: 120, y: 8 },
  { x: 150, y: 12 }, { x: 180, y: 14 }, { x: 200, y: 18 }, { x: 225, y: 16 },
  { x: 260, y: 20 }, { x: 300, y: 24 },
];

const PriceRetentionScatter: React.FC = () => (
  <ChartCard role="region" aria-label="Package price vs client retention scatter chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Price vs Retention</ChartTitle>
        <ChartSubtitle>Package cost correlated with client retention months</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryAxis label="Price ($)" />
        <VictoryAxis dependentAxis label="Months" />
        <VictoryScatter
          data={data}
          size={6}
          style={{ data: { fill: CHART_COLORS.gildedFern, opacity: 0.8 } }}
          labels={({ datum }) => `$${datum.x} → ${datum.y} mo`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default PriceRetentionScatter;
