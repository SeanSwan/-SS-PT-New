import React from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, FULL_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { label: '18-25 (15%)', value: 15 },
  { label: '26-35 (35%)', value: 35 },
  { label: '36-45 (28%)', value: 28 },
  { label: '46-55 (15%)', value: 15 },
  { label: '55+ (7%)', value: 7 },
];

const ClientDemographicsPie: React.FC = () => (
  <ChartCard role="region" aria-label="Client demographics by age group donut chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Client Demographics</ChartTitle>
        <ChartSubtitle>Age group distribution across active clients</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <CenterLabel>
        <div className="value">247</div>
        <div className="label">clients</div>
      </CenterLabel>
      <VictoryPie
        data={data}
        x="label"
        y="value"
        innerRadius={80}
        colorScale={FULL_PALETTE}
        animate={VICTORY_ANIMATE}
        labelRadius={({ innerRadius }) => (innerRadius as number) + 30}
        style={{
          labels: { fill: CHART_COLORS.frostWhite, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
        }}
      />
    </ChartContainer>
  </ChartCard>
);

export default ClientDemographicsPie;
