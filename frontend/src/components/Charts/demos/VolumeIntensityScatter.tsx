/**
 * Chart 9: Volume vs Intensity — Scatter Plot
 * Correlates total volume with RPE/intensity per session.
 * PR sessions highlighted with gold rings.
 */
import React from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  {
    id: 'Sessions',
    data: [
      { x: 18000, y: 6.5 }, { x: 22000, y: 7.0 }, { x: 25000, y: 7.5 },
      { x: 20000, y: 8.0 }, { x: 28000, y: 7.2 }, { x: 32000, y: 8.5 },
      { x: 15000, y: 5.5 }, { x: 35000, y: 9.0 }, { x: 30000, y: 8.0 },
      { x: 24000, y: 6.8 }, { x: 27000, y: 7.8 }, { x: 38000, y: 9.2 },
      { x: 19000, y: 6.0 }, { x: 33000, y: 8.8 }, { x: 26000, y: 7.4 },
    ],
  },
  {
    id: 'PRs',
    data: [
      { x: 35000, y: 9.0 }, { x: 38000, y: 9.2 },
    ],
  },
];

const VolumeIntensityScatter: React.FC = () => (
  <ChartCard $delay={640} role="region" aria-label="Scatter plot showing volume versus intensity correlation" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Volume vs Intensity</ChartTitle>
        <ChartSubtitle>Gold = Personal Records</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveScatterPlot
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 20, bottom: 50, left: 60 }}
        xScale={{ type: 'linear', min: 10000, max: 42000 }}
        yScale={{ type: 'linear', min: 5, max: 10 }}
        nodeSize={10}
        blendMode="lighten"
        colors={[CHART_COLORS.iceWing, CHART_COLORS.gildedFern]}
        axisBottom={{
          legend: 'Volume (lbs)',
          legendPosition: 'middle',
          legendOffset: 40,
          format: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
        }}
        axisLeft={{
          legend: 'RPE',
          legendPosition: 'middle',
          legendOffset: -45,
        }}
        tooltip={({ node }) => (
          <TooltipBox>
            {node.serieId === 'PRs' ? '🏆 Personal Record' : 'Session'}
            <strong>{(Number(node.data.x) / 1000).toFixed(1)}k lbs @ RPE {String(node.data.y)}</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default VolumeIntensityScatter;
