/**
 * Victory charts for the active UserDashboard V3 workout panel.
 */

import React from 'react';
import { VictoryAxis, VictoryBar, VictoryChart, VictoryLabel } from 'victory';
import {
  CategoryCount,
  CategoryHeader,
  CategoryIcon,
  CategoryName,
  CategorySection,
  ChartContainer,
  ChartScroll,
} from './WorkoutsTabStyles';
import type { CategoryData } from './WorkoutsTabData';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

const CHART_TEXT_COLOR = 'var(--text-primary, #E0ECF4)';

interface WorkoutsTabChartsProps {
  categories: CategoryData[];
}

const WorkoutsTabCharts: React.FC<WorkoutsTabChartsProps> = ({ categories }) => (
  <>
    {categories.map((category) => (
      <CategorySection key={category.key}>
        <CategoryHeader>
          <CategoryIcon>{category.icon}</CategoryIcon>
          <CategoryName>{category.label.toUpperCase()}</CategoryName>
          <CategoryCount>
            {category.exercises.reduce((sum, exercise) => sum + exercise.count, 0)}
          </CategoryCount>
        </CategoryHeader>
        <ChartScroll>
          <ChartContainer>
            <VictoryChart
              horizontal
              padding={{ top: 4, bottom: 4, left: getChartLeftPadding(), right: 30 }}
              height={category.exercises.length * 32 + 8}
              width={getChartWidth()}
              domainPadding={{ x: [0, 8] }}
            >
              <VictoryAxis
                dependentAxis
                {...victoryStyleProps({
                  axis: { stroke: 'none' },
                  tickLabels: { fill: 'none' },
                  grid: { stroke: 'none' },
                })}
              />
              <VictoryAxis
                {...victoryStyleProps({
                  axis: { stroke: 'none' },
                  tickLabels: {
                    fill: CHART_TEXT_COLOR,
                    fontSize: 11,
                    fontFamily: "'Sora', sans-serif",
                    textAnchor: 'end',
                  },
                  grid: { stroke: 'none' },
                })}
                tickFormat={(_, index) => formatExerciseName(category.exercises[index]?.name ?? '')}
              />
              <VictoryBar
                data={category.exercises.map((exercise, index) => ({ x: index + 1, y: exercise.count }))}
                {...victoryStyleProps({
                  data: { fill: category.color, opacity: 0.85 },
                })}
                barWidth={18}
                cornerRadius={{ topLeft: 4, topRight: 4 }}
                labels={({ datum }) => datum.y}
                labelComponent={
                  <VictoryLabel
                    dx={6}
                    {...victoryStyleProps({
                      fill: CHART_TEXT_COLOR,
                      fontSize: 11,
                      fontFamily: "'Fira Code', monospace",
                      fontWeight: 600,
                    })}
                  />
                }
              />
            </VictoryChart>
          </ChartContainer>
        </ChartScroll>
      </CategorySection>
    ))}
  </>
);

function getChartLeftPadding(): number {
  return typeof window !== 'undefined' && window.innerWidth < 430 ? 90 : 140;
}

function getChartWidth(): number {
  return typeof window !== 'undefined' ? Math.min(500, window.innerWidth - 48) : 500;
}

function formatExerciseName(name: string): string {
  return name.length > 22 ? `${name.slice(0, 20)}...` : name;
}

export default WorkoutsTabCharts;
