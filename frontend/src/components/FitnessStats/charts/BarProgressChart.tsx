import React from 'react';
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';

interface BarProgressChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  title?: string;
  colors?: string[];
  labelKey?: string;
  valueFormatter?: (value: number) => string;
  horizontal?: boolean;
  maxValue?: number;
}

/**
 * BarProgressChart Component
 *
 * A bar chart for displaying fitness metrics with customizable colors,
 * orientation, and value formatting. Uses Victory for cross-platform
 * compatibility (React web → React Native).
 */
const BarProgressChart: React.FC<BarProgressChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  title,
  colors = ['#50A0F0', '#4ECDC4', '#8B5CF6', '#4CAF50', '#FFC107'],
  labelKey,
  valueFormatter,
  horizontal = false,
  maxValue
}) => {
  // Pre-calculate the maximum value for the domain if not provided
  const calculatedMaxValue = maxValue || Math.max(...data.map(item => item[yKey])) * 1.1;

  // Map data with per-bar colors for Victory
  const chartData = data.map((item: any, index: number) => ({
    x: item[xKey],
    y: item[yKey],
    fill: colors[index % colors.length],
    label: valueFormatter
      ? `${item[xKey]}: ${valueFormatter(item[yKey])}`
      : `${item[xKey]}: ${item[yKey]}`,
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
        height={chartHeight}
        horizontal={horizontal}
        domainPadding={{ x: 20 }}
        padding={{ top: 10, right: 30, bottom: 50, left: horizontal ? 120 : 50 }}
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
        {/* Grid + dependent axis */}
        <VictoryAxis
          dependentAxis
          domain={[0, calculatedMaxValue]}
          style={{
            axis: { stroke: '#888888' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 12,
              fontFamily: "'Fira Code', monospace",
            },
            grid: {
              stroke: 'rgba(96, 192, 240, 0.08)',
              strokeDasharray: '4,4',
            },
          }}
        />
        {/* Category axis */}
        <VictoryAxis
          style={{
            axis: { stroke: '#888888' },
            tickLabels: {
              fill: '#E0ECF4',
              fontSize: 12,
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
          style={{
            data: {
              fill: ({ datum }: { datum: any }) => datum.fill,
              width: 16,
            },
          }}
          cornerRadius={{ top: 4 }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
        />
      </VictoryChart>
    </div>
  );
};

export default BarProgressChart;
