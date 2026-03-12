/**
 * FormQualityChart.tsx
 * ====================
 *
 * Composed chart component for displaying form quality ratings over time
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
 * THEME: Enchanted Apex — Crystalline Swan
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine
} from 'recharts';
import { FormQualityChartProps, FormQualityDataPoint } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 320px;

  @media (max-width: 768px) {
    height: 280px;
  }
`;

const TooltipContainer = styled.div`
  background: linear-gradient(
    135deg,
    rgba(0, 32, 96, 0.95) 0%,
    rgba(0, 48, 128, 0.9) 100%
  );
  border: 1px solid rgba(96, 192, 240, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #E0ECF4;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: #8B5CF6;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-family: 'Fira Code', monospace;
`;

const TooltipValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const TooltipDetail = styled.div`
  font-size: 0.875rem;
  color: #b8c9db;
  margin-top: 0.25rem;
  font-family: 'Fira Code', monospace;
`;

const QualityBadge = styled.span<{ quality: string }>`
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  background: ${props => {
    switch (props.quality) {
      case 'excellent': return 'linear-gradient(135deg, #C6A84B, #a08930)';
      case 'good': return 'linear-gradient(135deg, #60C0F0, #50A0F0)';
      case 'fair': return 'linear-gradient(135deg, #C6A84B, #a08930)';
      case 'poor': return 'linear-gradient(135deg, #ef4444, #dc2626)';
      default: return 'linear-gradient(135deg, #6b7280, #4b5563)';
    }
  }};
  color: white;
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

// ==================== INTERFACES ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

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

// ==================== COMPONENTS ====================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload as FormQualityDataPoint;
  const quality = getFormQuality(data.averageForm);

  return (
    <TooltipContainer>
      <TooltipLabel>
        {new Date(label!).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        })}
      </TooltipLabel>
      <TooltipValue>
        <span style={{ color: getFormQualityColor(data.averageForm) }}>
          {generateStars(data.averageForm)} {data.averageForm.toFixed(1)}/5
        </span>
        <QualityBadge quality={quality}>{quality}</QualityBadge>
      </TooltipValue>
      <TooltipDetail>
        {data.totalSets} sets across {data.sessionCount} session{data.sessionCount !== 1 ? 's' : ''}
      </TooltipDetail>
    </TooltipContainer>
  );
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
  theme,
  className
}) => {
  // ==================== COMPUTED VALUES ====================

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Sort data by date and ensure proper formatting
    return data
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(point => ({
        ...point,
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

  const currentTrend = useMemo(() => {
    if (chartData.length < 2) return 'stable';

    const recent = chartData.slice(-3);
    const older = chartData.slice(0, -3);

    if (recent.length === 0 || older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, d) => sum + d.averageForm, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.averageForm, 0) / older.length;

    if (recentAvg > olderAvg + 0.2) return 'improving';
    if (recentAvg < olderAvg - 0.2) return 'declining';
    return 'stable';
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
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#b8c9db' }}>No Form Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Get your trainer to rate your form during workouts!
            </p>
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

      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(96, 192, 240, 0.1)"
              vertical={false}
            />

            <XAxis
              dataKey="displayDate"
              stroke="#b8c9db"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(96, 192, 240, 0.3)' }}
              tick={{ fontFamily: "'Fira Code', monospace" }}
            />

            <YAxis
              domain={[1, 5]}
              stroke="#b8c9db"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(96, 192, 240, 0.3)' }}
              tickFormatter={(value) => `${value}\u2605`}
              tick={{ fontFamily: "'Fira Code', monospace" }}
            />

            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: 'rgba(139, 92, 246, 0.5)', strokeWidth: 2 }}
              />
            )}

            {/* Reference areas for quality zones */}
            <ReferenceArea y1={4.5} y2={5} fill="rgba(198, 168, 75, 0.1)" />
            <ReferenceArea y1={3.5} y2={4.5} fill="rgba(96, 192, 240, 0.1)" />
            <ReferenceArea y1={2.5} y2={3.5} fill="rgba(198, 168, 75, 0.08)" />
            <ReferenceArea y1={1} y2={2.5} fill="rgba(239, 68, 68, 0.1)" />

            {/* Target line */}
            <ReferenceLine
              y={targetFormRating}
              stroke="rgba(139, 92, 246, 0.8)"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: `Target: ${targetFormRating}\u2605`,
                position: 'topRight',
                fill: '#8B5CF6',
                fontSize: 12
              }}
            />

            {/* Average line */}
            {showAverage && (
              <ReferenceLine
                y={averageFormRating}
                stroke="rgba(96, 192, 240, 0.6)"
                strokeDasharray="3 3"
                label={{
                  value: `Avg: ${averageFormRating.toFixed(1)}\u2605`,
                  position: 'bottomRight',
                  fill: '#60C0F0',
                  fontSize: 12
                }}
              />
            )}

            {/* Area under the line */}
            <Area
              type="monotone"
              dataKey="averageForm"
              fill="url(#formGradient)"
              stroke="none"
              animationDuration={animate ? 1500 : 0}
            />

            {/* Main line */}
            <Line
              type="monotone"
              dataKey="averageForm"
              stroke="url(#formLineGradient)"
              strokeWidth={3}
              dot={{
                fill: '#8B5CF6',
                strokeWidth: 2,
                stroke: '#7c3aed',
                r: 4
              }}
              activeDot={{
                r: 6,
                fill: '#8B5CF6',
                stroke: '#E0ECF4',
                strokeWidth: 2
              }}
              animationDuration={animate ? 1500 : 0}
              animationEasing="ease-out"
            />

            {/* Define gradients */}
            <defs>
              <linearGradient id="formGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#c084fc" stopOpacity={0.1} />
              </linearGradient>

              <linearGradient id="formLineGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#a855f7" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#c084fc" stopOpacity={0.7} />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default FormQualityChart;
