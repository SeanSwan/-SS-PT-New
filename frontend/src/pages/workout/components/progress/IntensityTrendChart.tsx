/**
 * IntensityTrendChart Component
 * ============================
 * Displays a line chart of workout intensity trends over time
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  ChartSection, 
  ChartTitle, 
  ChartContainer, 
  NoDataMessage 
} from '../../styles/ClientProgress.styles';
import { IntensityTrendData } from '../../types/progress.types';

interface IntensityTrendChartProps {
  intensityTrendData: IntensityTrendData[];
}

export const IntensityTrendChart: React.FC<IntensityTrendChartProps> = ({
  intensityTrendData
}) => {
  return (
    <ChartSection>
      <ChartTitle>Workout Intensity Trends</ChartTitle>
      <ChartContainer>
        {intensityTrendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={intensityTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="week" tick={{ fill: 'white' }} />
              <YAxis domain={[0, 10]} tick={{ fill: 'white' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="averageIntensity" 
                stroke="#00ffff" 
                strokeWidth={2}
                name="Intensity"
                dot={{ fill: '#00ffff', r: 4 }}
                activeDot={{ r: 6, fill: '#00ffff' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No intensity data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default IntensityTrendChart;
