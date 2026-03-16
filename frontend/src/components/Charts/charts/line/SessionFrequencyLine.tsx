import React from 'react';
import { VictoryChart, VictoryLine, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const DATA = [
  { x: 1, y: 2.5 }, { x: 2, y: 3.2 }, { x: 3, y: 2.8 },
  { x: 4, y: 4.1 }, { x: 5, y: 3.6 }, { x: 6, y: 4.8 },
];

const SessionFrequencyLine: React.FC = () => (
  <ChartCard role="region" aria-label="Session frequency over 6 months" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Session Frequency</ChartTitle>
        <ChartSubtitle>Average sessions per week by month</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domain={{ y: [0, 6] }}
      >
        <VictoryAxis tickValues={[1, 2, 3, 4, 5, 6]} tickFormat={(t: number) => MONTHS[t - 1]} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryLine
          data={DATA}
          interpolation="monotoneX"
          style={{ data: { stroke: CHART_COLORS.wingPurple, strokeWidth: 2.5 } }}
        />
        <VictoryScatter
          data={DATA}
          size={5}
          style={{ data: { fill: CHART_COLORS.wingPurple, stroke: CHART_COLORS.frostWhite, strokeWidth: 2 } }}
          labels={({ datum }: { datum: { y: number } }) => `${datum.y}/wk`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default SessionFrequencyLine;
