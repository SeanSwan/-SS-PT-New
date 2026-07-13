/**
 * ============================================================================
 * FILE: SessionIntensityChart.tsx
 * PURPOSE: Scatter plot of session duration vs intensity with volume sizing
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Each dot is a workout session — x=duration, y=intensity,
 * bubble size=volume. Shows the sweet spot and identifies sessions that were
 * too long/easy or too short/hard. Ideal quadrant: moderate duration + high intensity.
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → SessionIntensityChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart, VictoryScatter, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer,
} from 'victory';
import { SessionIntensityChartProps } from '../types/ClientProgressTypes';
import { DETAILED_AXIS_STYLE as AXIS_STYLE } from './detailedChartTheme';

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;
  @media (max-width: 768px) { height: 250px; }
`;

const NoData = styled.div`
  display: flex; align-items: center; justify-content: center;
  height: 300px; color: #b8c9db; text-align: center;
  font-family: 'Sora', sans-serif; font-size: 0.875rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const SessionIntensityChart: React.FC<SessionIntensityChartProps> = ({
  data, animate = true, className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const maxVol = Math.max(...data.map(d => d.totalVolume || 1));
    return data.map(d => ({
      x: d.duration,
      y: d.intensity,
      size: Math.max(3, Math.min(12, (d.totalVolume / maxVol) * 12)),
      volume: d.totalVolume,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      title: d.sessionTitle || 'Workout',
    }));
  }, [data]);

  if (!data || data.length === 0) {
    return <NoData>Complete workouts to see your session intensity map</NoData>;
  }

  return (
    <motion.div className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 20, right: 30, left: 60, bottom: 50 }}
          domain={{ y: [0, 11] }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) =>
                `${datum.title}\n${datum.displayDate}\n${datum.x} min | Intensity: ${datum.y}/10\nVolume: ${datum.volume.toLocaleString()} lbs`
              }
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)', strokeWidth: 1 }}
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  cornerRadius={8}
                  flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                />
              }
            />
          }
        >
          <VictoryAxis style={{
            ...AXIS_STYLE,
            axisLabel: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 35 },
          }} label="Duration (min)" />
          <VictoryAxis dependentAxis style={{
            ...AXIS_STYLE,
            axisLabel: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 40 },
          }} label="Intensity (1-10)" />

          <VictoryScatter
            data={chartData}
            bubbleProperty="size"
            style={{
              data: {
                fill: ({ datum }) => {
                  // Color by intensity: cool → warm
                  if (datum.y <= 3) return '#50A0F0';
                  if (datum.y <= 6) return '#60C0F0';
                  if (datum.y <= 8) return '#8B5CF6';
                  return '#C6A84B';
                },
                stroke: 'rgba(224, 236, 244, 0.3)',
                strokeWidth: 1,
                opacity: 0.85,
              },
            }}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default SessionIntensityChart;
