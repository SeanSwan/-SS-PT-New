import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const personal = [
  { x: 'Jan', y: 4200 }, { x: 'Feb', y: 4500 }, { x: 'Mar', y: 4800 },
  { x: 'Apr', y: 5100 }, { x: 'May', y: 5400 }, { x: 'Jun', y: 5800 },
];
const group = [
  { x: 'Jan', y: 1800 }, { x: 'Feb', y: 2000 }, { x: 'Mar', y: 2200 },
  { x: 'Apr', y: 2400 }, { x: 'May', y: 2600 }, { x: 'Jun', y: 2900 },
];
const online = [
  { x: 'Jan', y: 800 }, { x: 'Feb', y: 950 }, { x: 'Mar', y: 1100 },
  { x: 'Apr', y: 1300 }, { x: 'May', y: 1500 }, { x: 'Jun', y: 1800 },
];

const RevenueStreamArea: React.FC = () => (
  <ChartCard role="region" aria-label="Revenue streams stacked area chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Revenue Streams</ChartTitle>
        <ChartSubtitle>Personal / Group / Online — Jan to Jun</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        containerComponent={<VictoryVoronoiContainer labels={({ datum }) => `${datum.x}: $${datum.y}`} labelComponent={<VictoryTooltip style={victoryTheme.tooltip.style} flyoutStyle={victoryTheme.tooltip.flyoutStyle} />} />}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `$${t / 1000}k`} />
        <VictoryStack>
          <VictoryArea animate={VICTORY_ANIMATE} data={personal} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={group} style={{ data: { fill: hexAlpha(FULL_PALETTE[1], 0.5), stroke: FULL_PALETTE[1] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={online} style={{ data: { fill: hexAlpha(FULL_PALETTE[2], 0.5), stroke: FULL_PALETTE[2] } }} />
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default RevenueStreamArea;
