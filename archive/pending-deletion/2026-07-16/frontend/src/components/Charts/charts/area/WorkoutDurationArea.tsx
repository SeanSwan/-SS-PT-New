import React from 'react';
import { VictoryChart, VictoryArea, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS, hexAlpha } from '../../chartTheme';

const data = [
  { x: 'Wk1', y: 48 }, { x: 'Wk2', y: 52 }, { x: 'Wk3', y: 55 }, { x: 'Wk4', y: 50 },
  { x: 'Wk5', y: 58 }, { x: 'Wk6', y: 62 }, { x: 'Wk7', y: 65 }, { x: 'Wk8', y: 60 },
  { x: 'Wk9', y: 70 }, { x: 'Wk10', y: 72 },
];

const WorkoutDurationArea: React.FC = () => (
  <ChartCard role="region" aria-label="Workout duration area chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Session Duration</ChartTitle>
        <ChartSubtitle>Average minutes per workout — 10 weeks</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        containerComponent={<VictoryVoronoiContainer labels={({ datum }) => `${datum.x}: ${datum.y} min`} labelComponent={<VictoryTooltip style={victoryTheme.tooltip.style} flyoutStyle={victoryTheme.tooltip.flyoutStyle} />} />}
      >
        <VictoryAxis />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}m`} />
        <VictoryArea
          animate={VICTORY_ANIMATE}
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.iceWing, 0.25),
              stroke: CHART_COLORS.iceWing,
              strokeWidth: 2.5,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default WorkoutDurationArea;
