/**
 * ============================================================================
 * FILE: ExerciseFrequencyChart.tsx
 * PURPOSE: Horizontal bar chart showing most-programmed exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows which exercises are done most vs least frequently.
 * Helps trainers identify programming gaps — are you hitting all movement
 * patterns evenly? Are corrective exercises being skipped?
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → ExerciseFrequencyChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart, VictoryBar, VictoryAxis,
  VictoryTooltip,
} from 'victory';
import { ExerciseFrequencyChartProps } from '../types/ClientProgressTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 350px;
  @media (max-width: 768px) { height: 300px; }
`;

const NoData = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 300px; color: #b8c9db; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
`;

const AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 10, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Color scale by rank
// ─────────────────────────────────────────────────────────────

const BAR_COLORS = [
  '#C6A84B', '#8B5CF6', '#60C0F0', '#50A0F0', '#4070C0',
  '#C6A84B', '#8B5CF6', '#60C0F0', '#50A0F0', '#4070C0',
  '#C6A84B', '#8B5CF6', '#60C0F0', '#50A0F0', '#4070C0',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const ExerciseFrequencyChart: React.FC<ExerciseFrequencyChartProps> = ({
  data, maxItems = 12, animate = true, className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems)
      .reverse() // reverse so highest is at top in horizontal bar
      .map((d, i) => ({
        x: i + 1,
        y: d.count,
        exercise: d.exercise.length > 20 ? d.exercise.slice(0, 18) + '…' : d.exercise,
        fullName: d.exercise,
        muscleGroup: d.muscleGroup || 'General',
      }));
  }, [data, maxItems]);

  if (!data || data.length === 0) {
    return <NoData>Complete workouts to see your exercise frequency</NoData>;
  }

  return (
    <motion.div className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <ChartContainer>
        <VictoryChart
          horizontal
          padding={{ top: 20, right: 40, left: 130, bottom: 40 }}
          domainPadding={{ x: 15 }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
        >
          <VictoryAxis style={{
            ...AXIS_STYLE,
            tickLabels: { ...AXIS_STYLE.tickLabels, textAnchor: 'end', fontSize: 10 },
          }}
            tickValues={chartData.map(d => d.x)}
            tickFormat={chartData.map(d => d.exercise)}
          />
          <VictoryAxis dependentAxis style={AXIS_STYLE} />

          <VictoryBar data={chartData}
            style={{
              data: {
                fill: ({ index }) => BAR_COLORS[(index as number) % BAR_COLORS.length],
                opacity: 0.85,
                width: 14,
              },
            }}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{ fill: '#141419', stroke: 'rgba(96, 192, 240, 0.3)' }}
                style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                cornerRadius={8}
                flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
              />
            }
            labels={({ datum }) => `${datum.fullName}\n${datum.y} times\n${datum.muscleGroup}`}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default ExerciseFrequencyChart;
