import React from 'react';
import { VictoryChart, VictoryBar, VictoryGroup, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryLegend } from 'victory';
import { ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer, CHART_COLORS, FULL_PALETTE, victoryTheme, VICTORY_ANIMATE } from '../../chartTheme';

const NEW_CLIENTS = [
  { x: 'Jan', y: 8 }, { x: 'Feb', y: 12 }, { x: 'Mar', y: 10 },
  { x: 'Apr', y: 14 }, { x: 'May', y: 11 }, { x: 'Jun', y: 16 },
];
const RETURNING = [
  { x: 'Jan', y: 22 }, { x: 'Feb', y: 24 }, { x: 'Mar', y: 26 },
  { x: 'Apr', y: 28 }, { x: 'May', y: 30 }, { x: 'Jun', y: 32 },
];

const ClientRetentionBar: React.FC = () => (
  <ChartCard role="region" aria-label="Client retention new vs returning" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Client Retention</ChartTitle>
        <ChartSubtitle>New vs returning clients per month</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart
        theme={victoryTheme}
        animate={VICTORY_ANIMATE}
        containerComponent={<VictoryVoronoiContainer />}
        domainPadding={{ x: 30 }}
      >
        <VictoryLegend
          x={80} y={0}
          orientation="horizontal"
          gutter={16}
          data={[
            { name: 'New', symbol: { fill: FULL_PALETTE[0] } },
            { name: 'Returning', symbol: { fill: FULL_PALETTE[1] } },
          ]}
        />
        <VictoryAxis tickFormat={(t: string) => t} />
        <VictoryAxis dependentAxis />
        <VictoryGroup offset={14}>
          <VictoryBar
            data={NEW_CLIENTS}
            style={{ data: { fill: FULL_PALETTE[0] } }}
            cornerRadius={{ top: 3 }}
            labels={({ datum }: { datum: { y: number } }) => `${datum.y}`}
            labelComponent={<VictoryTooltip />}
          />
          <VictoryBar
            data={RETURNING}
            style={{ data: { fill: FULL_PALETTE[1] } }}
            cornerRadius={{ top: 3 }}
            labels={({ datum }: { datum: { y: number } }) => `${datum.y}`}
            labelComponent={<VictoryTooltip />}
          />
        </VictoryGroup>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default ClientRetentionBar;
