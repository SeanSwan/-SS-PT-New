/**
 * ExerciseTypeChart Component
 * ==========================
 * Displays a bar chart of exercise types distribution
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
import { ExerciseTypeData } from '../../types/progress.types';

interface ExerciseTypeChartProps {
  exerciseTypeData: ExerciseTypeData[];
}

export const ExerciseTypeChart: React.FC<ExerciseTypeChartProps> = ({
  exerciseTypeData
}) => {
  return (
    <ChartSection>
      <ChartTitle>Exercise Types</ChartTitle>
      <ChartContainer>
        {exerciseTypeData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={exerciseTypeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis type="number" tick={{ fill: 'white' }} />
              <YAxis dataKey="name" type="category" tick={{ fill: 'white' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              <Bar dataKey="value" fill="#1e90ff" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No exercise type data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default ExerciseTypeChart;
