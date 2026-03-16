import React from 'react';
import { VictoryChart, VictoryArea, VictoryStack, VictoryAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  victoryTheme, VICTORY_ANIMATE, STREAM_PALETTE,
} from '../../chartTheme';

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const SERIES = [
  { name: 'Mood',       data: [5, 6, 6, 7, 7, 8, 7, 8] },
  { name: 'Energy',     data: [4, 5, 6, 5, 7, 6, 8, 7] },
  { name: 'Motivation', data: [6, 5, 7, 6, 8, 7, 8, 9] },
];

const toVictory = (vals: number[]) =>
  vals.map((y, i) => ({ x: WEEKS[i], y }));

const MoodEnergyStream: React.FC = () => (
  <ChartCard role="region" aria-label="Mood and energy stream chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Mood &amp; Energy</ChartTitle>
        <ChartSubtitle>Pre/post workout levels over 8 weeks</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE} height={260} width={480}>
        <VictoryAxis tickValues={WEEKS} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} domain={[0, 10]} />
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

export default MoodEnergyStream;
