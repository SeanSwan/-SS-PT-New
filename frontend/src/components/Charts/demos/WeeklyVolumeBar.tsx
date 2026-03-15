/**
 * Chart 2: Weekly Workout Volume — Bar Chart
 * Total sets × reps × weight per week.
 */
import React from 'react';
import { ResponsiveBar } from '@nivo/bar';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  { week: 'W1', volume: 24500 }, { week: 'W2', volume: 27800 },
  { week: 'W3', volume: 26200 }, { week: 'W4', volume: 31400 },
  { week: 'W5', volume: 29800 }, { week: 'W6', volume: 33600 },
  { week: 'W7', volume: 32100 }, { week: 'W8', volume: 35800 },
];

const WeeklyVolumeBar: React.FC = () => (
  <ChartCard $delay={80} role="region" aria-label="Bar chart showing weekly workout volume in pounds" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Weekly Volume</ChartTitle>
        <ChartSubtitle>Total training volume (lbs)</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveBar
        data={demoData}
        keys={['volume']}
        indexBy="week"
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
        padding={0.3}
        borderRadius={4}
        colors={[CHART_COLORS.arcticCyan]}
        axisBottom={{ tickRotation: 0 }}
        axisLeft={{
          tickValues: 5,
          format: (v) => `${(Number(v) / 1000).toFixed(0)}k`,
        }}
        enableGridY
        enableGridX={false}
        enableLabel={false}
        tooltip={({ value, indexValue }) => (
          <TooltipBox>
            {String(indexValue)}
            <strong>{Number(value).toLocaleString()} lbs</strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default WeeklyVolumeBar;
