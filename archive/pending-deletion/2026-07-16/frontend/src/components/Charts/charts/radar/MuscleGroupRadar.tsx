import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle, ChartContainer,
  CHART_COLORS, hexAlpha, victoryTheme, VICTORY_ANIMATE,
} from '../../chartTheme';

const DEMO_DATA = [
  { x: 0, y: 85, label: 'Chest' },
  { x: 1, y: 72, label: 'Back' },
  { x: 2, y: 92, label: 'Legs' },
  { x: 3, y: 65, label: 'Shoulders' },
  { x: 4, y: 58, label: 'Arms' },
  { x: 5, y: 78, label: 'Core' },
];

interface Props {
  data?: Array<{ x: number; y: number; label: string }>;
}

const MuscleGroupRadar: React.FC<Props> = ({ data }) => {
  const chartData = data && data.length > 0 ? data : DEMO_DATA;
  const isDemo = !data || data.length === 0;

  return (
    <ChartCard role="region" aria-label="Muscle group training distribution radar chart" tabIndex={0}>
      <ChartHeader>
        <div>
          <ChartTitle>Muscle Group Focus{isDemo ? ' (Preview)' : ''}</ChartTitle>
          <ChartSubtitle>Training distribution across 6 muscle groups (%)</ChartSubtitle>
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
            tickValues={chartData.map((d) => d.x)}
            labelPlacement="vertical"
            tickFormat={chartData.map((d) => d.label)}
            style={{
              axis: { stroke: CHART_COLORS.gridLine },
              tickLabels: { fill: CHART_COLORS.textSecondary, fontSize: 10, fontFamily: "'Sora', sans-serif" },
            }}
          />
          <VictoryArea
            data={chartData}
            style={{
              data: {
                fill: hexAlpha(CHART_COLORS.iceWing, 0.3),
                stroke: CHART_COLORS.iceWing,
                strokeWidth: 2,
                opacity: isDemo ? 0.5 : 1,
              },
            }}
          />
        </VictoryChart>
      </ChartContainer>
    </ChartCard>
  );
};

export default React.memo(MuscleGroupRadar);
