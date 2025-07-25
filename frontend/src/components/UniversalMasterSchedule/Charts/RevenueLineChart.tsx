/**
 * Revenue Line Chart Component
 * ============================
 * Real-time revenue trend visualization using Recharts
 * 
 * Displays revenue performance over time with smooth animations
 * and professional styling matching the stellar command center theme.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign } from 'lucide-react';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  sessions: number;
  projected?: number;
}

interface RevenueLineChartProps {
  data: RevenueDataPoint[];
  height?: number;
  showProjection?: boolean;
  timeRange?: 'week' | 'month' | 'quarter' | 'year';
}

const RevenueLineChart: React.FC<RevenueLineChartProps> = ({
  data,
  height = 250,
  showProjection = true,
  timeRange = 'month'
}) => {
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ color: 'white', margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
            {label}
          </p>
          <p style={{ color: '#3b82f6', margin: '0 0 4px 0', fontSize: '13px' }}>
            <DollarSign size={14} style={{ display: 'inline', marginRight: '4px' }} />
            Revenue: ${data.revenue.toLocaleString()}
          </p>
          <p style={{ color: '#22c55e', margin: '0', fontSize: '13px' }}>
            Sessions: {data.sessions}
          </p>
          {data.projected && (
            <p style={{ color: '#f59e0b', margin: '4px 0 0 0', fontSize: '13px' }}>
              Projected: ${data.projected.toLocaleString()}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Format Y-axis labels
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  // Format X-axis labels based on time range
  const formatXAxis = (value: string) => {
    const date = new Date(value);
    switch (timeRange) {
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'quarter':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'year':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return value;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          
          {/* Grid */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255, 255, 255, 0.1)" 
            vertical={false}
          />
          
          {/* Axes */}
          <XAxis 
            dataKey="date" 
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            tickFormatter={formatXAxis}
          />
          <YAxis 
            tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
            tickLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
            tickFormatter={formatYAxis}
          />
          
          {/* Tooltip */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Main revenue area */}
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#3b82f6"
            strokeWidth={3}
            fill="url(#revenueGradient)"
            fillOpacity={1}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ 
              r: 6, 
              fill: '#3b82f6', 
              stroke: 'white', 
              strokeWidth: 2,
              filter: 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.8))'
            }}
          />
          
          {/* Projected revenue line (if enabled) */}
          {showProjection && (
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="8 8"
              dot={false}
              activeDot={{ r: 4, fill: '#f59e0b' }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
};

export default RevenueLineChart;