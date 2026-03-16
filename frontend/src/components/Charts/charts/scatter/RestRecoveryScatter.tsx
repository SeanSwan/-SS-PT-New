import React from 'react';
import { VictoryChart, VictoryScatter, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, victoryTheme, VICTORY_ANIMATE, CHART_COLORS } from '../../chartTheme';

const data = [
  { x: 4.0, y: 42 }, { x: 4.5, y: 48 }, { x: 5.0, y: 55 }, { x: 5.5, y: 60 },
  { x: 6.0, y: 65 }, { x: 6.5, y: 72 }, { x: 7.0, y: 78 }, { x: 7.5, y: 82 },
  { x: 8.0, y: 86 }, { x: 8.5, y: 90 }, { x: 9.0, y: 92 }, { x: 10.0, y: 95 },
];

const RestRecoveryScatter: React.FC = () => (
  <ChartCard role="region" aria-label="Rest time vs recovery quality scatter chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Rest vs Recovery</ChartTitle>
        <ChartSubtitle>Sleep hours correlated with recovery quality score</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
      >
        <VictoryAxis label="Rest (hrs)" />
        <VictoryAxis dependentAxis label="Recovery" />
        <VictoryScatter
          data={data}
          size={6}
          style={{ data: { fill: CHART_COLORS.wingPurple, opacity: 0.8 } }}
          labels={({ datum }) => `${datum.x}h → ${datum.y}/100`}
          labelComponent={<VictoryTooltip />}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default RestRecoveryScatter;
