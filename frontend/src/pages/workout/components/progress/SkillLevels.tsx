/**
 * SkillLevels Component
 * ====================
 * Displays client skill levels with visual bars
 */

import React from 'react';
import { 
  SkillLevelCard, 
  SkillLevelTitle, 
  SkillLabel, 
  SkillBar 
} from '../../styles/ClientProgress.styles';
import { ClientProgressData } from '../../types/progress.types';

interface SkillLevelsProps {
  progress: ClientProgressData;
}

export const SkillLevels: React.FC<SkillLevelsProps> = ({
  progress
}) => {
  return (
    <SkillLevelCard>
      <SkillLevelTitle>Skill Levels</SkillLevelTitle>
      
      <SkillLabel>
        <span>Strength</span>
        <span>Level {progress.strengthLevel}</span>
      </SkillLabel>
      <SkillBar $percentage={progress.strengthLevel * 10} $color="#ff4757" />
      
      <SkillLabel>
        <span>Cardio</span>
        <span>Level {progress.cardioLevel}</span>
      </SkillLabel>
      <SkillBar $percentage={progress.cardioLevel * 10} $color="#1e90ff" />
      
      <SkillLabel>
        <span>Flexibility</span>
        <span>Level {progress.flexibilityLevel}</span>
      </SkillLabel>
      <SkillBar $percentage={progress.flexibilityLevel * 10} $color="#ffa502" />
      
      <SkillLabel>
        <span>Balance</span>
        <span>Level {progress.balanceLevel}</span>
      </SkillLabel>
      <SkillBar $percentage={progress.balanceLevel * 10} $color="#2ed573" />
      
      <SkillLabel>
        <span>Core</span>
        <span>Level {progress.coreLevel}</span>
      </SkillLabel>
      <SkillBar $percentage={progress.coreLevel * 10} $color="#7d5fff" />
    </SkillLevelCard>
  );
};

export default SkillLevels;
