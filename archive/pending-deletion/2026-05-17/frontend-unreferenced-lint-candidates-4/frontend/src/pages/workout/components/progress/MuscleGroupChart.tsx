/**
 * ============================================================================
 * FILE: MuscleGroupChart.tsx
 * PURPOSE: Victory bar chart showing muscle group focus distribution
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
import { MuscleGroupData } from '../../types/progress.types';

interface MuscleGroupChartProps {
  muscleGroupData: MuscleGroupData[];
}

const AXIS_STYLE = {
  axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

export const MuscleGroupChart: React.FC<MuscleGroupChartProps> = ({ muscleGroupData }) => {
  return (
    <ChartSection>
      <ChartTitle>Muscle Group Focus</ChartTitle>
      <ChartContainer>
        {muscleGroupData.length > 0 ? (
          <VictoryChart
            domainPadding={{ x: 20 }}
            padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
            animate={{ duration: 800, easing: 'cubicInOut' }}
          >
            <VictoryAxis style={AXIS_STYLE} />
            <VictoryAxis dependentAxis style={AXIS_STYLE} />
            <VictoryBar
              data={muscleGroupData}
              x="name"
              y="value"
              style={{
                data: { fill: '#8B5CF6', width: 18 },
              }}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                />
              }
              labels={({ datum }) => `${datum.name}: ${datum.value}`}
            />
          </VictoryChart>
        ) : (
          <NoDataMessage>No muscle group data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default MuscleGroupChart;
