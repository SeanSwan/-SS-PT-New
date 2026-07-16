/**
 * ============================================================================
 * FILE: SkillRadarChart.tsx
 * PURPOSE: Victory polar/radar chart showing client skill balance
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 */

import React from 'react';
import { VictoryChart, VictoryArea, VictoryPolarAxis } from 'victory';
import {
  ChartSection,
  ChartTitle,
  ChartContainer,
  NoDataMessage
} from '../../styles/ClientProgress.styles';
import { SkillData } from '../../types/progress.types';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

interface SkillRadarChartProps {
  skillData: SkillData[];
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({ skillData }) => {
  return (
    <ChartSection>
      <ChartTitle>Skill Balance</ChartTitle>
      <ChartContainer>
        {skillData.length > 0 ? (
          <VictoryChart
            polar
            domain={{ y: [0, 10] }}
            padding={{ top: 40, bottom: 40, left: 40, right: 40 }}
            animate={{ duration: 800, easing: 'cubicInOut' }}
          >
            <VictoryPolarAxis
              dependentAxis
              {...victoryStyleProps({
                axis: { stroke: 'none' },
                grid: { stroke: 'rgba(96, 192, 240, 0.15)', strokeDasharray: '4,4' },
                tickLabels: { fill: 'transparent' },
              })}
              tickValues={[2, 4, 6, 8, 10]}
            />
            <VictoryPolarAxis
              {...victoryStyleProps({
                axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
                grid: { stroke: 'rgba(96, 192, 240, 0.1)' },
                tickLabels: {
                  fill: '#E0ECF4',
                  fontSize: 10,
                  fontFamily: "'Sora', sans-serif",
                  padding: 12,
                },
              })}
              tickValues={skillData.map((_, i) => i)}
              tickFormat={skillData.map(d => d.subject)}
              labelPlacement="vertical"
            />
            <VictoryArea
              data={skillData.map((d, i) => ({ x: i, y: d.value }))}
              {...victoryStyleProps({
                data: {
                  fill: 'rgba(80, 160, 240, 0.25)',
                  stroke: '#50A0F0',
                  strokeWidth: 2,
                },
              })}
            />
          </VictoryChart>
        ) : (
          <NoDataMessage>No skill data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default SkillRadarChart;
