/**
 * NASMCategoryRadar.tsx
 * =====================
 *
 * Polar radar chart for displaying NASM category focus over time
 * Part of the ClientProgressCharts modular system
 *
 * FEATURES:
 * - Polar radar chart showing NASM category distribution
 * - Color-coded category emphasis levels
 * - Interactive tooltips with detailed category information
 * - Percentage breakdown of training focus
 * - 30-day rolling analysis window
 * - Mobile-optimized responsive design
 * - WCAG AA accessibility compliance
 *
 * Uses Victory polar charts for cross-platform compatibility.
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  VictoryChart,
  VictoryArea,
  VictoryPolarAxis,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { NASMRadarChartProps, NASMCategoryDataPoint } from '../types/ClientProgressTypes';
import { StyledBox } from '@/components/ui/StyledBox';
import { victoryStyleProps } from '@/components/Charts/victoryStyleProps';

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
  color: #94a3b8;
  text-align: center;
`;

const SummaryContainer = styled.div`
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const SummaryItem = styled.div`
  text-align: center;
  padding: 0.75rem;
  background: linear-gradient(
    135deg,
    rgba(30, 41, 59, 0.6) 0%,
    rgba(51, 65, 85, 0.4) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-width: 100px;
`;

const SummaryLabel = styled.div`
  font-size: 0.75rem;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 500;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #06b6d4;
`;

const CategoryList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 1rem;
`;

const CategoryItem = styled.div<{ intensity: 'high' | 'medium' | 'low' }>`
  display: flex;
  justify-content: between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: ${props => {
    switch (props.intensity) {
      case 'high': return 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.1))';
      case 'medium': return 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(52, 211, 153, 0.1))';
      case 'low': return 'linear-gradient(135deg, rgba(107, 114, 128, 0.2), rgba(156, 163, 175, 0.1))';
    }
  }};
  border: 1px solid ${props => {
    switch (props.intensity) {
      case 'high': return 'rgba(59, 130, 246, 0.3)';
      case 'medium': return 'rgba(16, 185, 129, 0.3)';
      case 'low': return 'rgba(107, 114, 128, 0.3)';
    }
  }};
  border-radius: 8px;
  font-size: 0.875rem;
`;

const CategoryName = styled.span`
  color: #e2e8f0;
  font-weight: 500;
`;

const CategoryPercent = styled.span<{ intensity: 'high' | 'medium' | 'low' }>`
  color: ${props => {
    switch (props.intensity) {
      case 'high': return '#3b82f6';
      case 'medium': return '#10b981';
      case 'low': return '#6b7280';
    }
  }};
  font-weight: 600;
`;

// ==================== UTILITY FUNCTIONS ====================

const getCategoryIntensity = (value: number, maxValue: number): 'high' | 'medium' | 'low' => {
  const intensity = value / maxValue;
  if (intensity >= 0.7) return 'high';
  if (intensity >= 0.4) return 'medium';
  return 'low';
};

const truncateCategoryName = (name: string): string => {
  const nameMap: { [key: string]: string } = {
    'Core Stability': 'Core',
    'Balance Training': 'Balance',
    'Power Development': 'Power',
    'Strength Training': 'Strength',
    'Muscular Endurance': 'Endurance',
    'Flexibility': 'Flexibility',
    'Cardiovascular': 'Cardio',
    'Functional Movement': 'Functional',
    'Corrective Exercise': 'Corrective',
    'General Fitness': 'General'
  };

  return nameMap[name] || name;
};

// ==================== MAIN COMPONENT ====================

const NASMCategoryRadar: React.FC<NASMRadarChartProps> = ({
  data,
  height: _height = 350,
  showTooltip = true,
  showLegend: _showLegend = false,
  animate = true,
  showPercentages = true,
  maxValue,
  theme: _theme,
  className
}) => {
  // ==================== COMPUTED VALUES ====================

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const computedMaxValue = maxValue || Math.max(...data.map(d => d.value));

    return data
      .filter(item => item.value > 0)
      .map((item, index) => ({
        ...item,
        category: truncateCategoryName(item.category),
        fullMark: computedMaxValue,
        percentage: showPercentages ? (item.value / totalValue) * 100 : undefined,
        intensity: getCategoryIntensity(item.value, computedMaxValue),
        x: index,
        y: item.value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, maxValue, showPercentages]);

  const totalExercises = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const dominantCategory = useMemo(() => {
    if (!chartData.length) return null;
    return chartData[0];
  }, [chartData]);

  const categoryCount = useMemo(() => {
    return chartData.filter(item => item.value > 0).length;
  }, [chartData]);

  const radarMaxVal = useMemo(() => {
    if (!chartData.length) return 100;
    return Math.max(...chartData.map(d => d.value)) * 1.1 || 100;
  }, [chartData]);

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
            <StyledBox as="h4" $style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>No Category Data</StyledBox>
            <StyledBox as="p" $style={{ margin: 0, fontSize: '0.875rem' }}>
              Log more workouts to see your NASM category distribution!
            </StyledBox>
          </motion.div>
        </NoDataContainer>
      </ChartContainer>
    );
  }

  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* Summary Stats */}
      <SummaryContainer>
        <SummaryItem>
          <SummaryLabel>Total Exercises</SummaryLabel>
          <SummaryValue>{totalExercises}</SummaryValue>
        </SummaryItem>

        <SummaryItem>
          <SummaryLabel>Categories</SummaryLabel>
          <SummaryValue>{categoryCount}</SummaryValue>
        </SummaryItem>

        {dominantCategory && (
          <SummaryItem>
            <SummaryLabel>Primary Focus</SummaryLabel>
            <StyledBox as={SummaryValue} $style={{ fontSize: '1rem' }}>
              {dominantCategory.category}
            </StyledBox>
          </SummaryItem>
        )}
      </SummaryContainer>

      <ChartContainer>
        <VictoryChart
          polar
          padding={{ top: 60, right: 60, bottom: 60, left: 60 }}
          domain={{ y: [0, radarMaxVal] }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            showTooltip ? (
              <VictoryVoronoiContainer
                labels={({ datum }) => {
                  const d = datum as NASMCategoryDataPoint & { percentage?: number };
                  const parts = [
                    d.category,
                    `${d.value} exercise${d.value !== 1 ? 's' : ''}`,
                  ];
                  if (d.percentage) {
                    parts.push(`${d.percentage.toFixed(1)}% of total`);
                  }
                  return parts.join('\n');
                }}
                labelComponent={
                  <VictoryTooltip
                    flyoutStyle={{
                      fill: '#141419',
                      stroke: 'rgba(139, 92, 246, 0.3)',
                      strokeWidth: 1,
                    }}
                    {...victoryStyleProps({
                      fill: '#E0ECF4',
                      fontSize: 11,
                      fontFamily: "'Fira Code', monospace",
                    })}
                    cornerRadius={8}
                    flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  />
                }
              />
            ) : undefined
          }
        >
          {/* Angular axis (category labels) */}
          <VictoryPolarAxis
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.category)}
            {...victoryStyleProps({
              axis: { stroke: 'rgba(148, 163, 184, 0.2)' },
              tickLabels: {
                fill: '#94a3b8',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: "'Fira Code', monospace",
                padding: 15,
              },
              grid: {
                stroke: 'rgba(148, 163, 184, 0.15)',
                strokeDasharray: '4,4',
              },
            })}
          />

          {/* Radial axis (values) */}
          <VictoryPolarAxis
            dependentAxis
            {...victoryStyleProps({
              axis: { stroke: 'none' },
              tickLabels: {
                fill: '#64748b',
                fontSize: 9,
                fontFamily: "'Fira Code', monospace",
              },
              grid: {
                stroke: 'rgba(148, 163, 184, 0.1)',
              },
            })}
            tickCount={4}
          />

          {/* Data area */}
          <VictoryArea
            data={chartData}
            {...victoryStyleProps({
              data: {
                fill: '#50A0F0',
                fillOpacity: 0.2,
                stroke: '#50A0F0',
                strokeWidth: 3,
              },
            })}
          />
        </VictoryChart>
      </ChartContainer>

      {/* Category Breakdown */}
      {showPercentages && (
        <CategoryList>
          {chartData.map((item, index) => (
            <CategoryItem
              key={index}
              intensity={item.intensity}
            >
              <CategoryName>{item.category}</CategoryName>
              <CategoryPercent intensity={item.intensity}>
                {item.percentage?.toFixed(0)}%
              </CategoryPercent>
            </CategoryItem>
          ))}
        </CategoryList>
      )}
    </motion.div>
  );
};

export default NASMCategoryRadar;
