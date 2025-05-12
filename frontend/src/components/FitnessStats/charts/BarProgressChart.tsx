import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface BarProgressChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  height?: number;
  title?: string;
  colors?: string[];
  labelKey?: string;
  valueFormatter?: (value: number) => string;
  horizontal?: boolean;
  maxValue?: number;
}

/**
 * Custom tooltip for the bar chart
 */
const CustomTooltip = ({
  active,
  payload,
  label,
  valueFormatter
}: TooltipProps<ValueType, NameType> & { valueFormatter?: (value: number) => string }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    const displayValue = valueFormatter ? valueFormatter(value) : value;

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
          <p key={`item-${index}`} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                backgroundColor: entry.color,
                marginRight: '8px',
                borderRadius: '2px',
              }}
            />
            <span style={{ marginRight: '8px' }}>{entry.name}:</span>
            <span style={{ color: entry.color, fontWeight: 'bold' }}>
              {displayValue}
            </span>
          </p>
        ))}
      </div>
    );
  }

  return null;
};

/**
 * BarProgressChart Component
 * 
 * A bar chart for displaying fitness metrics with customizable colors,
 * orientation, and value formatting.
 */
const BarProgressChart: React.FC<BarProgressChartProps> = ({
  data,
  xKey,
  yKey,
  height = 300,
  title,
  colors = ['#00ffff', '#7851a9', '#FF6B6B', '#4CAF50', '#FFC107'],
  labelKey,
  valueFormatter,
  horizontal = false,
  maxValue
}) => {
  // Pre-calculate the maximum value for the domain if not provided
  const calculatedMaxValue = maxValue || Math.max(...data.map(item => item[yKey])) * 1.1;

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
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          {horizontal ? (
            <>
              <XAxis 
                type="number" 
                domain={[0, calculatedMaxValue]}
                stroke="#888888"
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
              />
              <YAxis 
                dataKey={xKey} 
                type="category"
                stroke="#888888"
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
                width={120}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey={xKey} 
                stroke="#888888"
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
              />
              <YAxis 
                domain={[0, calculatedMaxValue]}
                stroke="#888888"
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
              />
            </>
          )}
          <Tooltip 
            content={<CustomTooltip valueFormatter={valueFormatter} />} 
          />
          <Bar 
            dataKey={yKey} 
            fill="#00ffff"
            name={labelKey || yKey}
            radius={[4, 4, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BarProgressChart;