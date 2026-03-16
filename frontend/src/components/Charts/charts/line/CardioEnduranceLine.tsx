import React from 'react';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 1, y: 630 }, { x: 2, y: 612 }, { x: 3, y: 594 },
  { x: 4, y: 570 }, { x: 5, y: 555 }, { x: 6, y: 540 },
  { x: 7, y: 525 }, { x: 8, y: 516 }, { x: 9, y: 504 },
  { x: 10, y: 495 },
];

const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const CardioEnduranceLine: React.FC = () => (
  <ChartCard role="region" aria-label="Cardio endurance pace improvement" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Cardio Endurance</ChartTitle>
        <ChartSubtitle>Running pace improvement (min/mile)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domain={{ y: [480, 650] }}
      >
        <VictoryAxis tickFormat={(t: number) => `Wk ${t}`} />
        <VictoryAxis dependentAxis tickFormat={fmtPace} invertAxis />
        <VictoryLine
          data={DATA}
          interpolation="monotoneX"
          style={{ data: { stroke: CHART_COLORS.arcticCyan, strokeWidth: 2.5 } }}
          labels={({ datum }: { datum: { y: number } }) => fmtPace(datum.y)}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default CardioEnduranceLine;
