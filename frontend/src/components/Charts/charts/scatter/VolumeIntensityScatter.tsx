import React from 'react';
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS } from '../../chartTheme';

const data = [
  { x: 1200, y: 5.5 }, { x: 1800, y: 6.2 }, { x: 2100, y: 6.8 }, { x: 2500, y: 7.1 },
  { x: 2800, y: 7.5 }, { x: 3100, y: 7.8 }, { x: 3400, y: 8.2 }, { x: 1500, y: 5.8 },
  { x: 3800, y: 8.6 }, { x: 4200, y: 9.0 }, { x: 4500, y: 9.3 }, { x: 1000, y: 5.2 },
  { x: 4800, y: 9.7 }, { x: 3600, y: 8.4 }, { x: 2300, y: 7.0 },
];

const VolumeIntensityScatter: React.FC = () => (
  <ChartCard role="region" aria-label="Volume vs Intensity scatter chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Volume vs Intensity</ChartTitle>
        <ChartSubtitle>Training load per session (RPE)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryAxis label="Volume (lbs)" />
        <VictoryAxis dependentAxis label="RPE" />
        <VictoryScatter
          data={data}
          size={6}
          style={{ data: { fill: CHART_COLORS.iceWing, opacity: 0.8 } }}
          labels={({ datum }) => `${datum.x} lbs @ RPE ${datum.y}`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default VolumeIntensityScatter;
