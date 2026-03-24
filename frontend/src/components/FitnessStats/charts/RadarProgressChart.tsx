import React from 'react';
import {
  VictoryArea,
  VictoryChart,
  VictoryPolarAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';

interface RadarProgressChartProps {
  data: any[];
  name: string;
  nameKey: string;
  dataKey: string;
  height?: number;
  color?: string;
  title?: string;
  maxValue?: number;
}

/**
 * RadarProgressChart Component
 *
 * A polar/radar chart for displaying fitness metrics across multiple categories,
 * ideal for showing balanced progress in different areas. Uses Victory for
 * cross-platform compatibility (React web → React Native).
 */
const RadarProgressChart: React.FC<RadarProgressChartProps> = ({
  data,
  name,
  nameKey,
  dataKey,
  height = 300,
  color = '#50A0F0',
  title,
  maxValue = 100
}) => {
  // Map data to Victory format with x (category) and y (value)
  const chartData = data.map((item: any) => ({
    x: item[nameKey],
    y: item[dataKey],
    label: `${item[nameKey]}: ${typeof item[dataKey] === 'number' ? item[dataKey].toLocaleString() : item[dataKey]}`,
  }));

  const chartHeight = title ? height - 30 : height;

  return (
    <div style={{ width: '100%', height }}>
      {title && (
        <h3 style={{
          margin: '0 0 16px',
          fontSize: '1rem',
          color: '#f0f0f0',
          textAlign: 'center'
        }}>
          {title}
        </h3>
      )}
      <VictoryChart
        polar
        height={chartHeight}
        domain={{ y: [0, maxValue] }}
        padding={{ top: 40, right: 40, bottom: 40, left: 40 }}
        containerComponent={
          <VictoryVoronoiContainer
            labels={({ datum }: { datum: any }) => datum.label}
            labelComponent={
              <VictoryTooltip
                flyoutStyle={{
                  fill: '#141419',
                  stroke: 'rgba(139, 92, 246, 0.3)',
                  strokeWidth: 1,
                }}
                style={{
                  fill: '#E0ECF4',
                  fontFamily: "'Fira Code', monospace",
                  fontSize: 11,
                }}
                cornerRadius={8}
                flyoutPadding={12}
              />
            }
          />
        }
      >
        {/* Angular axis — category labels around the perimeter */}
        <VictoryPolarAxis
          style={{
            axis: { stroke: 'rgba(255, 255, 255, 0.3)' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 12,
              fontFamily: "'Sora', sans-serif",
              padding: 15,
            },
            grid: {
              stroke: 'rgba(96, 192, 240, 0.08)',
              strokeDasharray: '4,4',
            },
          }}
        />
        {/* Radial axis — concentric rings with value ticks */}
        <VictoryPolarAxis
          dependentAxis
          tickCount={5}
          style={{
            axis: { stroke: 'rgba(255, 255, 255, 0.1)' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 10,
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
          style={{
            data: {
              fill: color,
              fillOpacity: 0.3,
              stroke: color,
              strokeWidth: 2,
            },
          }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
        />
      </VictoryChart>
    </div>
  );
};

export default RadarProgressChart;
