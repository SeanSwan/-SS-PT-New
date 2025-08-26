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
// Using CSS-based charts instead of recharts for build compatibility
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
        {/* CSS-based Horizontal Bar Chart */}
        <div style={{ width: '100%', height: '100%', position: 'relative', padding: '20px' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            height: '100%',
            paddingLeft: '80px'
          }}>
            {chartData.map((exercise, index) => {
              const percentage = (exercise.max / maxWeight) * 100;
              const barColor = exercise.max >= maxWeight * 0.8 ? '#dc2626' :
                             exercise.max >= maxWeight * 0.6 ? '#f59e0b' : '#3b82f6';
              
              return (
                <div key={exercise.exercise} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  position: 'relative',
                  marginBottom: '8px'
                }}>
                  {/* Exercise name */}
                  <div style={{
                    position: 'absolute',
                    left: '-75px',
                    width: '70px',
                    fontSize: '11px',
                    color: '#94a3b8',
                    textAlign: 'right',
                    paddingRight: '8px'
                  }}>
                    {exercise.displayName}
                  </div>
                  
                  {/* Bar container */}
                  <div style={{
                    flex: 1,
                    height: '24px',
                    background: 'rgba(148, 163, 184, 0.1)',
                    borderRadius: '0 4px 4px 0',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Bar fill */}
                    <motion.div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${barColor}CC, ${barColor}99)`,
                        borderRadius: '0 4px 4px 0',
                        position: 'relative'
                      }}
                      initial={animate ? { width: 0 } : undefined}
                      animate={animate ? { width: `${percentage}%` } : undefined}
                      transition={{ duration: 1.2, delay: index * 0.1, ease: 'easeOut' }}
                      title={`${exercise.exercise}: ${exercise.max} lbs${exercise.improvement ? ` (${exercise.improvement > 0 ? '+' : ''}${exercise.improvement}%)` : ''}`}
                    />
                    
                    {/* Value label */}
                    <div style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: percentage > 50 ? 'white' : '#94a3b8',
                      fontWeight: '600',
                      textShadow: percentage > 50 ? '0 1px 2px rgba(0,0,0,0.5)' : 'none'
                    }}>
                      {exercise.max} lbs
                    </div>
                  </div>
                  
                  {/* Improvement indicator */}
                  {exercise.improvement && (
                    <div style={{
                      marginLeft: '8px',
                      fontSize: '10px',
                      color: exercise.improvement > 0 ? '#10b981' : '#ef4444',
                      fontWeight: '600'
                    }}>
                      {exercise.improvement > 0 ? '+' : ''}{exercise.improvement}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Chart title and stats */}
          <div style={{
            position: 'absolute',
            top: '10px',
            right: '20px',
            background: 'rgba(15, 23, 42, 0.8)',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: '#e2e8f0',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(148, 163, 184, 0.3)'
          }}>
            <div style={{ color: '#f59e0b', fontWeight: '600' }}>Max: {maxWeight} lbs</div>
            <div style={{ color: '#94a3b8' }}>{chartData.length} exercises</div>
          </div>
          
          {/* X-axis grid lines */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '80px',
            right: '20px',
            height: 'calc(100% - 40px)',
            pointerEvents: 'none'
          }}>
            {[0.2, 0.4, 0.6, 0.8, 1].map((ratio, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${ratio * 100}%`,
                  top: '0',
                  bottom: '0',
                  width: '1px',
                  background: 'rgba(148, 163, 184, 0.2)',
                  zIndex: 1
                }}
              />
            ))}
          </div>
        </div>
      </ChartContainer>
    </motion.div>
  );
};

export default OneRepMaxChart;