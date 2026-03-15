/**
 * Chart 10: Goal Progress — Bullet Chart
 * Horizontal progress bars for fitness goals with targets.
 */
import React from 'react';
import { ResponsiveBullet } from '@nivo/bullet';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const demoData = [
  {
    id: 'Bench PR',
    ranges: [0, 185, 225, 275],
    measures: [245],
    markers: [225],
  },
  {
    id: 'Squat PR',
    ranges: [0, 225, 315, 405],
    measures: [365],
    markers: [315],
  },
  {
    id: 'Deadlift PR',
    ranges: [0, 275, 365, 455],
    measures: [405],
    markers: [365],
  },
  {
    id: 'Body Fat %',
    ranges: [0, 20, 15, 10],
    measures: [14],
    markers: [12],
  },
  {
    id: 'Weekly Sessions',
    ranges: [0, 3, 4, 6],
    measures: [5],
    markers: [4],
  },
];

const GoalProgressBullet: React.FC = () => (
  <ChartCard $span={2} $delay={720} role="region" aria-label="Bullet charts showing progress toward fitness goals" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Goal Progress</ChartTitle>
        <ChartSubtitle>Current performance vs targets</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveBullet
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 10, right: 30, bottom: 30, left: 110 }}
        spacing={36}
        titleAlign="start"
        titleOffsetX={-100}
        rangeColors={[
          'rgba(64, 112, 192, 0.15)',
          'rgba(64, 112, 192, 0.25)',
          'rgba(64, 112, 192, 0.1)',
        ]}
        measureColors={[CHART_COLORS.iceWing]}
        markerColors={[CHART_COLORS.gildedFern]}
        measureSize={0.4}
        markerSize={0.8}
      />
    </ChartContainer>
  </ChartCard>
);

export default GoalProgressBullet;
