/**
 * WeekdayBarChart Component
 * ========================
 * Displays a bar chart of workout frequency by weekday
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  ChartSection, 
  ChartTitle, 
  ChartContainer, 
  NoDataMessage 
} from '../../styles/ClientProgress.styles';
import { WeekdayData } from '../../types/progress.types';

interface WeekdayBarChartProps {
  weekdayData: WeekdayData[];
}

export const WeekdayBarChart: React.FC<WeekdayBarChartProps> = ({
  weekdayData
}) => {
  return (
    <ChartSection>
      <ChartTitle>Workout Frequency by Weekday</ChartTitle>
      <ChartContainer>
        {weekdayData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weekdayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="day" tick={{ fill: 'white' }} />
              <YAxis tick={{ fill: 'white' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              <Bar dataKey="count" fill="#00ffff" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No workout data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default WeekdayBarChart;
