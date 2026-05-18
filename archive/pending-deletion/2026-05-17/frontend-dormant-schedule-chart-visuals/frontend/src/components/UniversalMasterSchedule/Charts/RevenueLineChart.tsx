/**
 * Revenue Line Chart Component
 * ============================
 * Real-time revenue trend visualization using Recharts
 * 
 * Displays revenue performance over time with smooth animations
 * and professional styling matching the stellar command center theme.
 */

import React from 'react';
// Using CSS-based charts instead of recharts for build compatibility
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

  const chartData = data.length > 0 ? data : [{ date: '', revenue: 0, sessions: 0 }];
  const maxValue = Math.max(1, ...chartData.map(point => Math.max(point.revenue, point.projected || 0)));
  const xFor = (index: number) => chartData.length === 1 ? 50 : (index / (chartData.length - 1)) * 100;
  const yFor = (value: number) => 90 - (value / maxValue) * 72;
  const revenuePoints = chartData.map((point, index) => `${xFor(index)},${yFor(point.revenue)}`).join(' ');
  const projectedPoints = chartData
    .map((point, index) => typeof point.projected === 'number' ? `${xFor(index)},${yFor(point.projected)}` : null)
    .filter(Boolean)
    .join(' ');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{ width: '100%', height }}
    >
      <svg viewBox="0 0 100 100" role="img" aria-label="Revenue trend" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        {[18, 36, 54, 72, 90].map(y => (
          <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />
        ))}
        <polygon points={`0,90 ${revenuePoints} 100,90`} fill="url(#revenueGradient)" />
        <polyline points={revenuePoints} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {showProjection && projectedPoints && (
          <polyline points={projectedPoints} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 4" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {chartData.map((point, index) => (
          <circle key={`${point.date}-${index}`} cx={xFor(index)} cy={yFor(point.revenue)} r="2.8" fill="#3b82f6">
            <title>{`${formatXAxis(point.date)}: ${formatYAxis(point.revenue)}`}</title>
          </circle>
        ))}
        <text x="0" y="10" fill="rgba(255,255,255,0.72)" fontSize="6">{formatYAxis(maxValue)}</text>
        <text x="0" y="99" fill="rgba(255,255,255,0.55)" fontSize="5">{formatXAxis(chartData[0].date)}</text>
        <text x="100" y="99" fill="rgba(255,255,255,0.55)" fontSize="5" textAnchor="end">{formatXAxis(chartData[chartData.length - 1].date)}</text>
      </svg>
    </motion.div>
  );
};

export default RevenueLineChart;
