/**
 * OneRepMaxChart.tsx
 * ==================
 * 
 * Bar chart component for displaying 1-rep max projections for key exercises
 * Part of the ClientProgressCharts modular system
 * 
 * FEATURES:
 * - Horizontal bar chart for better exercise name readability
 * - Gradient bar fills with strength-based color coding
 * - Interactive tooltips showing detailed lift information
 * - Sortable by weight, improvement, or alphabetical
 * - Mobile-optimized responsive design
 * - WCAG AA accessibility compliance
 */

import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { OneRepMaxChartProps, OneRepMaxDataPoint } from '../types/ClientProgressTypes';

// ==================== STYLED COMPONENTS ====================

const ChartContainer = styled(motion.div)`
  width: 100%;
  height: 350px;
  
  @media (max-width: 768px) {
    height: 300px;
  }
`;

const TooltipContainer = styled.div`
  background: linear-gradient(
    135deg,
    rgba(15, 23, 42, 0.95) 0%,
    rgba(30, 41, 59, 0.9) 100%
  );
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 12px;
  padding: 1rem;
  color: #e2e8f0;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  min-width: 200px;
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: #f59e0b;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const TooltipValue = styled.div`
  font-size: 1.25rem;
  font-weight: 700;
  color: #eab308;
  margin-bottom: 0.25rem;
`;

const TooltipDetail = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
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

const SortControls = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
`;

const SortButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.active ? '#f59e0b' : 'rgba(148, 163, 184, 0.3)'};
  background: ${props => props.active 
    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(234, 179, 8, 0.1))'
    : 'rgba(30, 41, 59, 0.5)'
  };
  color: ${props => props.active ? '#f59e0b' : '#94a3b8'};
  border-radius: 8px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: #f59e0b;
    color: #f59e0b;
  }
`;

// ==================== INTERFACES ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ==================== UTILITY FUNCTIONS ====================

const getBarColor = (weight: number, maxWeight: number): string => {
  const ratio = weight / maxWeight;
  
  if (ratio >= 0.8) {
    return 'url(#strongGradient)'; // Red-orange for strongest
  } else if (ratio >= 0.6) {
    return 'url(#moderateGradient)'; // Orange-yellow for moderate
  } else {
    return 'url(#lightGradient)'; // Blue-green for lighter
  }
};

const truncateExerciseName = (name: string, maxLength: number = 20): string => {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 3) + '...';
};

// ==================== COMPONENTS ====================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload as OneRepMaxDataPoint;
  
  return (
    <TooltipContainer>
      <TooltipLabel>{data.exercise}</TooltipLabel>
      <TooltipValue>{data.label}</TooltipValue>
      {data.improvement && (
        <TooltipDetail>
          {data.improvement > 0 ? '+' : ''}{data.improvement}% from last month
        </TooltipDetail>
      )}
      {data.category && (
        <TooltipDetail>Category: {data.category}</TooltipDetail>
      )}
      {data.date && (
        <TooltipDetail>
          Last PR: {new Date(data.date).toLocaleDateString()}
        </TooltipDetail>
      )}
    </TooltipContainer>
  );
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
    
    let sortedData = [...data];
    
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
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>No 1RM Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log some strength workouts to see your 1-rep max projections!
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

      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="horizontal"
            margin={{
              top: 20,
              right: 30,
              left: 80,
              bottom: 20,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(148, 163, 184, 0.2)"
              horizontal={true}
              vertical={false}
            />
            
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
              tickFormatter={(value) => `${value} lbs`}
            />
            
            <YAxis
              type="category"
              dataKey="displayName"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.3)' }}
              width={70}
            />
            
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
            )}
            
            <Bar
              dataKey="max"
              radius={[0, 4, 4, 0]}
              animationDuration={animate ? 1200 : 0}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.max, maxWeight)}
                />
              ))}
            </Bar>
            
            {/* Define gradients */}
            <defs>
              <linearGradient id="strongGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#dc2626" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.9} />
              </linearGradient>
              
              <linearGradient id="moderateGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#eab308" stopOpacity={0.7} />
              </linearGradient>
              
              <linearGradient id="lightGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </motion.div>
  );
};

export default OneRepMaxChart;