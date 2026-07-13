/**
 * StrengthProgressionChart.tsx
 * =============================
 *
 * Multi-line chart for tracking estimated 1RM across exercises over time
 * Each line represents a different exercise, color-cycled through the theme palette
 *
 * Uses Victory (v37.3.6) for cross-platform compatibility.
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryLegend,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryScatter,
} from 'victory';
import { StrengthProgressionChartProps } from '../types/ClientProgressTypes';
import { DETAILED_AXIS_STYLE as AXIS_STYLE } from './detailedChartTheme';

// ==================== CONSTANTS ====================

const LINE_COLORS = ['#50A0F0', '#8B5CF6', '#4ECDC4', '#C6A84B'];

// Shared Victory theme tokens for Crystalline Swan
const TOOLTIP_STYLE = {
  flyoutStyle: {
    fill: '#141419',
    stroke: 'rgba(139, 92, 246, 0.3)',
    strokeWidth: 1,
  },
  style: {
    fill: '#E0ECF4',
    fontSize: 11,
    fontFamily: "'Fira Code', monospace",
  },
};

const Y_AXIS_PROPS = {
  style: {
    ...AXIS_STYLE,
    axisLabel: {
      fill: '#E0ECF4',
      fontSize: 12,
      fontFamily: "'Fira Code', monospace",
      padding: 40,
    },
  },
};

const LEGEND_PROPS = {
  style: {
    labels: {
      fill: '#E0ECF4',
      fontFamily: "'Sora', sans-serif",
      fontSize: 10,
    },
  },
};

const getLineProps = (color: string) => ({
  style: {
    data: { stroke: color, strokeWidth: 2 },
  },
});

const getScatterProps = (color: string) => ({
  style: {
    data: { fill: color, stroke: color, strokeWidth: 2 },
  },
});

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 300px;

  @media (max-width: 768px) {
    height: 250px;
  }
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #b8c9db;
  text-align: center;
`;

const NoDataTitle = styled.h4`
  margin: 0 0 0.5rem;
  color: var(--text-secondary, #b8c9db);
`;

const NoDataCopy = styled.p`
  margin: 0;
  font-size: 0.875rem;
`;

// ==================== MAIN COMPONENT ====================

const StrengthProgressionChart: React.FC<StrengthProgressionChartProps> = ({
  data,
  exerciseNames,
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point, index) => {
        const displayDate = new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        return {
          displayDate,
          x: index,
          xLabel: displayDate,
          ...point.exercises,
        };
      });
  }, [data]);

  if (!data || data.length === 0 || !exerciseNames || exerciseNames.length === 0) {
    return (
      <ChartContainer>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <NoDataTitle>No Strength Data</NoDataTitle>
            <NoDataCopy>
              Log strength workouts to track your estimated 1RM progression!
            </NoDataCopy>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <ChartContainer>
        <VictoryChart
          padding={{ top: 20, right: 40, left: 60, bottom: 50 }}
          domainPadding={{ y: [10, 10] }}
          animate={{ duration: 800, easing: 'cubicInOut' }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => {
                const parts: string[] = [];
                exerciseNames.forEach((name) => {
                  if (datum[name] !== undefined && datum[name] !== null) {
                    parts.push(`${name}: ${datum[name]} lbs`);
                  }
                });
                return `${datum.xLabel}\n${parts.join('\n')}`;
              }}
              labelComponent={
                <VictoryTooltip
                  {...TOOLTIP_STYLE}
                  cornerRadius={8}
                  flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                />
              }
            />
          }
        >
          {/* X Axis */}
          <VictoryAxis
            {...{ style: AXIS_STYLE }}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.xLabel)}
          />

          {/* Y Axis — Est. 1RM (lbs) */}
          <VictoryAxis
            dependentAxis
            {...Y_AXIS_PROPS}
            label="Est. 1RM (lbs)"
          />

          {/* One line + scatter per exercise */}
          {exerciseNames.map((name, index) => {
            const color = LINE_COLORS[index % LINE_COLORS.length];
            const lineData = chartData
              .filter(d => d[name] !== undefined && d[name] !== null)
              .map(d => ({ x: d.x, y: d[name] as number, xLabel: d.xLabel, [name]: d[name] }));

            return (
              <React.Fragment key={name}>
                <VictoryLine
                  data={lineData}
                  interpolation="monotoneX"
                  {...getLineProps(color)}
                />
                <VictoryScatter
                  data={lineData}
                  size={4}
                  {...getScatterProps(color)}
                />
              </React.Fragment>
            );
          })}

          {/* Legend */}
          <VictoryLegend
            x={50}
            y={0}
            orientation="horizontal"
            gutter={16}
            {...LEGEND_PROPS}
            data={exerciseNames.map((name, index) => ({
              name,
              symbol: { fill: LINE_COLORS[index % LINE_COLORS.length] },
            }))}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default StrengthProgressionChart;
