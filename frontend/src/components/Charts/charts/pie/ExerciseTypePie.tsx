import React from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, FULL_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { label: 'Strength 40%', value: 40 },
  { label: 'Cardio 25%', value: 25 },
  { label: 'HIIT 20%', value: 20 },
  { label: 'Flexibility 15%', value: 15 },
];

const ExerciseTypePie: React.FC = () => (
  <ChartCard role="region" aria-label="Exercise type distribution pie chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Exercise Types</ChartTitle>
        <ChartSubtitle>Workout modality distribution this month</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryPie
        data={data}
        x="label"
        y="value"
        colorScale={FULL_PALETTE}
        animate={VICTORY_ANIMATE}
        labelRadius={90}
        style={{
          labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
          data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
        }}
      />
    </ChartContainer>
  </ChartCard>
);

export default ExerciseTypePie;
