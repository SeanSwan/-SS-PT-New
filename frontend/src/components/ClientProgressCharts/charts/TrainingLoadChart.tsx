/**
 * ============================================================================
 * FILE: TrainingLoadChart.tsx
 * PURPOSE: Weekly training tonnage area chart with rolling average overlay
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Plots weekly tonnage (weight × reps) as a filled area
 * with a 4-week rolling average line. THE chart every trainer watches to manage
 * periodization cycles, deload weeks, and overtraining risk.
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → TrainingLoadChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart, VictoryArea, VictoryLine, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer, VictoryScatter,
} from 'victory';
import { TrainingLoadChartProps } from '../types/ClientProgressTypes';

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
// SECTION: Constants
// ─────────────────────────────────────────────────────────────

const AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const TrainingLoadChart: React.FC<TrainingLoadChartProps> = ({
  data, animate = true, className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => ({
      x: i,
      y: d.tonnage,
      week: d.week,
      sessions: d.sessions,
      avgIntensity: d.avgIntensity,
    }));
  }, [data]);

  // 4-week rolling average
  const rollingAvg = useMemo(() => {
    if (chartData.length < 2) return [];
    const window = 4;
    return chartData.map((d, i) => {
      const start = Math.max(0, i - window + 1);
      const slice = chartData.slice(start, i + 1);
      const avg = slice.reduce((s, p) => s + p.y, 0) / slice.length;
      return { x: d.x, y: Math.round(avg) };
    });
  }, [chartData]);

  if (!data || data.length === 0) {
    return <NoData>Complete workouts to see your training load trend</NoData>;
  }

  return (
    <motion.div className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 20, right: 30, left: 70, bottom: 50 }}
          domainPadding={{ y: [0, 10] }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) =>
                `${datum.week}\n${datum.y.toLocaleString()} lbs\n${datum.sessions} sessions\nIntensity: ${datum.avgIntensity}/10`
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
          <defs>
            <linearGradient id="trainingLoadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.7} />
              <stop offset="50%" stopColor="#60C0F0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#002060" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          <VictoryAxis style={AXIS_STYLE}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.week)}
          />
          <VictoryAxis dependentAxis style={{
            ...AXIS_STYLE,
            axisLabel: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 50 },
          }} label="Weekly Tonnage (lbs)" />

          <VictoryArea data={chartData} interpolation="monotoneX"
            style={{ data: { fill: 'url(#trainingLoadGrad)', stroke: '#8B5CF6', strokeWidth: 2 } }}
          />

          {rollingAvg.length > 0 && (
            <VictoryLine data={rollingAvg} interpolation="monotoneX"
              style={{ data: { stroke: '#C6A84B', strokeWidth: 2, strokeDasharray: '6,4', opacity: 0.8 } }}
            />
          )}
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default TrainingLoadChart;
