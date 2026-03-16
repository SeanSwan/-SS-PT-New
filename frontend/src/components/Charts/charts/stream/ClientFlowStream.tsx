import React from 'react';
import { VictoryChart, VictoryArea, VictoryStack, VictoryAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  victoryTheme, VICTORY_ANIMATE, STREAM_PALETTE,
} from '../../chartTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const SERIES = [
  { name: 'New Signups', data: [15, 22, 18, 25, 20, 28] },
  { name: 'Active',      data: [40, 48, 55, 60, 65, 72] },
  { name: 'Churned',     data: [5, 8, 6, 10, 7, 9] },
];

const toVictory = (vals: number[]) =>
  vals.map((y, i) => ({ x: MONTHS[i], y }));

const ClientFlowStream: React.FC = () => (
  <ChartCard role="region" aria-label="Client flow stream chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Client Flow</ChartTitle>
        <ChartSubtitle>Acquisition and churn over months</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE} height={260} width={480}>
        <VictoryAxis tickValues={MONTHS} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
        <VictoryStack>
          {SERIES.map((s, i) => (
            <VictoryArea
              key={s.name}
              data={toVictory(s.data)}
              interpolation="natural"
              style={{ data: { fill: STREAM_PALETTE[i], fillOpacity: 0.7, stroke: STREAM_PALETTE[i], strokeWidth: 1.5 } }}
            />
          ))}
        </VictoryStack>
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default ClientFlowStream;
