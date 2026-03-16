import React from 'react';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryLegend } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const BENCH = [
  { x: 1, y: 135 }, { x: 2, y: 145 }, { x: 3, y: 155 }, { x: 4, y: 165 },
  { x: 5, y: 175 }, { x: 6, y: 185 }, { x: 7, y: 190 }, { x: 8, y: 195 },
];
const SQUAT = [
  { x: 1, y: 185 }, { x: 2, y: 200 }, { x: 3, y: 215 }, { x: 4, y: 230 },
  { x: 5, y: 245 }, { x: 6, y: 260 }, { x: 7, y: 275 }, { x: 8, y: 285 },
];
const DEADLIFT = [
  { x: 1, y: 225 }, { x: 2, y: 245 }, { x: 3, y: 265 }, { x: 4, y: 280 },
  { x: 5, y: 295 }, { x: 6, y: 315 }, { x: 7, y: 330 }, { x: 8, y: 345 },
];

const StrengthProgressionLine: React.FC = () => (
  <ChartCard role="region" aria-label="Strength progression for major lifts" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Strength Progression</ChartTitle>
        <ChartSubtitle>1RM estimates over 8 months (lbs)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryLegend
          x={60} y={0}
          orientation="horizontal"
          gutter={16}
          data={[
            { name: 'Bench', symbol: { fill: FULL_PALETTE[0] } },
            { name: 'Squat', symbol: { fill: FULL_PALETTE[1] } },
            { name: 'Deadlift', symbol: { fill: FULL_PALETTE[2] } },
          ]}
        />
        <VictoryAxis tickFormat={(t: number) => `Mo ${t}`} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryLine data={BENCH} interpolation="monotoneX" style={{ data: { stroke: FULL_PALETTE[0] } }} labels={({ datum }: { datum: { y: number } }) => `${datum.y}`} labelComponent={<VictoryTooltip />} />
        <VictoryLine data={SQUAT} interpolation="monotoneX" style={{ data: { stroke: FULL_PALETTE[1] } }} labels={({ datum }: { datum: { y: number } }) => `${datum.y}`} labelComponent={<VictoryTooltip />} />
        <VictoryLine data={DEADLIFT} interpolation="monotoneX" style={{ data: { stroke: FULL_PALETTE[2] } }} labels={({ datum }: { datum: { y: number } }) => `${datum.y}`} labelComponent={<VictoryTooltip />} />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default StrengthProgressionLine;
