import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const strength = [
  { x: 'Mon', y: 320 }, { x: 'Tue', y: 280 }, { x: 'Wed', y: 350 },
  { x: 'Thu', y: 0 },   { x: 'Fri', y: 310 }, { x: 'Sat', y: 400 }, { x: 'Sun', y: 0 },
];
const cardio = [
  { x: 'Mon', y: 180 }, { x: 'Tue', y: 250 }, { x: 'Wed', y: 150 },
  { x: 'Thu', y: 300 }, { x: 'Fri', y: 200 }, { x: 'Sat', y: 350 }, { x: 'Sun', y: 120 },
];
const neat = [
  { x: 'Mon', y: 400 }, { x: 'Tue', y: 380 }, { x: 'Wed', y: 420 },
  { x: 'Thu', y: 450 }, { x: 'Fri', y: 390 }, { x: 'Sat', y: 500 }, { x: 'Sun', y: 350 },
];

const CalorieBurnArea: React.FC = () => (
  <ChartCard role="region" aria-label="Daily calorie burn stacked area chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Calorie Burn</ChartTitle>
        <ChartSubtitle>Strength / Cardio / NEAT — weekly view</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        containerComponent={<VictoryVoronoiContainer labels={({ datum }) => `${datum.x}: ${datum.y} kcal`} labelComponent={<VictoryTooltip style={victoryTheme.tooltip.style} flyoutStyle={victoryTheme.tooltip.flyoutStyle} />} />}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryStack>
          <VictoryArea animate={VICTORY_ANIMATE} data={strength} style={{ data: { fill: hexAlpha(FULL_PALETTE[1], 0.5), stroke: FULL_PALETTE[1] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={cardio} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0] } }} />
          <VictoryArea animate={VICTORY_ANIMATE} data={neat} style={{ data: { fill: hexAlpha(FULL_PALETTE[2], 0.5), stroke: FULL_PALETTE[2] } }} />
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default CalorieBurnArea;
