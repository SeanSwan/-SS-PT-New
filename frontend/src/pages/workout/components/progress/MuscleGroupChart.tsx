/**
 * MuscleGroupChart Component
 * =========================
 * Displays a bar chart of muscle group focus distribution
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
import { MuscleGroupData } from '../../types/progress.types';

interface MuscleGroupChartProps {
  muscleGroupData: MuscleGroupData[];
}

export const MuscleGroupChart: React.FC<MuscleGroupChartProps> = ({
  muscleGroupData
}) => {
  return (
    <ChartSection>
      <ChartTitle>Muscle Group Focus</ChartTitle>
      <ChartContainer>
        {muscleGroupData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={muscleGroupData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="name" tick={{ fill: 'white' }} />
              <YAxis tick={{ fill: 'white' }} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
              <Bar dataKey="value" fill="#7d5fff" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No muscle group data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default MuscleGroupChart;
