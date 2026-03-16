import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 'Squat', y: 42500 },
  { x: 'Bench', y: 36200 },
  { x: 'Deadlift', y: 38800 },
  { x: 'OHP', y: 18400 },
  { x: 'Rows', y: 24600 },
  { x: 'Pullups', y: 12800 },
  { x: 'Lunges', y: 21000 },
  { x: 'Curls', y: 9500 },
];

const ExerciseComparisonBar: React.FC = () => (
  <ChartCard role="region" aria-label="Exercise comparison by total volume" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Exercise Comparison</ChartTitle>
        <ChartSubtitle>Top exercises by total volume (lbs)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        horizontal
        domainPadding={{ x: 12 }}
        padding={{ top: 20, bottom: 40, left: 70, right: 30 }}
      >
        <VictoryAxis tickFormat={(t: string) => t} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${(t / 1000).toFixed(0)}k`} />
        <VictoryBar
          data={DATA}
          style={{
            data: {
              fill: ({ datum }: { datum: { y: number } }) =>
                datum.y > 35000 ? CHART_COLORS.wingPurple : hexAlpha(CHART_COLORS.iceWing, 0.8),
            },
          }}
          cornerRadius={{ top: 3 }}
          labels={({ datum }: { datum: { y: number } }) => `${(datum.y / 1000).toFixed(1)}k`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default ExerciseComparisonBar;
