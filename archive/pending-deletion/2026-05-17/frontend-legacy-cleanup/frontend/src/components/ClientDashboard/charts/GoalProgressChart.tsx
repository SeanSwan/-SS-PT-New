/**
 * GoalProgressChart.tsx
 * ====================
 * Victory AreaChart showing goal progress over time.
 * Data source: useUserGoals hook → /api/v1/gamification/users/:userId/goals
 * Crystalline Swan gradient fill, 800ms animated entry.
 */

import React from 'react';
import styled from 'styled-components';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import type { UserGoal } from '../../../hooks/useUserGoals';

interface GoalProgressChartProps {
  goals: UserGoal[];
}

const ChartWrapper = styled.div`
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
`;

const ChartTitle = styled.h4`
  color: #60C0F0;
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
    x: goal.title?.slice(0, 15) || `Goal ${index + 1}`,
    y: goal.progress ?? Math.round(((goal.currentValue || 0) / (goal.targetValue || 1)) * 100),
    title: goal.title || `Goal ${index + 1}`,
    category: goal.category || 'General',
  }));

  return (
    <ChartWrapper>
      <ChartTitle>Goal Progress</ChartTitle>
      <VictoryChart
        height={220}
        padding={{ top: 10, right: 30, left: 50, bottom: 40 }}
        domainPadding={{ x: 20 }}
        domain={{ y: [0, 100] }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) =>
              `${datum.title}\nProgress: ${datum.y ?? 0}%${datum.category ? `\nCategory: ${datum.category}` : ''}`
            }
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{
                  fill: '#141419',
                  stroke: 'rgba(139, 92, 246, 0.3)',
                  strokeWidth: 1,
                }}
                style={{
                  fill: '#E0ECF4',
                  fontSize: 10,
                  fontFamily: "'Fira Code', monospace",
                }}
                cornerRadius={8}
                flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
              />
            }
          />
        }
      >
        <defs>
          <linearGradient id="goalGradientVictory" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60C0F0" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.1} />
          </linearGradient>
        </defs>
        <VictoryAxis
          style={{
            axis: { stroke: 'rgba(255,255,255,0.15)' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 11,
              fontFamily: "'Fira Code', monospace",
            },
            grid: {
              stroke: 'rgba(96, 192, 240, 0.08)',
              strokeDasharray: '4,4',
            },
          }}
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(v: number) => `${v}%`}
          style={{
            axis: { stroke: 'rgba(255,255,255,0.15)' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 11,
              fontFamily: "'Fira Code', monospace",
            },
            grid: {
              stroke: 'rgba(96, 192, 240, 0.08)',
              strokeDasharray: '4,4',
            },
          }}
        />
        <VictoryArea
          data={chartData}
          interpolation="monotoneX"
          animate={{ duration: 800, easing: 'cubicInOut' }}
          style={{
            data: {
              fill: 'url(#goalGradientVictory)',
              stroke: '#50A0F0',
              strokeWidth: 2,
            },
          }}
        />
      </VictoryChart>
    </ChartWrapper>
  );
};

export default GoalProgressChart;
