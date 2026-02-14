/**
 * ChallengeActivityChart.tsx
 * =========================
 * Animated Recharts BarChart showing challenge completion status.
 * Data source: useUserChallenges hook → /api/v1/gamification/users/:userId/challenges
 * Cyan bars with purple hover, 1200ms animated entry.
 */

import React from 'react';
import styled from 'styled-components';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { UserChallenge } from '../../../hooks/useUserChallenges';

interface ChallengeActivityChartProps {
  challenges: UserChallenge[];
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
      <div className="tooltip-label">{data.fullTitle}</div>
      <div className="tooltip-value">
        Status: {data.completed ? 'Completed' : 'In Progress'}
      </div>
      {data.difficulty && (
        <div className="tooltip-value">Difficulty: {data.difficulty}</div>
      )}
    </CustomTooltipWrapper>
  );
};

const ChallengeActivityChart: React.FC<ChallengeActivityChartProps> = ({ challenges }) => {
  if (!challenges || challenges.length === 0) {
    return (
      <ChartWrapper>
        <ChartTitle>Challenge Activity</ChartTitle>
        <EmptyState>Join challenges to see your activity here.</EmptyState>
      </ChartWrapper>
    );
  }

  const chartData = challenges.slice(0, 8).map((uc, index) => ({
    name: uc.challenge?.title?.slice(0, 12) || `Challenge ${index + 1}`,
    fullTitle: uc.challenge?.title || `Challenge ${index + 1}`,
    value: uc.isCompleted ? 100 : 50,
    completed: uc.isCompleted,
    difficulty: uc.challenge?.difficulty
  }));

  return (
    <ChartWrapper>
      <ChartTitle>Challenge Activity</ChartTitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
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
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
            animationDuration={1200}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.completed ? '#00ff88' : '#00ffff'}
                opacity={entry.completed ? 0.9 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
};

export default ChallengeActivityChart;
