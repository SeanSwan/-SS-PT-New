import React from 'react';
import { VictoryChart, VictoryBar, VictoryStack, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryLegend } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const PERSONAL = [
  { x: 'Jan', y: 4200 }, { x: 'Feb', y: 4500 }, { x: 'Mar', y: 4800 },
  { x: 'Apr', y: 5100 }, { x: 'May', y: 5400 }, { x: 'Jun', y: 5800 },
];
const GROUP = [
  { x: 'Jan', y: 2800 }, { x: 'Feb', y: 3000 }, { x: 'Mar', y: 3200 },
  { x: 'Apr', y: 3100 }, { x: 'May', y: 3500 }, { x: 'Jun', y: 3800 },
];
const VIRTUAL = [
  { x: 'Jan', y: 1200 }, { x: 'Feb', y: 1400 }, { x: 'Mar', y: 1600 },
  { x: 'Apr', y: 1800 }, { x: 'May', y: 2000 }, { x: 'Jun', y: 2200 },
];

const MonthlyRevenueBar: React.FC = () => (
  <ChartCard role="region" aria-label="Monthly revenue by package type" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Monthly Revenue</ChartTitle>
        <ChartSubtitle>Revenue by package type (USD)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domainPadding={{ x: 25 }}
      >
        <VictoryLegend
          x={50} y={0}
          orientation="horizontal"
          gutter={14}
          data={[
            { name: 'Personal', symbol: { fill: FULL_PALETTE[0] } },
            { name: 'Group', symbol: { fill: FULL_PALETTE[1] } },
            { name: 'Virtual', symbol: { fill: FULL_PALETTE[2] } },
          ]}
        />
        <VictoryAxis tickFormat={(t: string) => t} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `$${(t / 1000).toFixed(0)}k`} />
        <VictoryStack>
          <VictoryBar data={PERSONAL} style={{ data: { fill: FULL_PALETTE[0] } }} cornerRadius={{ top: 0 }} labels={({ datum }: { datum: { y: number } }) => `$${datum.y}`} labelComponent={<VictoryTooltip />} />
          <VictoryBar data={GROUP} style={{ data: { fill: FULL_PALETTE[1] } }} cornerRadius={{ top: 0 }} labels={({ datum }: { datum: { y: number } }) => `$${datum.y}`} labelComponent={<VictoryTooltip />} />
          <VictoryBar data={VIRTUAL} style={{ data: { fill: FULL_PALETTE[2] } }} cornerRadius={{ top: 3 }} labels={({ datum }: { datum: { y: number } }) => `$${datum.y}`} labelComponent={<VictoryTooltip />} />
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default MonthlyRevenueBar;
