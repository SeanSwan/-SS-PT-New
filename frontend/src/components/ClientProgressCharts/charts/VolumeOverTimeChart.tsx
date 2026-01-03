/**
 * VolumeOverTimeChart.tsx
 * ======================
 * 
 * Line chart component for displaying total workout volume over time
 * Part of the ClientProgressCharts modular system
 * 
 * FEATURES:
 * - Responsive line chart with smooth animations
 * - Gradient fill under the line
 * - Interactive tooltips with detailed information
 * - Trend line overlay option
 * - Mobile-optimized touch interactions
 * - WCAG AA accessibility compliance
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line as RechartsLine
} from 'recharts';
import { VolumeChartProps, VolumeDataPoint } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;
  
  @media (max-width: 768px) {
    height: 250px;
  }
`;

const TooltipContainer = styled.div`
  background: linear-gradient(
    135deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(30, 41, 59, 0.9) 100%
  );
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #e2e8f0;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: #3b82f6;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const TooltipValue = styled.div`
  font-size: 1.1rem;
  font-weight: 500;
  color: #10b981;
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #94a3b8;
  text-align: center;
`;

// ==================== INTERFACES ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ==================== COMPONENTS ====================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload as VolumeDataPoint;
  
  return (
    <TooltipContainer>
      <TooltipLabel>
        {new Date(label!).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })}
      </TooltipLabel>
      <TooltipValue>
        {data.label}
      </TooltipValue>
      {data.totalSets && (
        <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
          {data.totalSets} sets
        </div>
      )}
    </TooltipContainer>
  );
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
    
    // Sort data by date and ensure proper formatting
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(point => ({
        ...point,
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
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>No Volume Data</h4>
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
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="volumeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6}/>
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(148, 163, 184, 0.2)"
            />
            <XAxis
              dataKey="displayDate"
              stroke="rgba(148, 163, 184, 0.5)"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
            />
            <YAxis
              stroke="rgba(148, 163, 184, 0.5)"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              label={{ value: 'Volume (lbs)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
            />
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
            )}
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#volumeAreaGradient)"
              isAnimationActive={animate}
              animationDuration={1500}
            />
            {showTrendLine && (
              <RechartsLine
                type="monotone"
                dataKey={() => averageValue}
                stroke="url(#trendLineGradient)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default VolumeOverTimeChart;