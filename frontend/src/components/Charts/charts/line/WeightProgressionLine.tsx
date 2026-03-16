import React from 'react';
import { VictoryChart, VictoryLine, VictoryArea, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 1, y: 185 }, { x: 2, y: 183 }, { x: 3, y: 181 },
  { x: 4, y: 179 }, { x: 5, y: 178 }, { x: 6, y: 176 },
  { x: 7, y: 175 }, { x: 8, y: 174 }, { x: 9, y: 173 },
  { x: 10, y: 172 }, { x: 11, y: 171 }, { x: 12, y: 170 },
];

const WeightProgressionLine: React.FC = () => (
  <ChartCard role="region" aria-label="Weight progression over 12 weeks" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Weight Progression</ChartTitle>
        <ChartSubtitle>12-week body weight trend (lbs)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domain={{ y: [165, 190] }}
      >
        <VictoryAxis
          tickValues={[1, 3, 5, 7, 9, 12]}
          tickFormat={(t: number) => `Wk ${t}`}
        />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryArea
          data={DATA}
          interpolation="monotoneX"
          style={{ data: { fill: hexAlpha(CHART_COLORS.iceWing, 0.15), stroke: 'none' } }}
        />
        <VictoryLine
          data={DATA}
          interpolation="monotoneX"
          style={{ data: { stroke: CHART_COLORS.iceWing, strokeWidth: 2.5 } }}
          labels={({ datum }: { datum: { x: number; y: number } }) => `${datum.y} lbs`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default WeightProgressionLine;
