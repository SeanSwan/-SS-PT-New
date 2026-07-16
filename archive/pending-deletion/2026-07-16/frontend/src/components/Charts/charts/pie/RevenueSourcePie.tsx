import React from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, FULL_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { label: 'Packages 55%', value: 55 },
  { label: 'Subscriptions 25%', value: 25 },
  { label: 'Drop-ins 12%', value: 12 },
  { label: 'Merch 8%', value: 8 },
];

const RevenueSourcePie: React.FC = () => (
  <ChartCard role="region" aria-label="Revenue source distribution pie chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Revenue Sources</ChartTitle>
        <ChartSubtitle>Income breakdown by channel</ChartSubtitle>
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

export default RevenueSourcePie;
