import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const fat = [
  { x: 'Mo1', y: 22 }, { x: 'Mo2', y: 20 }, { x: 'Mo3', y: 18 },
  { x: 'Mo4', y: 17 }, { x: 'Mo5', y: 15 }, { x: 'Mo6', y: 14 },
];
const muscle = [
  { x: 'Mo1', y: 38 }, { x: 'Mo2', y: 39 }, { x: 'Mo3', y: 40 },
  { x: 'Mo4', y: 41 }, { x: 'Mo5', y: 42 }, { x: 'Mo6', y: 43 },
];
const water = [
  { x: 'Mo1', y: 40 }, { x: 'Mo2', y: 41 }, { x: 'Mo3', y: 42 },
  { x: 'Mo4', y: 42 }, { x: 'Mo5', y: 43 }, { x: 'Mo6', y: 43 },
];

const BodyCompositionArea: React.FC = () => (
  <ChartCard role="region" aria-label="Body composition stacked area chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Body Composition</ChartTitle>
        <ChartSubtitle>Fat / Muscle / Water % over 6 months</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        containerComponent={<VictoryVoronoiContainer labels={({ datum }) => `${datum.x}: ${datum.y}%`} labelComponent={<VictoryTooltip style={victoryTheme.tooltip.style} flyoutStyle={victoryTheme.tooltip.flyoutStyle} />} />}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis />
        <VictoryStack>
          <VictoryArea animate={VICTORY_ANIMATE} data={fat} style={{ data: { fill: hexAlpha(FULL_PALETTE[2], 0.5), stroke: FULL_PALETTE[2] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={muscle} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={water} style={{ data: { fill: hexAlpha(FULL_PALETTE[3], 0.5), stroke: FULL_PALETTE[3] } }} />
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default BodyCompositionArea;
