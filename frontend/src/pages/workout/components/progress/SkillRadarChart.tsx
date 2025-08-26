/**
 * SkillRadarChart Component
 * ========================
 * Displays a radar chart visualization of client skill levels
 */

import React from 'react';
// Using CSS-based charts instead of recharts for build compatibility
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
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* CSS-based Radar Chart Placeholder */}
            <div style={{ 
              width: '200px', 
              height: '200px', 
              border: '2px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '50%',
              position: 'relative',
              background: 'radial-gradient(circle, rgba(0, 255, 255, 0.1) 0%, transparent 70%)'
            }}>
              {/* Skill points around the circle */}
              {skillData.map((skill, index) => {
                const angle = (index * 360) / skillData.length;
                const radius = (skill.value / 10) * 80; // Scale to 80px max radius
                const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
                const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
                
                return (
                  <div key={skill.subject} style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    width: '8px',
                    height: '8px',
                    background: '#00ffff',
                    borderRadius: '50%',
                    boxShadow: '0 0 8px rgba(0, 255, 255, 0.6)'
                  }}>
                    <div style={{
                      position: 'absolute',
                      bottom: '12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '10px',
                      color: 'white',
                      whiteSpace: 'nowrap',
                      textAlign: 'center'
                    }}>
                      {skill.subject}<br/>
                      <span style={{ color: '#00ffff', fontWeight: 'bold' }}>{skill.value}</span>
                    </div>
                  </div>
                );
              })}
              
              {/* Center text */}
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: '#00ffff',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                Skills
              </div>
              
              {/* Grid circles */}
              {[2, 4, 6, 8, 10].map(level => (
                <div key={level} style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: `${(level / 10) * 160}px`,
                  height: `${(level / 10) * 160}px`,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '50%'
                }} />
              ))}
            </div>
          </div>
        ) : (
          <NoDataMessage>No skill data available</NoDataMessage>
        )}
      </ChartContainer>
    </ChartSection>
  );
};

export default SkillRadarChart;
