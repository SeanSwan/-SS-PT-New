import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

const data = [
  { x: 0, y: 88 },
  { x: 1, y: 76 },
  { x: 2, y: 92 },
  { x: 3, y: 54 },
  { x: 4, y: 81 },
];

const ClientEngagementRadar: React.FC = () => (
  <ChartCard role="region" aria-label="Client engagement metrics radar chart" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Client Engagement</ChartTitle>
        <ChartSubtitle>Five engagement pillars (0-100 score)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <VictoryChart polar theme={victoryTheme} animate={VICTORY_ANIMATE} domain={{ y: [0, 100] }}>
        <VictoryPolarAxis
          dependentAxis
          style={{ axis: { stroke: 'none' }, grid: { stroke: CHART_COLORS.gridLine } }}
          tickFormat={() => ''}
        />
        <VictoryPolarAxis
          tickValues={[0, 1, 2, 3, 4]}
          labelPlacement="vertical"
          tickFormat={['Attendance', 'Completion', 'Feedback', 'Social', 'Goals']}
          style={{
            axis: { stroke: CHART_COLORS.gridLine },
            tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
          }}
        />
        <VictoryArea
          data={data}
          style={{
            data: {
              fill: hexAlpha(CHART_COLORS.gildedFern, 0.3),
              stroke: CHART_COLORS.gildedFern,
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartContainer>
  </ChartCard>
);

export default ClientEngagementRadar;
