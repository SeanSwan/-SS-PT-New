/**
 * Trainer Performance Bar Chart Component
 * =======================================
 * Comprehensive trainer analytics visualization using Recharts
 * 
 * Displays trainer performance metrics including revenue, sessions,
 * ratings, and social engagement with interactive features.
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import { Users, Star, TrendingUp, Award } from 'lucide-react';

interface TrainerPerformanceData {
  name: string;
  revenue: number;
  sessions: number;
  rating: number;
  clients: number;
  socialEngagement: number;
  utilizationRate: number;
  retention: number;
  nasmCompliance: number;
}

interface TrainerPerformanceBarChartProps {
  data: TrainerPerformanceData[];
  height?: number;
  metric?: 'revenue' | 'sessions' | 'rating' | 'utilization';
  showComparison?: boolean;
  sortBy?: 'revenue' | 'sessions' | 'rating' | 'name';
}

const TrainerPerformanceBarChart: React.FC<TrainerPerformanceBarChartProps> = ({
  data,
  height = 250,
  metric = 'revenue',
  showComparison = true,
  sortBy = 'revenue'
}) => {
  // Sort data based on selected metric
  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.revenue - a.revenue;
        case 'sessions':
          return b.sessions - a.sessions;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.revenue - a.revenue;
      }
    });
  }, [data, sortBy]);

  // Calculate average for reference line
  const average = React.useMemo(() => {
    if (sortedData.length === 0) return 0;
    const total = sortedData.reduce((sum, trainer) => sum + trainer[metric], 0);
    return total / sortedData.length;
  }, [sortedData, metric]);

  // Color scheme for bars based on performance
  const getBarColor = (value: number, index: number) => {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return colors[index % colors.length];
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const trainer = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          minWidth: '200px'
        }}>
          <p style={{ color: 'white', margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold' }}>
            {trainer.name}
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} color="#3b82f6" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                Revenue: ${trainer.revenue.toLocaleString()}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} color="#22c55e" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                Sessions: {trainer.sessions}
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Star size={14} color="#f59e0b" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                Rating: {trainer.rating.toFixed(1)}★
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} color="#8b5cf6" />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>
                Clients: {trainer.clients}
              </span>
            </div>
          </div>
          
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              Utilization: {trainer.utilizationRate}% | Retention: {trainer.retention}%
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              NASM Compliance: {trainer.nasmCompliance}% | Social: {trainer.socialEngagement}%
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Format Y-axis labels based on metric
  const formatYAxis = (value: number) => {
    switch (metric) {
      case 'revenue':
        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
        return `$${value}`;
      case 'rating':
        return value.toFixed(1);
      case 'utilization':
        return `${value}%`;
      default:
        return value.toString();
    }
  };

  // Get metric display value
  const getMetricValue = (trainer: TrainerPerformanceData) => {
    return trainer[metric];
  };

  // Get metric label
  const getMetricLabel = () => {
    switch (metric) {
      case 'revenue':
        return 'Revenue ($)';
      case 'sessions':
        return 'Sessions';
      case 'rating':
        return 'Rating (★)';
      case 'utilization':
        return 'Utilization (%)';
      default:
        return 'Value';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sortedData}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          barCategoryGap="20%"
        >
          {/* Grid */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.1)" 
            vertical={false}
          />
          
          {/* Axes */}
          <XAxis 
            dataKey="name" 
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 11 }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
          />
          <YAxis 
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            tickFormatter={formatYAxis}
            label={{ 
              value: getMetricLabel(), 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: 'rgba(255, 255, 255, 0.8)' }
            }}
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Average reference line */}
          {showComparison && (
            <ReferenceLine 
              y={average} 
              stroke="#f59e0b" 
              strokeDasharray="5 5" 
              strokeWidth={2}
              label={{ 
                value: `Avg: ${formatYAxis(average)}`, 
                position: 'topRight',
                style: { fill: '#f59e0b', fontSize: '12px' }
              }}
            />
          )}
          
          {/* Main bars */}
          <Bar 
            dataKey={metric}
            radius={[4, 4, 0, 0]}
            fill="#3b82f6"
          >
            {sortedData.map((trainer, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={getBarColor(getMetricValue(trainer), index)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default TrainerPerformanceBarChart;