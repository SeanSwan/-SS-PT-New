/**
 * ProgressChart Component
 * ======================
 * Reusable progress visualization component for client dashboard.
 * Supports multiple chart types with galaxy theme styling.
 */

import React from 'react';
import styled from 'styled-components';

interface ProgressChartProps {
  title: string;
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  type?: 'bar' | 'line' | 'circle';
  maxValue?: number;
  className?: string;
}

const ChartContainer = styled.div`
  background: rgba(30, 30, 60, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 1.5rem;
  color: white;
  
  h3 {
    color: #00ffff;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    text-align: center;
  }
`;

const BarChart = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const BarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const BarLabel = styled.span`
  min-width: 80px;
  font-size: 0.9rem;
  color: #b8bcc8;
`;

const BarTrack = styled.div`
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
`;

const BarFill = styled.div<{ width: number; color: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: linear-gradient(90deg, ${props => props.color}, ${props => props.color}88);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const BarValue = styled.span`
  min-width: 40px;
  text-align: right;
  font-size: 0.9rem;
  color: #00ffff;
`;

const CircularProgress = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
`;

const ProgressChart: React.FC<ProgressChartProps> = ({
  title,
  data,
  type = 'bar',
  maxValue = 100,
  className
}) => {
  const getDefaultColor = (index: number) => {
    const colors = ['#00ffff', '#ff416c', '#4776e6', '#8360c3', '#2ebf91'];
    return colors[index % colors.length];
  };

  const renderBarChart = () => (
    <BarChart>
      {data.map((item, index) => {
        const percentage = Math.min((item.value / maxValue) * 100, 100);
        const color = item.color || getDefaultColor(index);
        
        return (
          <BarItem key={item.label}>
            <BarLabel>{item.label}</BarLabel>
            <BarTrack>
              <BarFill width={percentage} color={color} />
            </BarTrack>
            <BarValue>{item.value}</BarValue>
          </BarItem>
        );
      })}
    </BarChart>
  );

  const renderCircularChart = () => {
    // For now, show the first data item as a circular progress
    const mainData = data[0];
    if (!mainData) return null;
    
    const percentage = Math.min((mainData.value / maxValue) * 100, 100);
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
    
    return (
      <CircularProgress>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="8"
          />
          <circle
            cx="60"
            cy="60"
            r="45"
            fill="none"
            stroke="#00ffff"
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset="0"
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
          <text
            x="60"
            y="65"
            textAnchor="middle"
            fill="#00ffff"
            fontSize="18"
            fontWeight="bold"
          >
            {Math.round(percentage)}%
          </text>
        </svg>
      </CircularProgress>
    );
  };

  return (
    <ChartContainer className={className}>
      <h3>{title}</h3>
      {type === 'circle' ? renderCircularChart() : renderBarChart()}
    </ChartContainer>
  );
};

export default ProgressChart;
