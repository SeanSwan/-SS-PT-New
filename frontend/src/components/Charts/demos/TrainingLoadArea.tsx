/**
 * Chart 6: Training Load Over Time — Stacked Area Chart
 * Shows cardio / strength / flexibility load trends.
 */
import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, AREA_GRADIENT_DEFS, CHART_COLORS,
} from '../chartTheme';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const demoData = [
  {
    id: 'Strength',
    data: months.map((m, i) => ({ x: m, y: [60, 65, 72, 78, 82, 88][i] })),
  },
  {
    id: 'Cardio',
    data: months.map((m, i) => ({ x: m, y: [30, 35, 28, 32, 40, 38][i] })),
  },
  {
    id: 'Flexibility',
    data: months.map((m, i) => ({ x: m, y: [15, 18, 20, 22, 18, 25][i] })),
  },
];

const TrainingLoadArea: React.FC = () => (
  <ChartCard $span={2} $delay={400} role="region" aria-label="Stacked area chart showing training load over 6 months" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Training Load</ChartTitle>
        <ChartSubtitle>6-month breakdown by type</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveLine
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 100, bottom: 50, left: 50 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 0, max: 'auto', stacked: true }}
        curve="catmullRom"
        enableArea
        areaOpacity={0.5}
        areaBlendMode="screen"
        defs={AREA_GRADIENT_DEFS}
        fill={[
          { match: { id: 'Strength' }, id: 'gradientPurple' },
          { match: { id: 'Cardio' }, id: 'gradientCyan' },
          { match: { id: 'Flexibility' }, id: 'gradientIceWing' },
        ]}
        colors={[CHART_COLORS.wingPurple, CHART_COLORS.arcticCyan, CHART_COLORS.swanLavender]}
        lineWidth={2}
        pointSize={0}
        enableGridX={false}
        axisBottom={{ tickRotation: 0 }}
        axisLeft={{
          tickValues: 5,
          legend: 'Load Score',
          legendPosition: 'middle',
          legendOffset: -40,
        }}
        useMesh
        legends={[
          {
            anchor: 'bottom-right',
            direction: 'column',
            itemWidth: 80,
            itemHeight: 20,
            symbolSize: 10,
            symbolShape: 'circle',
            translateX: 90,
          },
        ]}
        tooltip={({ point }) => (
          <TooltipBox>
            {point.serieId} — {String(point.data.x)}
            <strong>{String(point.data.y)} pts</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default TrainingLoadArea;
