import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 1, y: 28 }, { x: 2, y: 26.5 }, { x: 3, y: 25.2 },
  { x: 4, y: 24.1 }, { x: 5, y: 23 }, { x: 6, y: 22 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const BodyFatTrendLine: React.FC = () => (
  <ChartCard role="region" aria-label="Body fat percentage trend over 6 months" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Body Fat Trend</ChartTitle>
        <ChartSubtitle>Body fat % decline over training period</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domain={{ y: [18, 32] }}
      >
        <VictoryAxis tickValues={[1, 2, 3, 4, 5, 6]} tickFormat={(t: number) => MONTHS[t - 1]} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}%`} />
        <VictoryArea
          data={DATA}
          interpolation="monotoneX"
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.wingPurple, 0.2),
              stroke: CHART_COLORS.wingPurple,
              strokeWidth: 2.5,
            },
          }}
          labels={({ datum }: { datum: { y: number } }) => `${datum.y}%`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default BodyFatTrendLine;
