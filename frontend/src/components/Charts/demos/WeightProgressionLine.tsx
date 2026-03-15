/**
 * Chart 1: Weight Progression — Line Chart
 * Tracks a client's weight over time with gradient area fill.
 */
import React from 'react';
import { ResponsiveLine } from '@nivo/line';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, AREA_GRADIENT_DEFS, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  {
    id: 'Weight (lbs)',
    data: [
      { x: 'Week 1', y: 185 }, { x: 'Week 2', y: 183 },
      { x: 'Week 3', y: 182 }, { x: 'Week 4', y: 180 },
      { x: 'Week 5', y: 179 }, { x: 'Week 6', y: 177 },
      { x: 'Week 7', y: 176 }, { x: 'Week 8', y: 175 },
      { x: 'Week 9', y: 174 }, { x: 'Week 10', y: 172 },
      { x: 'Week 11', y: 171 }, { x: 'Week 12', y: 170 },
    ],
  },
];

const WeightProgressionLine: React.FC = () => (
  <ChartCard $span={2} $delay={0} role="region" aria-label="Line chart showing weight progression over 12 weeks" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Weight Progression</ChartTitle>
        <ChartSubtitle>12-week trend — down 15 lbs</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveLine
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 20, bottom: 50, left: 50 }}
        xScale={{ type: 'point' }}
        yScale={{ type: 'linear', min: 165, max: 190, stacked: false }}
        curve="monotoneX"
        enableArea
        areaOpacity={1}
        defs={AREA_GRADIENT_DEFS}
        fill={[{ match: '*', id: 'gradientIceWing' }]}
        colors={[CHART_COLORS.iceWing]}
        lineWidth={3}
        pointSize={8}
        pointColor={CHART_COLORS.midnightSapphire}
        pointBorderWidth={2}
        pointBorderColor={CHART_COLORS.iceWing}
        enableGridX={false}
        axisBottom={{
          tickRotation: -45,
          legendOffset: 40,
        }}
        axisLeft={{
          tickValues: 5,
          legend: 'lbs',
          legendPosition: 'middle',
          legendOffset: -40,
        }}
        useMesh
        crosshairType="bottom-left"
        tooltip={({ point }) => (
          <TooltipBox>
            {String(point.data.x)}
            <strong>{String(point.data.y)} lbs</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default WeightProgressionLine;
