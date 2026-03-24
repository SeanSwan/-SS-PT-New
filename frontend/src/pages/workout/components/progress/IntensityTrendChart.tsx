/**
 * ============================================================================
 * FILE: IntensityTrendChart.tsx
 * PURPOSE: Victory line chart showing workout intensity trends over time
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * ============================================================================
 */

import React from 'react';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTooltip, VictoryVoronoiContainer, VictoryScatter } from 'victory';
import {
  ChartSection,
  ChartTitle,
  ChartContainer,
  NoDataMessage
} from '../../styles/ClientProgress.styles';
import { IntensityTrendData } from '../../types/progress.types';

interface IntensityTrendChartProps {
  intensityTrendData: IntensityTrendData[];
}

const AXIS_STYLE = {
  axis: { stroke: 'rgba(224, 236, 244, 0.2)' },
  tickLabels: { fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" },
  grid: { stroke: 'rgba(96, 192, 240, 0.08)', strokeDasharray: '4,4' },
};

export const IntensityTrendChart: React.FC<IntensityTrendChartProps> = ({ intensityTrendData }) => {
  return (
    <ChartSection>
      <ChartTitle>Workout Intensity Trends</ChartTitle>
      <ChartContainer>
        {intensityTrendData.length > 0 ? (
          <VictoryChart
            domain={{ y: [0, 10] }}
            padding={{ top: 20, bottom: 40, left: 40, right: 20 }}
            containerComponent={
              <VictoryVoronoiContainer
                labels={({ datum }) => `Week ${datum.week}: ${datum.averageIntensity}`}
                labelComponent={
                  <VictoryTooltip
                    style={{ fill: '#E0ECF4', fontSize: 11, fontFamily: "'Fira Code', monospace" }}
                    flyoutStyle={{ fill: '#141419', stroke: 'rgba(139, 92, 246, 0.3)' }}
                  />
                }
              />
            }
            animate={{ duration: 800, easing: 'cubicInOut' }}
          >
            <VictoryAxis style={AXIS_STYLE} />
            <VictoryAxis dependentAxis style={AXIS_STYLE} />
            <VictoryLine
              data={intensityTrendData}
              x="week"
              y="averageIntensity"
              style={{
                data: { stroke: '#50A0F0', strokeWidth: 2 },
              }}
            />
            <VictoryScatter
              data={intensityTrendData}
              x="week"
              y="averageIntensity"
              size={4}
              style={{
                data: { fill: '#50A0F0' },
              }}
            />
          </VictoryChart>
        ) : (
          <NoDataMessage>No intensity data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default IntensityTrendChart;
