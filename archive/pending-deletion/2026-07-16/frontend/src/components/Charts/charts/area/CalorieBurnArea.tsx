import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryStack, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, FULL_PALETTE, hexAlpha } from '../../chartTheme';

const DEMO_STRENGTH = [
  { x: 'Mon', y: 320 }, { x: 'Tue', y: 280 }, { x: 'Wed', y: 350 },
  { x: 'Thu', y: 0 },   { x: 'Fri', y: 310 }, { x: 'Sat', y: 400 }, { x: 'Sun', y: 0 },
];
const DEMO_CARDIO = [
  { x: 'Mon', y: 180 }, { x: 'Tue', y: 250 }, { x: 'Wed', y: 150 },
  { x: 'Thu', y: 300 }, { x: 'Fri', y: 200 }, { x: 'Sat', y: 350 }, { x: 'Sun', y: 120 },
];
const DEMO_NEAT = [
  { x: 'Mon', y: 400 }, { x: 'Tue', y: 380 }, { x: 'Wed', y: 420 },
  { x: 'Thu', y: 450 }, { x: 'Fri', y: 390 }, { x: 'Sat', y: 500 }, { x: 'Sun', y: 350 },
];

interface Props {
  data?: {
    strength: Array<{ x: string; y: number }>;
    cardio: Array<{ x: string; y: number }>;
    neat: Array<{ x: string; y: number }>;
  };
}

const CalorieBurnArea: React.FC<Props> = ({ data }) => {
  const hasStrength = data?.strength && data.strength.length > 0;
  const hasCardio = data?.cardio && data.cardio.length > 0;
  const hasNeat = data?.neat && data.neat.length > 0;
  const isDemo = !hasStrength && !hasCardio && !hasNeat;

  const strengthData = hasStrength ? data.strength : DEMO_STRENGTH;
  const cardioData = hasCardio ? data.cardio : DEMO_CARDIO;
  const neatData = hasNeat ? data.neat : DEMO_NEAT;

  return (
    <ChartCard role="region" aria-label="Daily calorie burn stacked area chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Calorie Burn{isDemo ? ' (Preview)' : ''}</ChartTitle>
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
            <VictoryArea animate={VICTORY_ANIMATE} data={strengthData} style={{ data: { fill: hexAlpha(FULL_PALETTE[1], 0.5), stroke: FULL_PALETTE[1], opacity: isDemo ? 0.5 : 1 } }} />
            <VictoryArea animate={VICTORY_ANIMATE} data={cardioData} style={{ data: { fill: hexAlpha(FULL_PALETTE[0], 0.5), stroke: FULL_PALETTE[0], opacity: isDemo ? 0.5 : 1 } }} />
            <VictoryArea animate={VICTORY_ANIMATE} data={neatData} style={{ data: { fill: hexAlpha(FULL_PALETTE[2], 0.5), stroke: FULL_PALETTE[2], opacity: isDemo ? 0.5 : 1 } }} />
          </VictoryStack>
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(CalorieBurnArea);
