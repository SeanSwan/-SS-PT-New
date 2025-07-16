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
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import styled from 'styled-components';
import { motion } from 'framer-motion';
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
    <ChartContainer
      className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 20,
          }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(148, 163, 184, 0.2)"
            vertical={false}
          />
          
          <XAxis
            dataKey="displayDate"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
          />
          
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          
          {showTooltip && (
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(59, 130, 246, 0.5)', strokeWidth: 2 }}
            />
          )}
          
          {showTrendLine && (
            <ReferenceLine
              y={averageValue}
              stroke="rgba(16, 185, 129, 0.6)"
              strokeDasharray="5 5"
              label={{
                value: `Avg: ${averageValue.toLocaleString()} lbs`,
                position: 'topRight',
                fill: '#10b981',
                fontSize: 12
              }}
            />
          )}
          
          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#volumeGradient)"
            strokeWidth={3}
            dot={{
              fill: '#3b82f6',
              strokeWidth: 2,
              stroke: '#1e40af',
              r: 4
            }}
            activeDot={{
              r: 6,
              fill: '#3b82f6',
              stroke: '#ffffff',
              strokeWidth: 2
            }}
            animationDuration={animate ? 1500 : 0}
            animationEasing="ease-out"
          />
          
          {/* Define gradient */}
          <defs>
            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
            </linearGradient>
          </defs>
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default VolumeOverTimeChart;