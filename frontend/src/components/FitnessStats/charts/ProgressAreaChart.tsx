import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface ProgressAreaChartProps {
  data: any[];
  height?: number;
  xKey: string;
  yKeys: {
    key: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }[];
  title?: string;
}

/**
 * Custom tooltip for the progress area chart
 */
const CustomTooltip = ({
  active,
  payload,
  label,
}: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '12px',
          borderRadius: '8px',
          color: '#fff',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ margin: 0, display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: entry.color,
                marginRight: '8px',
                borderRadius: '50%',
              }}
            />
            <span style={{ marginRight: '8px' }}>{entry.name}:</span>
            <span style={{ color: entry.color, fontWeight: 'bold' }}>
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </span>
          </p>
        ))}
      </div>
    );
  }

  return null;
};

/**
 * ProgressAreaChart Component
 * 
 * A reusable area chart for displaying fitness progress over time
 * with customized gradients and tooltips.
 */
const ProgressAreaChart: React.FC<ProgressAreaChartProps> = ({
  data,
  height = 300,
  xKey,
  yKeys,
  title,
}) => {
  return (
    <div style={{ width: '100%', height }}>
      {title && (
        <h3 style={{ 
          margin: '0 0 16px', 
          fontSize: '1rem', 
          color: '#f0f0f0',
          textAlign: 'center'
        }}>
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={title ? height - 30 : height}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            {yKeys.map((yKey) => (
              <linearGradient
                key={`gradient-${yKey.key}`}
                id={`gradient-${yKey.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={yKey.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={yKey.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey={xKey} 
            stroke="#888888"
            tick={{ fill: '#b0b0b0', fontSize: 12 }}
          />
          <YAxis 
            stroke="#888888"
            tick={{ fill: '#b0b0b0', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          {yKeys.map((yKey) => (
            <Area
              key={yKey.key}
              type="monotone"
              dataKey={yKey.key}
              name={yKey.name}
              stroke={yKey.color}
              fillOpacity={yKey.fillOpacity || 0.3}
              fill={`url(#gradient-${yKey.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ProgressAreaChart;