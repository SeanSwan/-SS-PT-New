/**
 * GoalProgressChart.tsx
 * ====================
 * Animated Recharts AreaChart showing goal progress over time.
 * Data source: useUserGoals hook → /api/v1/gamification/users/:userId/goals
 * Galaxy-Swan gradient fill, 1200ms animated entry.
 */

import React from 'react';
import styled from 'styled-components';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { UserGoal } from '../../../hooks/useUserGoals';

interface GoalProgressChartProps {
  goals: UserGoal[];
}

const ChartWrapper = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h4`
  color: #00ffff;
  font-size: 1.1rem;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
`;

const CustomTooltipWrapper = styled.div`
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid rgba(0, 255, 255, 0.4);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  color: #fff;
  font-size: 0.85rem;

  .tooltip-label {
    color: #00ffff;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .tooltip-value {
    color: rgba(255, 255, 255, 0.8);
  }
`;

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <CustomTooltipWrapper>
      <div className="tooltip-label">{data.title}</div>
      <div className="tooltip-value">Progress: {data.progress ?? 0}%</div>
      {data.category && (
        <div className="tooltip-value">Category: {data.category}</div>
      )}
    </CustomTooltipWrapper>
  );
};

const GoalProgressChart: React.FC<GoalProgressChartProps> = ({ goals }) => {
  if (!goals || goals.length === 0) {
    return (
      <ChartWrapper>
        <ChartTitle>Goal Progress</ChartTitle>
        <EmptyState>Set goals to track your progress here.</EmptyState>
      </ChartWrapper>
    );
  }

  const chartData = goals.map((goal, index) => ({
    name: goal.title?.slice(0, 15) || `Goal ${index + 1}`,
    title: goal.title || `Goal ${index + 1}`,
    progress: goal.progress ?? Math.round(((goal.currentValue || 0) / (goal.targetValue || 1)) * 100),
    category: goal.category || 'General'
  }));

  return (
    <ChartWrapper>
      <ChartTitle>Goal Progress</ChartTitle>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="goalGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00ffff" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#7851a9" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.15)' }}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="progress"
            stroke="#00ffff"
            strokeWidth={2}
            fill="url(#goalGradient)"
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default GoalProgressChart;
