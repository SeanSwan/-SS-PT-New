import React from 'react';
import { VictoryChart, VictoryArea, VictoryStack, VictoryAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  victoryTheme, VICTORY_ANIMATE, STREAM_PALETTE,
} from '../../chartTheme';

const WEEKS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);

const DEMO_SERIES = [
  { name: 'Hypertrophy', data: [8, 9, 8, 6, 4, 3, 2, 2, 3, 5, 7, 3] },
  { name: 'Strength',    data: [3, 4, 5, 7, 8, 9, 8, 6, 4, 3, 2, 2] },
  { name: 'Power',       data: [1, 1, 2, 3, 4, 5, 7, 8, 9, 8, 5, 2] },
  { name: 'Deload',      data: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 8] },
];

const toVictory = (vals: number[]) =>
  vals.map((y, i) => ({ x: WEEKS[i], y }));

interface Props {
  data?: Array<{ name: string; data: number[] }>;
}

const TrainingPhaseStream: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_SERIES;
  const isDemo = !data || data.length === 0;

  return (
    <ChartCard role="region" aria-label="Training phase stream chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Training Phases{isDemo ? ' (Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Periodization focus shift over 12 weeks</ChartSubtitle>
        </div>
      </ChartHeader>
      <ChartContainer>
        <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE} height={260} width={480}>
          <VictoryAxis tickValues={WEEKS.filter((_, i) => i % 2 === 0)} />
          <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}`} />
          <VictoryStack>
            {chartData.map((s, i) => (
              <VictoryArea
                key={s.name}
                data={toVictory(s.data)}
                interpolation="natural"
                style={{ data: { fill: STREAM_PALETTE[i], fillOpacity: 0.7, stroke: STREAM_PALETTE[i], strokeWidth: 1.5, opacity: isDemo ? 0.5 : 1 } }}
              />
            ))}
          </VictoryStack>
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(TrainingPhaseStream);
