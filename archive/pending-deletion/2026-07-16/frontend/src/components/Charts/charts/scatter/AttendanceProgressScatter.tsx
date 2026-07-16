import React from 'react';
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS } from '../../chartTheme';

const data = [
  { x: 52, y: 2.1 }, { x: 58, y: 3.5 }, { x: 65, y: 5.2 }, { x: 70, y: 6.0 },
  { x: 75, y: 7.8 }, { x: 78, y: 8.5 }, { x: 82, y: 9.2 }, { x: 88, y: 11.0 },
  { x: 90, y: 12.3 }, { x: 94, y: 13.1 }, { x: 97, y: 14.2 }, { x: 100, y: 14.8 },
];

const AttendanceProgressScatter: React.FC = () => (
  <ChartCard role="region" aria-label="Attendance vs fitness score improvement scatter chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Attendance vs Progress</ChartTitle>
        <ChartSubtitle>Attendance rate correlated with fitness score gains</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryAxis label="Attendance %" />
        <VictoryAxis dependentAxis label="Score Δ" />
        <VictoryScatter
          data={data}
          size={6}
          style={{ data: { fill: CHART_COLORS.wingPurple, opacity: 0.8 } }}
          labels={({ datum }) => `${datum.x}% → +${datum.y} pts`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default AttendanceProgressScatter;
