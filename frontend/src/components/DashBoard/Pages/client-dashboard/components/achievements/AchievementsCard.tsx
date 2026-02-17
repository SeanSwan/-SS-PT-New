import React, { useState } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Award } from 'lucide-react';

import {
  StyledCard,
  CardHeader,
  CardTitle,
  CardContent,
  AchievementGrid,
  AchievementItem,
  itemVariants
} from '../styled-components';

import { Achievement } from '../../types';

const CountChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8125rem;
  font-weight: 500;
  background: rgba(120, 81, 169, 0.15);
  color: #7851a9;
`;

const Subtitle = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 16px;
`;

const TooltipWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

const TooltipPopup = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(20, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  min-width: 160px;
  z-index: 100;
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(20, 20, 40, 0.95);
  }
`;

const TooltipTitle = styled.span`
  font-size: 0.8125rem;
  font-weight: 600;
  color: white;
  display: block;
`;

const TooltipBody = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-top: 2px;
`;

const TooltipCaption = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.6);
  display: block;
  margin-top: 4px;
`;

interface AchievementsCardProps {
  achievements: Achievement[];
}

/**
 * Component displaying unlocked and locked achievements
 */
const AchievementsCard: React.FC<AchievementsCardProps> = ({ achievements }) => {
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <StyledCard component={motion.div} variants={itemVariants}>
      <CardHeader>
        <CardTitle>
          <Award size={22} />
          Achievements
        </CardTitle>
        <CountChip>
          {unlockedCount}/{achievements.length}
        </CountChip>
      </CardHeader>
      <CardContent>
        <Subtitle>
          Unlock achievements as you progress through your fitness journey
        </Subtitle>

        <AchievementGrid>
          {achievements.map((achievement) => (
            <AchievementItemWithTooltip key={achievement.id} achievement={achievement} />
          ))}
        </AchievementGrid>
      </CardContent>
    </StyledCard>
  );
};

const AchievementItemWithTooltip: React.FC<{ achievement: Achievement }> = ({ achievement }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <AchievementItem
      unlocked={achievement.unlocked}
      whileHover={{ y: -5 }}
    >
      <TooltipWrapper
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="achievement-icon">
          {achievement.icon}
        </div>
        {showTooltip && (
          <TooltipPopup>
            <TooltipTitle>{achievement.name}</TooltipTitle>
            <TooltipBody>{achievement.description}</TooltipBody>
            {achievement.unlocked && achievement.dateUnlocked && (
              <TooltipCaption>
                Unlocked: {new Date(achievement.dateUnlocked).toLocaleDateString()}
              </TooltipCaption>
            )}
            <TooltipCaption>{achievement.points} points</TooltipCaption>
          </TooltipPopup>
        )}
      </TooltipWrapper>
      <div className="achievement-name">{achievement.name}</div>
    </AchievementItem>
  );
};

export default AchievementsCard;
