import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 'Wk 1', y: 12200 }, { x: 'Wk 2', y: 13500 },
  { x: 'Wk 3', y: 14100 }, { x: 'Wk 4', y: 13800 },
  { x: 'Wk 5', y: 15200 }, { x: 'Wk 6', y: 16400 },
  { x: 'Wk 7', y: 17100 }, { x: 'Wk 8', y: 18000 },
];

const WeeklyVolumeBar: React.FC = () => (
  <ChartCard role="region" aria-label="Weekly training volume in pounds" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Weekly Volume</ChartTitle>
        <ChartSubtitle>Total volume per week (sets x reps x weight)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domainPadding={{ x: 20 }}
      >
        <VictoryAxis tickFormat={(t: string) => t} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${(t / 1000).toFixed(0)}k`} />
        <VictoryBar
          data={DATA}
          style={{ data: { fill: CHART_COLORS.iceWing } }}
          cornerRadius={{ top: 4 }}
          labels={({ datum }: { datum: { y: number } }) => `${(datum.y / 1000).toFixed(1)}k lbs`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default WeeklyVolumeBar;
