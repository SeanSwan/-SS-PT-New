/**
 * VolumeOverTimeChart.tsx
 * ======================
 *
 * Area chart component for displaying total workout volume over time
 * Part of the ClientProgressCharts modular system
 *
 * FEATURES:
 * - Responsive area chart with smooth animations
 * - Gradient fill under the line
 * - Interactive tooltips with detailed information
 * - Trend line overlay option
 * - Mobile-optimized touch interactions
 * - WCAG AA accessibility compliance
 *
 * MIGRATED: Recharts → Victory (v37.3.6) for cross-platform compatibility
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart,
  VictoryArea,
  VictoryLine,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { VolumeChartProps, VolumeDataPoint } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;

  @media (max-width: 768px) {
    height: 250px;
  }
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #b8c9db;
  text-align: center;
`;

// ==================== CONSTANTS ====================

const AXIS_STYLE = {
  axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
  tickLabels: {
    fill: '#E0ECF4',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
  grid: {
    stroke: 'rgba(96, 192, 240, 0.08)',
    strokeDasharray: '4,4',
  },
};

// ==================== MAIN COMPONENT ====================

const VolumeOverTimeChart: React.FC<VolumeChartProps> = ({
  data,
  height = 300,
  showTooltip = true,
  showLegend = false,
  animate = true,
  showTrendLine = false,
  theme,
  className
}) => {
  // ==================== COMPUTED VALUES ====================

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point, index) => ({
        ...point,
        x: index,
        y: point.value,
        displayDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        formattedValue: point.value.toLocaleString()
      }));
  }, [data]);

  const maxValue = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map(d => d.value));
  }, [chartData]);

  const averageValue = useMemo(() => {
    if (!chartData.length) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return sum / chartData.length;
  }, [chartData]);

  // ==================== RENDER ====================

  if (!data || data.length === 0) {
    return (
      <ChartContainer className={className}>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Volume Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Complete some workouts to see your volume progress!
            </p>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 20, right: 30, left: 60, bottom: 50 }}
          domainPadding={{ y: [0, 10] }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            showTooltip ? (
              <VictoryVoronoiContainer
                labels={({ datum }) => {
                  const d = datum as VolumeDataPoint & { displayDate: string };
                  const parts = [d.displayDate, d.label || `${d.value.toLocaleString()} lbs`];
                  if (d.totalSets) parts.push(`${d.totalSets} sets`);
                  return parts.join('\n');
                }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{
                      fill: '#141419',
                      stroke: 'rgba(139, 92, 246, 0.3)',
                      strokeWidth: 1,
                    }}
                    style={{
                      fill: '#E0ECF4',
                      fontSize: 11,
                      fontFamily: "'Fira Code', monospace",
                    }}
                    cornerRadius={8}
                    flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  />
                }
              />
            ) : undefined
          }
        >
          {/* Gradient defs */}
          <defs>
            <linearGradient id="victoryVolumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60C0F0" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#50A0F0" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#C6A84B" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* X Axis */}
          <VictoryAxis
            style={AXIS_STYLE}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.displayDate)}
          />

          {/* Y Axis */}
          <VictoryAxis
            dependentAxis
            style={{
              ...AXIS_STYLE,
              axisLabel: {
                fill: '#E0ECF4',
                fontSize: 12,
                fontFamily: "'Fira Code', monospace",
                padding: 40,
              },
            }}
            label="Volume (lbs)"
          />

          {/* Main Area */}
          <VictoryArea
            data={chartData}
            interpolation="monotoneX"
            style={{
              data: {
                fill: 'url(#victoryVolumeGradient)',
                stroke: '#60C0F0',
                strokeWidth: 2,
              },
            }}
          />

          {/* Trend Line (average) */}
          {showTrendLine && (
            <VictoryLine
              data={chartData.map(d => ({ x: d.x, y: averageValue }))}
              style={{
                data: {
                  stroke: '#C6A84B',
                  strokeWidth: 2,
                  strokeDasharray: '5,5',
                  opacity: 0.6,
                },
              }}
            />
          )}
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default VolumeOverTimeChart;
