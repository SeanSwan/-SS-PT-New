/**
 * StrengthProgressionChart.tsx
 * =============================
 *
 * Multi-line LineChart for tracking estimated 1RM across exercises over time
 * Each line represents a different exercise, color-cycled through the theme palette
 *
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { StrengthProgressionChartProps } from '../types/ClientProgressTypes';

// ==================== CONSTANTS ====================

const LINE_COLORS = ['#60C0F0', '#8B5CF6', '#50A0F0', '#C6A84B'];

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
    rgba(0, 32, 96, 0.95) 0%,
    rgba(0, 48, 128, 0.9) 100%
  );
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #E0ECF4;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: #60C0F0;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Fira Code', monospace;
`;

const TooltipRow = styled.div<{ color: string }>`
  font-size: 0.85rem;
  color: ${props => props.color};
  margin-bottom: 0.2rem;
  font-family: 'Fira Code', monospace;
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

  return (
    <TooltipContainer>
      <TooltipLabel>{label}</TooltipLabel>
      {payload.map((entry, index) => (
        <TooltipRow key={index} color={entry.color || '#E0ECF4'}>
          {entry.name}: {entry.value} lbs
        </TooltipRow>
      ))}
    </TooltipContainer>
  );
};

// ==================== MAIN COMPONENT ====================

const StrengthProgressionChart: React.FC<StrengthProgressionChartProps> = ({
  data,
  exerciseNames,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(point => {
        const displayDate = new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        return {
          displayDate,
          ...point.exercises,
        };
      });
  }, [data]);

  if (!data || data.length === 0 || !exerciseNames || exerciseNames.length === 0) {
    return (
      <ChartContainer>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Strength Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log strength workouts to track your estimated 1RM progression!
            </p>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(96, 192, 240, 0.1)"
            />
            <XAxis
              dataKey="displayDate"
              stroke="rgba(96, 192, 240, 0.5)"
              tick={{ fill: '#b8c9db', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
            />
            <YAxis
              stroke="rgba(96, 192, 240, 0.5)"
              tick={{ fill: '#b8c9db', fontSize: 12, fontFamily: "'Fira Code', monospace" }}
              label={{
                value: 'Est. 1RM (lbs)',
                angle: -90,
                position: 'insideLeft',
                fill: '#b8c9db',
                style: { fontFamily: "'Fira Code', monospace" }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                color: '#b8c9db',
                fontFamily: "'Fira Code', monospace",
                fontSize: '0.8rem'
              }}
            />
            {exerciseNames.map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={{
                  fill: LINE_COLORS[index % LINE_COLORS.length],
                  strokeWidth: 2,
                  stroke: LINE_COLORS[index % LINE_COLORS.length],
                  r: 4
                }}
                activeDot={{
                  r: 6,
                  fill: LINE_COLORS[index % LINE_COLORS.length],
                  stroke: '#E0ECF4',
                  strokeWidth: 2
                }}
                animationDuration={1500}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default StrengthProgressionChart;
