/**
 * OneRepMaxChart.tsx
 * ==================
 *
 * Horizontal bar chart for displaying 1-rep max projections for key exercises
 * Part of the ClientProgressCharts modular system
 *
 * FEATURES:
 * - Horizontal bar chart for better exercise name readability
 * - Gradient bar fills with strength-based color coding
 * - Interactive tooltips showing detailed lift information
 * - Sortable by weight, improvement, or alphabetical
 * - Mobile-optimized responsive design
 * - WCAG AA accessibility compliance
 *
 * Uses Victory (v37.3.6) for cross-platform compatibility.
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart,
  VictoryBar,
  VictoryAxis,
  VictoryTooltip,
} from 'victory';
import { OneRepMaxChartProps, OneRepMaxDataPoint } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 350px;

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 350px;
  color: #b8c9db;
  text-align: center;
`;

const SortControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const SortButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.active ? '#C6A84B' : 'rgba(96, 192, 240, 0.3)'};
  background: ${props => props.active
    ? 'linear-gradient(135deg, rgba(198, 168, 75, 0.2), rgba(198, 168, 75, 0.1))'
    : 'rgba(0, 48, 128, 0.5)'
  };
  color: ${props => props.active ? '#C6A84B' : '#b8c9db'};
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #C6A84B;
    color: #C6A84B;
  }
`;

// ==================== UTILITY FUNCTIONS ====================

const truncateExerciseName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
};

// ==================== MAIN COMPONENT ====================

const OneRepMaxChart: React.FC<OneRepMaxChartProps> = ({
  data,
  height = 350,
  showTooltip = true,
  showLegend = false,
  animate = true,
  maxExercises = 8,
  sortBy = 'weight',
  theme,
  className
}) => {
  // ==================== STATE ====================

  const [currentSort, setCurrentSort] = React.useState<'weight' | 'improvement' | 'alphabetical'>(sortBy);

  // ==================== COMPUTED VALUES ====================

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sortedData = [...data];

    // Apply sorting
    switch (currentSort) {
      case 'weight':
        sortedData.sort((a, b) => b.max - a.max);
        break;
      case 'improvement':
        sortedData.sort((a, b) => (b.improvement || 0) - (a.improvement || 0));
        break;
      case 'alphabetical':
        sortedData.sort((a, b) => a.exercise.localeCompare(b.exercise));
        break;
    }

    // Limit to max exercises and format for display
    return sortedData
      .slice(0, maxExercises)
      .map((point, index) => ({
        ...point,
        displayName: truncateExerciseName(point.exercise),
        x: truncateExerciseName(point.exercise),
        y: point.max,
        sortIndex: index
      }));
  }, [data, currentSort, maxExercises]);

  const maxWeight = useMemo(() => {
    if (!chartData.length) return 0;
    return Math.max(...chartData.map(d => d.max));
  }, [chartData]);

  // ==================== EVENT HANDLERS ====================

  const handleSortChange = (newSort: typeof currentSort) => {
    setCurrentSort(newSort);
  };

  // ==================== RENDER ====================

  if (!data || data.length === 0) {
    return (
      <ChartContainer className={className}>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No 1RM Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log some strength workouts to see your 1-rep max projections!
            </p>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  // Color each bar based on strength ratio
  const getBarColor = (value: number): string => {
    const ratio = value / maxWeight;
    if (ratio >= 0.8) return '#8B5CF6';
    if (ratio >= 0.6) return '#C6A84B';
    return '#50A0F0';
  };

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Sort Controls */}
      <SortControls>
        <SortButton
          active={currentSort === 'weight'}
          onClick={() => handleSortChange('weight')}
        >
          By Weight
        </SortButton>
        <SortButton
          active={currentSort === 'improvement'}
          onClick={() => handleSortChange('improvement')}
        >
          By Progress
        </SortButton>
        <SortButton
          active={currentSort === 'alphabetical'}
          onClick={() => handleSortChange('alphabetical')}
        >
          A-Z
        </SortButton>
      </SortControls>

      <ChartContainer
        initial={animate ? { opacity: 0, y: 20 } : undefined}
        animate={animate ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <VictoryChart
          horizontal
          padding={{ top: 10, right: 40, left: 110, bottom: 40 }}
          domainPadding={{ x: 15 }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
        >
          {/* X Axis (values — appears at bottom for horizontal chart) */}
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
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

          {/* Y Axis (categories — appears on left for horizontal chart) */}
          <VictoryAxis
            style={{
              axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
              tickLabels: {
                fill: '#E0ECF4',
                fontSize: 11,
                fontFamily: "'Fira Code', monospace",
              },
              grid: { stroke: 'none' },
            }}
          />

          {/* Bars */}
          <VictoryBar
            data={chartData}
            barRatio={0.7}
            cornerRadius={{ topLeft: 4, topRight: 4 }}
            style={{
              data: {
                fill: ({ datum }) => getBarColor(datum.y),
                cursor: 'pointer',
              },
            }}
            labels={({ datum }) => {
              const d = datum as OneRepMaxDataPoint & { y: number };
              const parts = [`${d.exercise}: ${d.y} lbs`];
              if (d.improvement) {
                parts.push(`${d.improvement > 0 ? '+' : ''}${d.improvement}% from last month`);
              }
              if (d.category) parts.push(`Category: ${d.category}`);
              return parts.join('\n');
            }}
            labelComponent={
              showTooltip ? (
                <VictoryTooltip
                  flyoutStyle={{
                    fill: '#141419',
                    stroke: 'rgba(139, 92, 246, 0.3)',
                    strokeWidth: 1,
                  }}
                  style={{
                    fill: '#E0ECF4',
                    fontSize: 11,
                    fontFamily: "'Fira Code', monospace",
                  }}
                  cornerRadius={8}
                  flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                />
              ) : undefined
            }
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default OneRepMaxChart;
