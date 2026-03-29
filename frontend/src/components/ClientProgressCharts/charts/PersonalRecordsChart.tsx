/**
 * ============================================================================
 * FILE: PersonalRecordsChart.tsx
 * PURPOSE: Timeline scatter chart plotting every personal record achievement
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Every PR plotted on a timeline with exercise labels.
 * Shows momentum — are PRs clustering (great periodization) or drying up
 * (plateau)? This is a huge motivational chart for clients.
 *
 * HOW IT FITS: ClientProgressCharts → ChartsGrid → PersonalRecordsChart
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart, VictoryScatter, VictoryAxis,
  VictoryTooltip, VictoryVoronoiContainer,
} from 'victory';
import { PersonalRecordsChartProps } from '../types/ClientProgressTypes';

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

const AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const PersonalRecordsChart: React.FC<PersonalRecordsChartProps> = ({
  data, animate = true, className,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d, i) => ({
        x: i,
        y: d.estimated1RM,
        exercise: d.exercise,
        weight: d.weight,
        reps: d.reps,
        displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        // Size bubble by estimated 1RM magnitude
        size: Math.max(4, Math.min(12, d.estimated1RM / 30)),
      }));
  }, [data]);

  if (!data || data.length === 0) {
    return <NoData>Hit some personal records to see your PR timeline!</NoData>;
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
          domainPadding={{ x: 20, y: 20 }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) =>
                `${datum.exercise}\n${datum.displayDate}\n${datum.weight} lbs × ${datum.reps} reps\nEst 1RM: ${datum.y} lbs`
              }
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(198, 168, 75, 0.4)', strokeWidth: 1 }}
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  cornerRadius={8}
                  flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                />
              }
            />
          }
        >
          <VictoryAxis style={AXIS_STYLE}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.displayDate)}
          />
          <VictoryAxis dependentAxis style={{
            ...AXIS_STYLE,
            axisLabel: { fill: '#E0ECF4', fontSize: 12, fontFamily: "'Fira Code', monospace", padding: 40 },
          }} label="Estimated 1RM (lbs)" />

          <VictoryScatter
            data={chartData}
            style={{
              data: {
                fill: '#C6A84B',
                stroke: '#8B5CF6',
                strokeWidth: 2,
                opacity: 0.9,
              },
            }}
            bubbleProperty="size"
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default PersonalRecordsChart;
