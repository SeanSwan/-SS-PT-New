import React from 'react';
import { VictoryChart, VictoryBar, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, hexAlpha, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const DATA = [
  { x: 'Marcus', y: 28 },
  { x: 'Aisha', y: 24 },
  { x: 'Derek', y: 30 },
  { x: 'Elena', y: 19 },
  { x: 'Jordan', y: 22 },
];

const TrainerWorkloadBar: React.FC = () => (
  <ChartCard role="region" aria-label="Trainer workload sessions per week" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Trainer Workload</ChartTitle>
        <ChartSubtitle>Sessions per trainer this week</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domainPadding={{ x: 30 }}
      >
        <VictoryAxis tickFormat={(t: string) => t} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryBar
          data={DATA}
          style={{
            data: {
              fill: ({ datum }: { datum: { y: number } }) =>
                datum.y >= 28 ? CHART_COLORS.wingPurple : CHART_COLORS.iceWing,
            },
          }}
          cornerRadius={{ top: 4 }}
          labels={({ datum }: { datum: { y: number } }) => `${datum.y} sessions`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default TrainerWorkloadBar;
