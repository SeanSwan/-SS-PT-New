import React from 'react';
import { VictoryChart, VictoryArea, VictoryStack, VictoryAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  victoryTheme, VICTORY_ANIMATE, STREAM_PALETTE,
} from '../../chartTheme';

const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];

const SERIES = [
  { name: 'Protein', data: [140, 155, 160, 150, 165, 170, 158, 175] },
  { name: 'Carbs',   data: [220, 200, 210, 230, 215, 205, 225, 210] },
  { name: 'Fats',    data: [65, 70, 60, 68, 72, 64, 66, 70] },
];

const toVictory = (vals: number[]) =>
  vals.map((y, i) => ({ x: WEEKS[i], y }));

const NutrientIntakeStream: React.FC = () => (
  <ChartCard role="region" aria-label="Nutrient intake stream chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Nutrient Intake</ChartTitle>
        <ChartSubtitle>Macronutrient intake (g) over 8 weeks</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart theme={victoryTheme} animate={VICTORY_ANIMATE} height={260} width={480}>
        <VictoryAxis tickValues={WEEKS} />
        <VictoryAxis dependentAxis tickFormat={(t: number) => `${t}g`} />
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

export default NutrientIntakeStream;
