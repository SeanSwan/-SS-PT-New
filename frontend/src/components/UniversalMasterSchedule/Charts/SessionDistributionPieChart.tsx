/**
 * Session Distribution Pie Chart Component
 * ========================================
 * Beautiful session status distribution visualization using Recharts
 * 
 * Displays session distribution by status with interactive hover effects,
 * custom labels, and detailed statistics.
 */

import React from 'react';
// Using CSS-based charts instead of recharts for build compatibility
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Calendar, 
  Clock, 
  XCircle, 
  AlertCircle,
  Users,
  Target
} from 'lucide-react';

interface SessionDistributionData {
  name: string;
  value: number;
  percentage: number;
  status: 'completed' | 'scheduled' | 'available' | 'cancelled' | 'confirmed' | 'requested';
  color: string;
}

interface SessionDistributionPieChartProps {
  data: SessionDistributionData[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  animationDuration?: number;
}

const SessionDistributionPieChart: React.FC<SessionDistributionPieChartProps> = ({
  data,
  height = 250,
  showLegend = true,
  showLabels = true,
  innerRadius = 40,
  outerRadius = 80,
  animationDuration = 800
}) => {
  // Status icons mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={14} />;
      case 'scheduled':
        return <Calendar size={14} />;
      case 'confirmed':
        return <Target size={14} />;
      case 'available':
        return <Clock size={14} />;
      case 'cancelled':
        return <XCircle size={14} />;
      case 'requested':
        return <AlertCircle size={14} />;
      default:
        return <Users size={14} />;
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          padding: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
          minWidth: '180px'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '8px'
          }}>
            <div style={{ color: data.color }}>
              {getStatusIcon(data.status)}
            </div>
            <span style={{ 
              color: 'white', 
              fontSize: '16px', 
              fontWeight: 'bold',
              textTransform: 'capitalize'
            }}>
              {data.name}
            </span>
          </div>
          
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
            Sessions: <span style={{ fontWeight: 'bold' }}>{data.value}</span>
          </div>
          
          <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
            Percentage: <span style={{ fontWeight: 'bold', color: data.color }}>
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          
          {/* Additional insights based on status */}
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255,255,255,0.2)',
            fontSize: '12px',
            color: 'rgba(255,255,255,0.7)'
          }}>
            {data.status === 'completed' && 'Revenue generated ✓'}
            {data.status === 'scheduled' && 'Pending sessions'}
            {data.status === 'confirmed' && 'Confirmed bookings'}
            {data.status === 'available' && 'Open for booking'}
            {data.status === 'cancelled' && 'Lost opportunities'}
            {data.status === 'requested' && 'Awaiting confirmation'}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom label component
  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value, percentage }: any) => {
    if (percentage < 5) return null; // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  // Custom legend component
  const CustomLegend = ({ payload }: any) => {
    return (
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '16px',
        marginTop: '16px'
      }}>
        {payload.map((entry: any, index: number) => (
          <motion.div
            key={`legend-${index}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div style={{ 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%',
              backgroundColor: entry.color 
            }} />
            <span style={{ 
              color: 'white', 
              fontSize: '12px',
              textTransform: 'capitalize'
            }}>
              {entry.value}
            </span>
            <span style={{ 
              color: 'rgba(255,255,255,0.7)', 
              fontSize: '11px' 
            }}>
              ({entry.payload.value})
            </span>
          </motion.div>
        ))}
      </div>
    );
  };

  // Calculate totals for center display
  const totalSessions = data.reduce((sum, item) => sum + item.value, 0);
  const completedSessions = data.find(item => item.status === 'completed')?.value || 0;
  const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      style={{ width: '100%', height, position: 'relative' }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            labelLine={false}
            label={showLabels ? CustomLabel : false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={animationDuration}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          
          <Tooltip content={<CustomTooltip />} />
          
          {showLegend && <Legend content={<CustomLegend />} />}
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center statistics display */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        textAlign: 'center',
        pointerEvents: 'none'
      }}>
        <div style={{ 
          color: 'white', 
          fontSize: '24px', 
          fontWeight: 'bold',
          marginBottom: '4px'
        }}>
          {totalSessions}
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.7)', 
          fontSize: '12px',
          marginBottom: '8px'
        }}>
          Total Sessions
        </div>
        <div style={{ 
          color: '#22c55e', 
          fontSize: '14px', 
          fontWeight: 'bold'
        }}>
          {completionRate.toFixed(1)}%
        </div>
        <div style={{ 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: '10px'
        }}>
          Completion Rate
        </div>
      </div>
    </motion.div>
  );
};

export default SessionDistributionPieChart;