/**
 * ============================================================================
 * FILE: WeekdayBarChart.tsx
 * PURPOSE: Victory bar chart showing workout frequency by weekday
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
import { WeekdayData } from '../../types/progress.types';

interface WeekdayBarChartProps {
  weekdayData: WeekdayData[];
}

const AXIS_STYLE = {
  axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

export const WeekdayBarChart: React.FC<WeekdayBarChartProps> = ({ weekdayData }) => {
  return (
    <ChartSection>
      <ChartTitle>Workout Frequency by Weekday</ChartTitle>
      <ChartContainer>
        {weekdayData.length > 0 ? (
          <VictoryChart
            domainPadding={{ x: 20 }}
            padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
            animate={{ duration: 800, easing: 'cubicInOut' }}
          >
            <VictoryAxis style={AXIS_STYLE} />
            <VictoryAxis dependentAxis style={AXIS_STYLE} />
            <VictoryBar
              data={weekdayData}
              x="day"
              y="count"
              style={{
                data: { fill: '#50A0F0', width: 18 },
              }}
              labelComponent={
                <VictoryTooltip
                  style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                  flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                />
              }
              labels={({ datum }) => `${datum.day}: ${datum.count}`}
            />
          </VictoryChart>
        ) : (
          <NoDataMessage>No workout data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default WeekdayBarChart;
