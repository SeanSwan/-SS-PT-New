/**
 * Chart 5: Workout Consistency — Heatmap Calendar
 * GitHub-style activity grid showing workout days per week.
 */
import React from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import {
  ChartCard, ChartHeader, ChartTitle, ChartSubtitle,
  ChartContainer, TooltipBox, nivoCrystallineTheme,
  NIVO_MOTION, CHART_COLORS,
} from '../chartTheme';

const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// 0 = rest, 1 = light, 2 = moderate, 3 = intense
const patterns = [
  [3, 0, 2, 0, 3, 1, 0],
  [3, 0, 3, 0, 2, 0, 0],
  [2, 0, 3, 0, 3, 2, 0],
  [3, 1, 2, 0, 3, 0, 0],
  [3, 0, 3, 1, 2, 0, 0],
  [2, 0, 3, 0, 3, 1, 1],
  [3, 0, 2, 0, 3, 2, 0],
  [3, 1, 3, 0, 3, 0, 0],
];

const demoData = weeks.map((week, wi) => ({
  id: week,
  data: days.map((day, di) => ({
    x: day,
    y: patterns[wi][di],
  })),
}));

const WorkoutHeatmap: React.FC = () => (
  <ChartCard $span={2} $delay={320} role="region" aria-label="Heatmap showing workout consistency over 8 weeks" tabIndex={0}>
    <ChartHeader>
      <div>
        <ChartTitle>Workout Consistency</ChartTitle>
        <ChartSubtitle>8-week activity heatmap</ChartSubtitle>
      </div>
    </ChartHeader>
    <ChartContainer>
      <ResponsiveHeatMap
        data={demoData}
        theme={nivoCrystallineTheme}
        animate
        motionConfig={NIVO_MOTION}
        margin={{ top: 30, right: 10, bottom: 10, left: 40 }}
        valueFormat=">-.0f"
        colors={[
          'rgba(64, 112, 192, 0.4)',
          'rgba(80, 144, 216, 0.6)',
          'rgba(96, 192, 240, 0.8)',
          CHART_COLORS.iceWing,
        ]}
        emptyColor="rgba(64, 112, 192, 0.05)"
        borderRadius={4}
        borderWidth={2}
        borderColor="rgba(0, 32, 96, 0.6)"
        enableLabels={false}
        tooltip={({ cell }) => (
          <TooltipBox>
            {cell.serieId} — {String(cell.data.x)}
            <strong>
              {cell.value === 0 ? 'Rest Day' :
               cell.value === 1 ? 'Light' :
               cell.value === 2 ? 'Moderate' : 'Intense'}
            </strong>
          </TooltipBox>
        )}
      />
    </ChartContainer>
  </ChartCard>
);

export default WorkoutHeatmap;
