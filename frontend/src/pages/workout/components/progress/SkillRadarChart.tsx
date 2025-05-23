/**
 * SkillRadarChart Component
 * ========================
 * Displays a radar chart visualization of client skill levels
 */

import React from 'react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  Tooltip
} from 'recharts';
import { 
  ChartSection, 
  ChartTitle, 
  ChartContainer, 
  NoDataMessage 
} from '../../styles/ClientProgress.styles';
import { SkillData } from '../../types/progress.types';

interface SkillRadarChartProps {
  skillData: SkillData[];
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  skillData
}) => {
  return (
    <ChartSection>
      <ChartTitle>Skill Balance</ChartTitle>
      <ChartContainer>
        {skillData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={skillData}>
              <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: 'white' }} />
              <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: 'white' }} />
              <Radar
                name="Skills"
                dataKey="value"
                stroke="#00ffff"
                fill="#00ffff"
                fillOpacity={0.6}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  color: 'white'
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <NoDataMessage>No skill data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default SkillRadarChart;
