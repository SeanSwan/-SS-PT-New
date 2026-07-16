import React from 'react';
import { VictoryPie } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CenterLabel, CHART_COLORS, FULL_PALETTE, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { label: 'Personal 45%', value: 45 },
  { label: 'Group 25%', value: 25 },
  { label: 'Virtual 20%', value: 20 },
  { label: 'Assessment 10%', value: 10 },
];

const SessionTypeDonut: React.FC = () => (
  <ChartCard role="region" aria-label="Session type breakdown donut chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Session Types</ChartTitle>
        <ChartSubtitle>Breakdown by training format this quarter</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <CenterLabel>
        <div className="value">120</div>
        <div className="label">sessions</div>
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
          labels: { fill: CHART_COLORS.frostWhite, fontSize: 11, fontFamily: "'Sora', sans-serif" },
          data: { stroke: CHART_COLORS.midnightSapphire, strokeWidth: 2 },
        }}
      />
    </ChartContainer>
  </ChartCard>
);

export default SessionTypeDonut;
