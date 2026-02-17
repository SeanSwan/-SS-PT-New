import React from 'react';
import styled, { keyframes } from 'styled-components';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const ChartCard = styled.div`
  border-radius: 12px;
  height: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  background: rgba(30, 30, 60, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
  }
`;

const CardContent = styled.div`
  padding: 24px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $mt?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  margin-top: ${props => props.$mt || '0'};
  border-radius: 4px;
`;

const TooltipBox = styled.div`
  background: rgba(20, 20, 40, 0.95);
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
`;

interface ClientProgressChartProps {
  isLoading?: boolean;
}

/**
 * Client Progress Chart Component
 *
 * Displays a line chart visualizing client fitness progress over time.
 * Charts multiple metrics like weight training, cardio performance, and attendance.
 */
const ClientProgressChart: React.FC<ClientProgressChartProps> = ({ isLoading = false }) => {
  // Sample data - in a real application, this would come from an API
  const progressData = [
    { month: 'Jan', strength: 65, cardio: 72, flexibility: 58 },
    { month: 'Feb', strength: 68, cardio: 74, flexibility: 61 },
    { month: 'Mar', strength: 72, cardio: 76, flexibility: 65 },
    { month: 'Apr', strength: 75, cardio: 78, flexibility: 68 },
    { month: 'May', strength: 79, cardio: 80, flexibility: 71 },
    { month: 'Jun', strength: 82, cardio: 83, flexibility: 74 }
  ];

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <TooltipBox>
          <div style={{ fontWeight: 'bold', marginBottom: 4, color: 'white' }}>
            {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div
              key={`item-${index}`}
              style={{
                color: entry.color,
                display: 'flex',
                alignItems: 'center',
                marginTop: 4,
                fontSize: '0.875rem'
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: entry.color,
                  marginRight: 8,
                  display: 'inline-block'
                }}
              />
              {entry.name}: {entry.value}%
            </div>
          ))}
        </TooltipBox>
      );
    }
    return null;
  };

  return (
    <ChartCard>
      <CardContent>
        {isLoading ? (
          <div>
            <SkeletonBlock $width="70%" $height="40px" />
            <SkeletonBlock $width="40%" $height="25px" $mt="8px" />
            <SkeletonBlock $height="220px" $mt="24px" />
          </div>
        ) : (
          <>
            <h5 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: 4, color: 'white' }}>
              Client Progress
            </h5>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', marginBottom: 16 }}>
              6-month fitness metrics
            </p>

            <div style={{ height: 300, marginTop: 16 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={progressData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E0E0E0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#E0E0E0' }}
                    domain={[50, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="strength"
                    name="Strength"
                    stroke="#1976d2"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cardio"
                    name="Cardio"
                    stroke="#2e7d32"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="flexibility"
                    name="Flexibility"
                    stroke="#ed6c02"
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </ChartCard>
  );
};

export default ClientProgressChart;
