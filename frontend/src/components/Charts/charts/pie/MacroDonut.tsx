import React from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, MACRO_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { label: 'Protein 35%', value: 35 },
  { label: 'Carbs 40%', value: 40 },
  { label: 'Fat 25%', value: 25 },
];

const MacroDonut: React.FC = () => (
  <ChartCard role="region" aria-label="Macronutrient split donut chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Macro Split</ChartTitle>
        <ChartSubtitle>Daily macronutrient distribution</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <CenterLabel>
        <div className="value">2,150</div>
        <div className="label">cal / day</div>
      </CenterLabel>
      <VictoryPie
        data={data}
        x="label"
        y="value"
        innerRadius={80}
        colorScale={MACRO_PALETTE}
        animate={VICTORY_ANIMATE}
        labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
        style={{
          labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
          data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
        }}
      />
    </ChartContainer>
  </ChartCard>
);

export default MacroDonut;
