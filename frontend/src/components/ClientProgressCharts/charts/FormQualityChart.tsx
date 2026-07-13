/**
 * FormQualityChart.tsx
 * ====================
 *
 * Chart component for displaying form quality ratings over time
 * Part of the ClientProgressCharts modular system
 *
 * FEATURES:
 * - Line chart with area fill showing form quality trend
 * - Target form rating reference line (configurable)
 * - Color-coded quality zones (poor, fair, good, excellent)
 * - Interactive tooltips with session details
 * - Average form rating overlay
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
  VictoryLine,
  VictoryArea,
  VictoryAxis,
  VictoryScatter,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { FormQualityChartProps, FormQualityDataPoint } from '../types/ClientProgressTypes';
import { DETAILED_TOOLTIP_PROPS as TOOLTIP_PROPS } from './detailedChartTheme';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)<{ $height: number }>`
  width: 100%;
  height: ${props => props.$height}px;

  @media (max-width: 768px) {
    height: min(${props => props.$height}px, 280px);
  }
`;

const NoDataContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 320px;
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

const LegendContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #b8c9db;
`;

const LegendDot = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
`;

// ==================== VICTORY STYLE PROPS ====================

const X_AXIS_PROPS = {
  style: {
    axis: { stroke: 'rgba(96, 192, 240, 0.3)' },
    tickLabels: {
      fill: '#E0ECF4',
      fontSize: 11,
      fontFamily: "'Fira Code', monospace",
    },
    grid: { stroke: 'none' },
  },
};

const Y_AXIS_PROPS = {
  style: {
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
  },
};

const EXCELLENT_ZONE_PROPS = {
  style: { data: { fill: 'rgba(198, 168, 75, 0.1)', stroke: 'none' } },
};

const GOOD_ZONE_PROPS = {
  style: { data: { fill: 'rgba(96, 192, 240, 0.08)', stroke: 'none' } },
};

const FAIR_ZONE_PROPS = {
  style: { data: { fill: 'rgba(198, 168, 75, 0.06)', stroke: 'none' } },
};

const POOR_ZONE_PROPS = {
  style: { data: { fill: 'rgba(239, 68, 68, 0.08)', stroke: 'none' } },
};

const TARGET_LINE_PROPS = {
  style: {
    data: {
      stroke: 'rgba(139, 92, 246, 0.8)',
      strokeWidth: 2,
      strokeDasharray: '5,5',
    },
  },
};

const AVERAGE_LINE_PROPS = {
  style: {
    data: {
      stroke: 'rgba(96, 192, 240, 0.6)',
      strokeWidth: 1,
      strokeDasharray: '3,3',
    },
  },
};

const FORM_AREA_PROPS = {
  style: {
    data: { fill: 'url(#victoryFormGradient)', stroke: 'none' },
  },
};

const FORM_LINE_PROPS = {
  style: {
    data: { stroke: '#8B5CF6', strokeWidth: 3 },
  },
};

const FORM_SCATTER_PROPS = {
  style: {
    data: { fill: '#8B5CF6', stroke: '#7c3aed', strokeWidth: 2 },
  },
};

// ==================== UTILITY FUNCTIONS ====================

const getFormQuality = (rating: number): string => {
  if (rating >= 4.5) return 'excellent';
  if (rating >= 3.5) return 'good';
  if (rating >= 2.5) return 'fair';
  return 'poor';
};

const getFormQualityColor = (rating: number): string => {
  if (rating >= 4.5) return '#C6A84B';
  if (rating >= 3.5) return '#60C0F0';
  if (rating >= 2.5) return '#C6A84B';
  return '#ef4444';
};

const generateStars = (rating: number): string => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '\u2605'.repeat(fullStars) +
         (hasHalfStar ? '\u2606' : '') +
         '\u2606'.repeat(emptyStars);
};

// ==================== MAIN COMPONENT ====================

const FormQualityChart: React.FC<FormQualityChartProps> = ({
  data,
  height = 320,
  showTooltip = true,
  showLegend = true,
  animate = true,
  showAverage = true,
  targetFormRating = 4.0,
  className
}) => {
  // ==================== COMPUTED VALUES ====================

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((point, index) => ({
        ...point,
        x: index,
        y: point.averageForm,
        displayDate: new Date(point.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        }),
        color: getFormQualityColor(point.averageForm),
        quality: getFormQuality(point.averageForm)
      }));
  }, [data]);

  const averageFormRating = useMemo(() => {
    if (!chartData.length) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.averageForm, 0);
    return sum / chartData.length;
  }, [chartData]);

  // ==================== RENDER ====================

  if (!data || data.length === 0) {
    return (
      <ChartContainer className={className} $height={height}>
        <NoDataContainer>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <NoDataTitle>No Form Data</NoDataTitle>
            <NoDataCopy>
              Get your trainer to rate your form during workouts!
            </NoDataCopy>
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
      {/* Legend */}
      {showLegend && (
        <LegendContainer>
          <LegendItem>
            <LegendDot color="#C6A84B" />
            Excellent (4.5+)
          </LegendItem>
          <LegendItem>
            <LegendDot color="#60C0F0" />
            Good (3.5-4.4)
          </LegendItem>
          <LegendItem>
            <LegendDot color="#C6A84B" />
            Fair (2.5-3.4)
          </LegendItem>
          <LegendItem>
            <LegendDot color="#ef4444" />
            Poor (1.0-2.4)
          </LegendItem>
        </LegendContainer>
      )}

      <ChartContainer $height={height}>
        <VictoryChart
          padding={{ top: 30, right: 30, left: 50, bottom: 50 }}
          domain={{ y: [1, 5] }}
          animate={animate ? { duration: 800, easing: 'cubicInOut' } : undefined}
          containerComponent={
            showTooltip ? (
              <VictoryVoronoiContainer
                labels={({ datum }) => {
                  const d = datum as FormQualityDataPoint & { displayDate: string; quality: string };
                  return [
                    d.displayDate,
                    `${generateStars(d.averageForm)} ${d.averageForm.toFixed(1)}/5 [${d.quality}]`,
                    `${d.totalSets} sets / ${d.sessionCount} session${d.sessionCount !== 1 ? 's' : ''}`,
                  ].join('\n');
                }}
                labelComponent={
                  <VictoryTooltip
                    {...TOOLTIP_PROPS}
                    cornerRadius={8}
                    flyoutPadding={{ top: 8, bottom: 8, left: 12, right: 12 }}
                  />
                }
              />
            ) : undefined
          }
        >
          {/* Gradient defs */}
          <defs>
            <linearGradient id="victoryFormGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#a855f7" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#c084fc" stopOpacity={0.1} />
            </linearGradient>
          </defs>

          {/* X Axis */}
          <VictoryAxis
            {...X_AXIS_PROPS}
            tickValues={chartData.map((_, i) => i)}
            tickFormat={chartData.map(d => d.displayDate)}
          />

          {/* Y Axis */}
          <VictoryAxis
            dependentAxis
            {...Y_AXIS_PROPS}
            tickFormat={(t: number) => `${t}\u2605`}
          />

          {/* Quality zone backgrounds — rendered as thin areas */}
          {/* Excellent zone 4.5-5 */}
          <VictoryArea
            data={[
              { x: chartData[0]?.x ?? 0, y: 5, y0: 4.5 },
              { x: chartData[chartData.length - 1]?.x ?? 1, y: 5, y0: 4.5 },
            ]}
            {...EXCELLENT_ZONE_PROPS}
          />
          {/* Good zone 3.5-4.5 */}
          <VictoryArea
            data={[
              { x: chartData[0]?.x ?? 0, y: 4.5, y0: 3.5 },
              { x: chartData[chartData.length - 1]?.x ?? 1, y: 4.5, y0: 3.5 },
            ]}
            {...GOOD_ZONE_PROPS}
          />
          {/* Fair zone 2.5-3.5 */}
          <VictoryArea
            data={[
              { x: chartData[0]?.x ?? 0, y: 3.5, y0: 2.5 },
              { x: chartData[chartData.length - 1]?.x ?? 1, y: 3.5, y0: 2.5 },
            ]}
            {...FAIR_ZONE_PROPS}
          />
          {/* Poor zone 1-2.5 */}
          <VictoryArea
            data={[
              { x: chartData[0]?.x ?? 0, y: 2.5, y0: 1 },
              { x: chartData[chartData.length - 1]?.x ?? 1, y: 2.5, y0: 1 },
            ]}
            {...POOR_ZONE_PROPS}
          />

          {/* Target reference line */}
          <VictoryLine
            data={[
              { x: chartData[0]?.x ?? 0, y: targetFormRating },
              { x: chartData[chartData.length - 1]?.x ?? 1, y: targetFormRating },
            ]}
            {...TARGET_LINE_PROPS}
          />

          {/* Average reference line */}
          {showAverage && (
            <VictoryLine
              data={[
                { x: chartData[0]?.x ?? 0, y: averageFormRating },
                { x: chartData[chartData.length - 1]?.x ?? 1, y: averageFormRating },
              ]}
              {...AVERAGE_LINE_PROPS}
            />
          )}

          {/* Area fill under the data line */}
          <VictoryArea
            data={chartData}
            interpolation="monotoneX"
            {...FORM_AREA_PROPS}
          />

          {/* Main data line */}
          <VictoryLine
            data={chartData}
            interpolation="monotoneX"
            {...FORM_LINE_PROPS}
          />

          {/* Data points */}
          <VictoryScatter
            data={chartData}
            size={4}
            {...FORM_SCATTER_PROPS}
          />
        </VictoryChart>
      </ChartContainer>
    </motion.div>
  );
};

export default FormQualityChart;
