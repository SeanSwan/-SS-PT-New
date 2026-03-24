/**
 * ============================================================================
 * FILE: TopExercisesChart.tsx
 * PURPOSE: Victory horizontal bar chart showing most frequently performed exercises
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 */

import React from 'react';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryTooltip } from 'victory';
import {
  ChartSection,
  ChartTitle,
  ChartContainer,
  NoDataMessage
} from '../../styles/ClientProgress.styles';

interface TopExerciseData {
  id: string;
  name: string;
  count: number;
  sets: number;
  reps: number;
  totalWeight: number;
  category: string;
}

interface TopExercisesChartProps {
  topExercises: TopExerciseData[];
}

const AXIS_STYLE = {
  axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

export const TopExercisesChart: React.FC<TopExercisesChartProps> = ({ topExercises }) => {
  return (
    <ChartSection>
      <ChartTitle>Top Exercises</ChartTitle>
      <ChartContainer>
        {topExercises.length > 0 ? (
          <VictoryChart
            horizontal
            domainPadding={{ x: 15 }}
            padding={{ top: 20, bottom: 40, left: 120, right: 30 }}
            animate={{ duration: 800, easing: 'cubicInOut' }}
          >
            <VictoryAxis style={AXIS_STYLE} />
            <VictoryAxis dependentAxis style={AXIS_STYLE} />
            <VictoryBar
              data={topExercises}
              x="name"
              y="count"
              style={{
                data: { fill: '#4ECDC4', width: 14 },
              }}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                />
              }
              labels={({ datum }) => `${datum.name}: ${datum.count}`}
            />
          </VictoryChart>
        ) : (
          <NoDataMessage>No exercise data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default TopExercisesChart;
