import React, { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface FitnessMetricsChartProps {
  isLoading?: boolean;
}

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const CardContainer = styled.div`
  border-radius: 12px;
  height: 100%;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardBody = styled.div`
  padding: 24px;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const Title = styled.h5`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0 0 4px;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
`;

const ToggleGroup = styled.div`
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const ToggleBtn = styled.button<{ $active: boolean }>`
  padding: 6px 16px;
  min-height: 36px;
  border: none;
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.15)' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.8125rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }

  & + & {
    border-left: 1px solid rgba(255, 255, 255, 0.15);
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 16px;
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 10px 16px;
  min-height: 44px;
  background: none;
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#00ffff' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.875rem;
  font-weight: ${props => props.$active ? '600' : '400'};
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: -1px;

  &:hover {
    color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.9)'};
  }
`;

const ChartContainer = styled.div`
  height: 360px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $mt?: number }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: 4px;
  margin-top: ${props => props.$mt ? `${props.$mt}px` : '0'};
`;

const TooltipBox = styled.div`
  background: rgba(15, 15, 30, 0.95);
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

const TooltipTitle = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  display: block;
  margin-bottom: 4px;
`;

const TooltipEntry = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 0.8125rem;
`;

const TooltipDot = styled.span<{ $color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.$color};
  flex-shrink: 0;
`;

/**
 * Fitness Metrics Chart Component
 */
const FitnessMetricsChart: React.FC<FitnessMetricsChartProps> = ({ isLoading = false }) => {
  const [timeRange, setTimeRange] = useState<string>('month');
  const [metricTab, setMetricTab] = useState<number>(0);

  const monthlyData = [
    { program: 'HIIT', performance: 84, satisfaction: 92, attendance: 88 },
    { program: 'Strength', performance: 91, satisfaction: 85, attendance: 82 },
    { program: 'Cardio', performance: 78, satisfaction: 81, attendance: 75 },
    { program: 'Yoga', performance: 72, satisfaction: 94, attendance: 68 },
    { program: 'CrossFit', performance: 89, satisfaction: 78, attendance: 85 },
  ];

  const weeklyData = [
    { program: 'HIIT', performance: 86, satisfaction: 94, attendance: 90 },
    { program: 'Strength', performance: 93, satisfaction: 88, attendance: 84 },
    { program: 'Cardio', performance: 81, satisfaction: 83, attendance: 79 },
    { program: 'Yoga', performance: 75, satisfaction: 96, attendance: 72 },
    { program: 'CrossFit', performance: 92, satisfaction: 82, attendance: 88 },
  ];

  const yearlyData = [
    { program: 'HIIT', performance: 81, satisfaction: 89, attendance: 85 },
    { program: 'Strength', performance: 89, satisfaction: 83, attendance: 80 },
    { program: 'Cardio', performance: 75, satisfaction: 78, attendance: 72 },
    { program: 'Yoga', performance: 69, satisfaction: 92, attendance: 65 },
    { program: 'CrossFit', performance: 86, satisfaction: 75, attendance: 82 },
  ];

  const getChartData = () => {
    switch (timeRange) {
      case 'week': return weeklyData;
      case 'year': return yearlyData;
      default: return monthlyData;
    }
  };

  const getDataKeys = () => {
    switch (metricTab) {
      case 1: return [{ key: 'performance', color: '#1976d2' }];
      case 2: return [{ key: 'satisfaction', color: '#2e7d32' }];
      case 3: return [{ key: 'attendance', color: '#ed6c02' }];
      default: return [
        { key: 'performance', color: '#1976d2' },
        { key: 'satisfaction', color: '#2e7d32' },
        { key: 'attendance', color: '#ed6c02' }
      ];
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipBox>
          <TooltipTitle>{label}</TooltipTitle>
          {payload.map((entry: any, index: number) => (
            <TooltipEntry key={index} style={{ color: entry.color }}>
              <TooltipDot $color={entry.color} />
              {entry.name}: {entry.value}%
            </TooltipEntry>
          ))}
        </TooltipBox>
      );
    }
    return null;
  };

  const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

  return (
    <CardContainer>
      <CardBody>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="70%" $height="40px" />
            <SkeletonBlock $width="40%" $height="25px" $mt={8} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <SkeletonBlock $width="120px" $height="35px" />
              <SkeletonBlock $width="200px" $height="35px" />
            </div>
            <SkeletonBlock $height="320px" $mt={24} />
          </div>
        ) : (
          <>
            <HeaderRow>
              <div>
                <Title>Fitness Metrics</Title>
                <Subtitle>Program effectiveness metrics</Subtitle>
              </div>
              <ToggleGroup>
                {['week', 'month', 'year'].map(range => (
                  <ToggleBtn
                    key={range}
                    $active={timeRange === range}
                    onClick={() => setTimeRange(range)}
                  >
                    {capitalize(range)}
                  </ToggleBtn>
                ))}
              </ToggleGroup>
            </HeaderRow>

            <TabBar>
              {['All Metrics', 'Performance', 'Satisfaction', 'Attendance'].map((label, i) => (
                <TabButton key={i} $active={metricTab === i} onClick={() => setMetricTab(i)}>
                  {label}
                </TabButton>
              ))}
            </TabBar>

            <ChartContainer>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getChartData()}
                  margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="program"
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }} />
                  {getDataKeys().map(item => (
                    <Bar
                      key={item.key}
                      dataKey={item.key}
                      name={capitalize(item.key)}
                      fill={item.color}
                      barSize={30}
                      radius={[4, 4, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </>
        )}
      </CardBody>
    </CardContainer>
  );
};

export default FitnessMetricsChart;
