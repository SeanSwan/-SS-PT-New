/**
 * BodyCompositionChart.tsx
 * ========================
 *
 * Dual-axis chart for body composition tracking
 * Left Y-axis: Weight (lbs) with Ice Wing gradient area
 * Right Y-axis: Body Fat % with Wing Purple line
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
  VictoryLegend,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryScatter,
} from 'victory';
import { BodyCompositionChartProps, BodyCompositionDataPoint } from '../types/ClientProgressTypes';

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

const BodyCompositionChart: React.FC<BodyCompositionChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point, index) => ({
        ...point,
        x: index,
        displayDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      }));
  }, [data]);

  // Compute domains for dual-axis normalization
  const weightDomain = useMemo(() => {
    if (!chartData.length) return [0, 100];
    const weights = chartData.map(d => d.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const pad = (max - min) * 0.1 || 5;
    return [min - pad, max + pad];
  }, [chartData]);

  const bodyFatDomain = useMemo(() => {
    if (!chartData.length) return [0, 50];
    const fats = chartData.map(d => d.bodyFat);
    const min = Math.min(...fats);
    const max = Math.max(...fats);
    const pad = (max - min) * 0.1 || 2;
    return [min - pad, max + pad];
  }, [chartData]);

  if (!data || data.length === 0) {
    return (
      <ChartContainer>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Body Composition Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log your body measurements to track composition changes!
            </p>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  // Normalize body fat to weight scale for overlay rendering
  const normalizeBodyFat = (bf: number) => {
    const [bfMin, bfMax] = bodyFatDomain;
    const [wMin, wMax] = weightDomain;
    return wMin + ((bf - bfMin) / (bfMax - bfMin)) * (wMax - wMin);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 20, right: 70, left: 60, bottom: 50 }}
          domain={{ y: weightDomain as [number, number] }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => {
                const d = datum as any;
                const parts = [`${d.displayDate}`];
                if (d.weight !== undefined) parts.push(`Weight: ${d.weight} lbs`);
                if (d.bodyFat !== undefined) parts.push(`Body Fat: ${d.bodyFat}%`);
                if (d.muscleMass !== undefined) parts.push(`Muscle: ${d.muscleMass} lbs`);
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
          }
        >
          {/* Gradient defs via SVG */}
          <defs>
            <linearGradient id="victoryBodyWeightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#60C0F0" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#60C0F0" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#60C0F0" stopOpacity={0.05} />
            </linearGradient>
          </defs>

          {/* X Axis */}
          <VictoryAxis
            style={AXIS_STYLE}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.displayDate)}
          />

          {/* Left Y Axis — Weight */}
          <VictoryAxis
            dependentAxis
            style={{
              ...AXIS_STYLE,
              tickLabels: { ...AXIS_STYLE.tickLabels, fill: '#60C0F0' },
              axisLabel: {
                fill: '#60C0F0',
                fontSize: 12,
                fontFamily: "'Fira Code', monospace",
                padding: 40,
              },
            }}
            label="Weight (lbs)"
          />

          {/* Right Y Axis — Body Fat % */}
          <VictoryAxis
            dependentAxis
            orientation="right"
            style={{
              axis: { stroke: 'rgba(139, 92, 246, 0.3)' },
              tickLabels: {
                fill: '#8B5CF6',
                fontSize: 11,
                fontFamily: "'Fira Code', monospace",
              },
              grid: { stroke: 'none' },
              axisLabel: {
                fill: '#8B5CF6',
                fontSize: 12,
                fontFamily: "'Fira Code', monospace",
                padding: 50,
              },
            }}
            label="Body Fat %"
            tickFormat={(t: number) => {
              // Reverse-normalize from weight scale back to body fat
              const [bfMin, bfMax] = bodyFatDomain;
              const [wMin, wMax] = weightDomain;
              const bf = bfMin + ((t - wMin) / (wMax - wMin)) * (bfMax - bfMin);
              return `${bf.toFixed(1)}%`;
            }}
          />

          {/* Weight Area */}
          <VictoryArea
            data={chartData.map(d => ({ x: d.x, y: d.weight, ...d }))}
            interpolation="monotoneX"
            style={{
              data: {
                fill: 'url(#victoryBodyWeightGradient)',
                stroke: '#60C0F0',
                strokeWidth: 2,
              },
            }}
          />

          {/* Body Fat Line — normalized to weight scale */}
          <VictoryLine
            data={chartData.map(d => ({
              x: d.x,
              y: normalizeBodyFat(d.bodyFat),
              ...d,
            }))}
            interpolation="monotoneX"
            style={{
              data: { stroke: '#8B5CF6', strokeWidth: 2 },
            }}
          />

          {/* Body Fat Dots */}
          <VictoryScatter
            data={chartData.map(d => ({
              x: d.x,
              y: normalizeBodyFat(d.bodyFat),
              ...d,
            }))}
            size={4}
            style={{
              data: { fill: '#8B5CF6', stroke: '#7c3aed', strokeWidth: 2 },
            }}
          />

          {/* Legend */}
          <VictoryLegend
            x={60}
            y={0}
            orientation="horizontal"
            gutter={20}
            style={{
              labels: {
                fill: '#E0ECF4',
                fontFamily: "'Sora', sans-serif",
                fontSize: 10,
              },
            }}
            data={[
              { name: 'Weight (lbs)', symbol: { fill: '#60C0F0' } },
              { name: 'Body Fat %', symbol: { fill: '#8B5CF6' } },
            ]}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default BodyCompositionChart;
