/**
 * TopExercisesChart Component
 * ==========================
 * Displays a bar chart of the most frequently performed exercises
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

interface TopExerciseData {
  id: string;
  name: string;
  count: number;
  sets: number;
  reps: number;
  totalWeight: number;
  category: string;
}

interface TopExercisesChartProps {
  topExercises: TopExerciseData[];
}

export const TopExercisesChart: React.FC<TopExercisesChartProps> = ({
  topExercises
}) => {
  return (
    <ChartSection>
      <ChartTitle>Top Exercises</ChartTitle>
      <ChartContainer>
        {topExercises.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topExercises} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" tick={{ fill: 'white' }} />
              <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'white' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              <Bar dataKey="count" fill="#2ed573" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No exercise data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default TopExercisesChart;
