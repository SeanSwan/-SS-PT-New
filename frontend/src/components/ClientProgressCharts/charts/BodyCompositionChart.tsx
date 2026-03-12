/**
 * BodyCompositionChart.tsx
 * ========================
 *
 * Dual-axis ComposedChart for body composition tracking
 * Left Y-axis: Weight (lbs) with Ice Wing gradient area
 * Right Y-axis: Body Fat % with Wing Purple line
 *
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { BodyCompositionChartProps, BodyCompositionDataPoint } from '../types/ClientProgressTypes';

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
  font-size: 0.9rem;
  color: ${props => props.color};
  margin-bottom: 0.25rem;
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

  const data = payload[0]?.payload as BodyCompositionDataPoint & { displayDate: string };

  return (
    <TooltipContainer>
      <TooltipLabel>{data.displayDate || label}</TooltipLabel>
      <TooltipRow color="#60C0F0">
        Weight: {data.weight} lbs
      </TooltipRow>
      <TooltipRow color="#8B5CF6">
        Body Fat: {data.bodyFat}%
      </TooltipRow>
      {data.muscleMass !== undefined && (
        <TooltipRow color="#C6A84B">
          Muscle Mass: {data.muscleMass} lbs
        </TooltipRow>
      )}
      {data.progressScore !== undefined && (
        <TooltipRow color="#50A0F0">
          Progress Score: {data.progressScore}
        </TooltipRow>
      )}
    </TooltipContainer>
  );
};

// ==================== MAIN COMPONENT ====================

const BodyCompositionChart: React.FC<BodyCompositionChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(point => ({
        ...point,
        displayDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
      }));
  }, [data]);

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="bodyWeightGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60C0F0" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#60C0F0" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#60C0F0" stopOpacity={0.05} />
              </linearGradient>
            </defs>
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
              yAxisId="weight"
              stroke="rgba(96, 192, 240, 0.5)"
              tick={{ fill: '#60C0F0', fontSize: 12, fontFamily: "'Fira Code', monospace" }}
              label={{
                value: 'Weight (lbs)',
                angle: -90,
                position: 'insideLeft',
                fill: '#60C0F0',
                style: { fontFamily: "'Fira Code', monospace" }
              }}
            />
            <YAxis
              yAxisId="bodyFat"
              orientation="right"
              stroke="rgba(139, 92, 246, 0.5)"
              tick={{ fill: '#8B5CF6', fontSize: 12, fontFamily: "'Fira Code', monospace" }}
              label={{
                value: 'Body Fat %',
                angle: 90,
                position: 'insideRight',
                fill: '#8B5CF6',
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
            <Area
              yAxisId="weight"
              type="monotone"
              dataKey="weight"
              name="Weight (lbs)"
              stroke="#60C0F0"
              strokeWidth={2}
              fill="url(#bodyWeightGradient)"
              animationDuration={1500}
            />
            <Line
              yAxisId="bodyFat"
              type="monotone"
              dataKey="bodyFat"
              name="Body Fat %"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={{ fill: '#8B5CF6', strokeWidth: 2, stroke: '#7c3aed', r: 4 }}
              activeDot={{ r: 6, fill: '#8B5CF6', stroke: '#E0ECF4', strokeWidth: 2 }}
              animationDuration={1500}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default BodyCompositionChart;
