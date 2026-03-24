import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const DEMO_FAT = [
  { x: 'Mo1', y: 22 }, { x: 'Mo2', y: 20 }, { x: 'Mo3', y: 18 },
  { x: 'Mo4', y: 17 }, { x: 'Mo5', y: 15 }, { x: 'Mo6', y: 14 },
];
const DEMO_MUSCLE = [
  { x: 'Mo1', y: 38 }, { x: 'Mo2', y: 39 }, { x: 'Mo3', y: 40 },
  { x: 'Mo4', y: 41 }, { x: 'Mo5', y: 42 }, { x: 'Mo6', y: 43 },
];
const DEMO_WATER = [
  { x: 'Mo1', y: 40 }, { x: 'Mo2', y: 41 }, { x: 'Mo3', y: 42 },
  { x: 'Mo4', y: 42 }, { x: 'Mo5', y: 43 }, { x: 'Mo6', y: 43 },
];

interface Props {
  data?: {
    fat: Array<{ x: string; y: number }>;
    muscle: Array<{ x: string; y: number }>;
    water: Array<{ x: string; y: number }>;
  };
}

const BodyCompositionArea: React.FC<Props> = ({ data }) => {
  const hasFat = data?.fat && data.fat.length > 0;
  const hasMuscle = data?.muscle && data.muscle.length > 0;
  const hasWater = data?.water && data.water.length > 0;
  const isDemo = !hasFat && !hasMuscle && !hasWater;

  const fatData = hasFat ? data.fat : DEMO_FAT;
  const muscleData = hasMuscle ? data.muscle : DEMO_MUSCLE;
  const waterData = hasWater ? data.water : DEMO_WATER;

  return (
    <ChartCard role="region" aria-label="Body composition stacked area chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Body Composition{isDemo ? ' (Preview)' : ''}</ChartTitle>
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
            <VictoryArea animate={VICTORY_ANIMATE} data={fatData} style={{ data: { fill: hexAlpha(FULL_PALETTE[2], 0.5), stroke: FULL_PALETTE[2], opacity: isDemo ? 0.5 : 1 } }} />
            <VictoryArea animate={VICTORY_ANIMATE} data={muscleData} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0], opacity: isDemo ? 0.5 : 1 } }} />
            <VictoryArea animate={VICTORY_ANIMATE} data={waterData} style={{ data: { fill: hexAlpha(FULL_PALETTE[3], 0.5), stroke: FULL_PALETTE[3], opacity: isDemo ? 0.5 : 1 } }} />
          </VictoryStack>
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(BodyCompositionArea);
