import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const volume = [
  { x: 'Wk1', y: 120 }, { x: 'Wk2', y: 135 }, { x: 'Wk3', y: 150 }, { x: 'Wk4', y: 145 },
  { x: 'Wk5', y: 160 }, { x: 'Wk6', y: 170 }, { x: 'Wk7', y: 155 }, { x: 'Wk8', y: 180 },
];
const intensity = [
  { x: 'Wk1', y: 60 }, { x: 'Wk2', y: 65 }, { x: 'Wk3', y: 70 }, { x: 'Wk4', y: 68 },
  { x: 'Wk5', y: 75 }, { x: 'Wk6', y: 80 }, { x: 'Wk7', y: 72 }, { x: 'Wk8', y: 85 },
];

const TrainingLoadArea: React.FC = () => (
  <ChartCard role="region" aria-label="Training load stacked area chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Training Load</ChartTitle>
        <ChartSubtitle>Volume + Intensity over 8 weeks</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        containerComponent={<VictoryVoronoiContainer labels={({ datum }) => `${datum.x}: ${datum.y}`} labelComponent={<VictoryTooltip style={victoryTheme.tooltip.style} flyoutStyle={victoryTheme.tooltip.flyoutStyle} />} />}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis />
        <VictoryStack>
          <VictoryArea animate={VICTORY_ANIMATE} data={volume} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={intensity} style={{ data: { fill: hexAlpha(FULL_PALETTE[1], 0.5), stroke: FULL_PALETTE[1] } }} />
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default TrainingLoadArea;
