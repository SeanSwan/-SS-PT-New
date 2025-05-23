import React from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  TooltipProps
} from 'recharts';
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

interface RadarProgressChartProps {
  data: any[];
  name: string;
  nameKey: string;
  dataKey: string;
  height?: number;
  color?: string;
  title?: string;
  maxValue?: number;
}

/**
 * Custom tooltip for the radar chart
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
          <p key={`item-${index}`} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
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
 * RadarProgressChart Component
 * 
 * A radar chart for displaying fitness metrics across multiple categories,
 * ideal for showing balanced progress in different areas.
 */
const RadarProgressChart: React.FC<RadarProgressChartProps> = ({
  data,
  name,
  nameKey,
  dataKey,
  height = 300,
  color = '#00ffff',
  title,
  maxValue = 100
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
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.15)" />
          <PolarAngleAxis 
            dataKey={nameKey}
            tick={{ fill: '#b0b0b0', fontSize: 12 }}
            stroke="rgba(255,255,255,0.3)"
          />
          <PolarRadiusAxis 
            domain={[0, maxValue]} 
            tick={{ fill: '#b0b0b0', fontSize: 10 }}
            stroke="rgba(255,255,255,0.1)"
            angle={30}
            tickCount={5}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name={name}
            dataKey={dataKey}
            stroke={color}
            fill={color}
            fillOpacity={0.3}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RadarProgressChart;