/**
 * ChallengeActivityChart.tsx
 * =========================
 * Victory BarChart showing challenge completion status.
 * Data source: useUserChallenges hook → /api/v1/gamification/users/:userId/challenges
 * Cyan bars with purple hover, 800ms animated entry.
 */

import React from 'react';
import styled from 'styled-components';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import type { UserChallenge } from '../../../hooks/useUserChallenges';

interface ChallengeActivityChartProps {
  challenges: UserChallenge[];
}

const ChartWrapper = styled.div`
  background: rgba(0, 32, 96, 0.3);
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
    x: uc.challenge?.title?.slice(0, 12) || `Challenge ${index + 1}`,
    y: uc.isCompleted ? 100 : 50,
    fullTitle: uc.challenge?.title || `Challenge ${index + 1}`,
    completed: uc.isCompleted,
    difficulty: uc.challenge?.difficulty,
  }));

  return (
    <ChartWrapper>
      <ChartTitle>Challenge Activity</ChartTitle>
      <VictoryChart
        height={220}
        padding={{ top: 10, right: 30, left: 50, bottom: 40 }}
        domainPadding={{ x: 25 }}
        domain={{ y: [0, 100] }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }) =>
              `${datum.fullTitle}\nStatus: ${datum.completed ? 'Completed' : 'In Progress'}${datum.difficulty ? `\nDifficulty: ${datum.difficulty}` : ''}`
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
        <VictoryBar
          data={chartData}
          cornerRadius={{ top: 6 }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          style={{
            data: {
              fill: ({ datum }) => datum.completed ? '#50A0F0' : '#4070C0',
              opacity: ({ datum }) => datum.completed ? 0.9 : 0.7,
            },
          }}
        />
      </VictoryChart>
    </ChartWrapper>
  );
};

export default ChallengeActivityChart;
