/**
 * NASMCategoryRadar.tsx
 * =====================
 * 
 * Radar chart component for displaying NASM category focus over time
 * Part of the ClientProgressCharts modular system
 * 
 * FEATURES:
 * - Radar/spider chart showing NASM category distribution
 * - Color-coded category emphasis levels
 * - Interactive tooltips with detailed category information
 * - Percentage breakdown of training focus
 * - 30-day rolling analysis window
 * - Mobile-optimized responsive design
 * - WCAG AA accessibility compliance
 */

import React, { useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { NASMRadarChartProps, NASMCategoryDataPoint } from '../types/ClientProgressTypes';

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
  min-width: 180px;
`;

const TooltipLabel = styled.div`
  font-weight: 600;
  color: #06b6d4;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
`;

const TooltipValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #22d3ee;
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

// ==================== INTERFACES ====================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// ==================== UTILITY FUNCTIONS ====================

const getCategoryColor = (value: number, maxValue: number): string => {
  const intensity = value / maxValue;
  
  if (intensity >= 0.7) {
    return '#3b82f6'; // High intensity - blue
  } else if (intensity >= 0.4) {
    return '#10b981'; // Medium intensity - green
  } else if (intensity >= 0.1) {
    return '#f59e0b'; // Low intensity - orange
  } else {
    return '#6b7280'; // Minimal - gray
  }
};

const getCategoryIntensity = (value: number, maxValue: number): 'high' | 'medium' | 'low' => {
  const intensity = value / maxValue;
  
  if (intensity >= 0.7) return 'high';
  if (intensity >= 0.4) return 'medium';
  return 'low';
};

const truncateCategoryName = (name: string): string => {
  // Shorten common NASM category names for better display
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

// ==================== COMPONENTS ====================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0]?.payload as NASMCategoryDataPoint;
  
  return (
    <TooltipContainer>
      <TooltipLabel>{data.category}</TooltipLabel>
      <TooltipValue>
        {data.value} exercise{data.value !== 1 ? 's' : ''}
      </TooltipValue>
      {data.percentage && (
        <TooltipDetail>
          {data.percentage.toFixed(1)}% of total training
        </TooltipDetail>
      )}
    </TooltipContainer>
  );
};

// ==================== MAIN COMPONENT ====================

const NASMCategoryRadar: React.FC<NASMRadarChartProps> = ({
  data,
  height = 350,
  showTooltip = true,
  showLegend = false,
  animate = true,
  showPercentages = true,
  maxValue,
  theme,
  className
}) => {
  // ==================== COMPUTED VALUES ====================
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);
    const computedMaxValue = maxValue || Math.max(...data.map(d => d.value));
    
    return data
      .filter(item => item.value > 0) // Only show categories with data
      .map(item => ({
        ...item,
        category: truncateCategoryName(item.category),
        fullMark: computedMaxValue,
        percentage: showPercentages ? (item.value / totalValue) * 100 : undefined,
        color: getCategoryColor(item.value, computedMaxValue),
        intensity: getCategoryIntensity(item.value, computedMaxValue)
      }))
      .sort((a, b) => b.value - a.value); // Sort by value for better visualization
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
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#64748b' }}>No Category Data</h4>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>
              Log more workouts to see your NASM category distribution!
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
            <SummaryValue style={{ fontSize: '1rem' }}>
              {dominantCategory.category}
            </SummaryValue>
          </SummaryItem>
        )}
      </SummaryContainer>

      <ChartContainer>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart
            data={chartData}
            margin={{
              top: 40,
              right: 40,
              bottom: 40,
              left: 40,
            }}
          >
            <PolarGrid 
              stroke="rgba(148, 163, 184, 0.3)"
              radialLines={true}
            />
            
            <PolarAngleAxis 
              dataKey="category"
              tick={{ 
                fill: '#94a3b8', 
                fontSize: 11,
                fontWeight: 500
              }}
              className="radar-category-axis"
            />
            
            <PolarRadiusAxis 
              angle={90}
              domain={[0, 'dataMax']}
              tick={{ 
                fill: '#64748b', 
                fontSize: 10 
              }}
              tickCount={4}
            />
            
            {showTooltip && (
              <Tooltip content={<CustomTooltip />} />
            )}
            
            <Radar
              name="Exercise Count"
              dataKey="value"
              stroke="url(#radarGradient)"
              fill="url(#radarFillGradient)"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: '#06b6d4',
                stroke: '#0891b2',
                strokeWidth: 2
              }}
              animationDuration={animate ? 1500 : 0}
              animationEasing="ease-out"
            />
            
            {/* Define gradients */}
            <defs>
              <linearGradient id="radarGradient" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.7} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
              </linearGradient>
              
              <radialGradient id="radarFillGradient">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.1} />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.1} />
              </radialGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
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