import React from 'react';
import { VictoryChart, VictoryArea, VictoryStack, VictoryAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  victoryTheme, VICTORY_ANIMATE, STREAM_PALETTE,
} from '../../chartTheme';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const SERIES = [
  { name: 'Strength', data: [18, 22, 20, 25, 28, 26] },
  { name: 'Cardio',   data: [14, 12, 16, 13, 15, 18] },
  { name: 'Flexibility', data: [6, 8, 10, 9, 7, 11] },
  { name: 'HIIT',     data: [10, 8, 12, 14, 11, 9] },
];

const toVictory = (vals: number[]) =>
  vals.map((y, i) => ({ x: MONTHS[i], y }));

const ExerciseFrequencyStream: React.FC = () => (
  <ChartCard role="region" aria-label="Exercise frequency stream chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Exercise Frequency</ChartTitle>
        <ChartSubtitle>Category popularity over 6 months</ChartSubtitle>
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

export default ExerciseFrequencyStream;
