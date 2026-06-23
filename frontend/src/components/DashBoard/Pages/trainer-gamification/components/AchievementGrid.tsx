import React from 'react';
import { Award, Star, Trophy } from 'lucide-react';
import { getBadgeImage } from '../../../../../utils/badgeImageResolver';
import type { Achievement } from '../hooks/useTrainerGamification';
import {
  AchievementBadge,
  AchievementDescription,
  AchievementGrid as StyledAchievementGrid,
  AchievementIcon,
  AchievementItem,
  AchievementName,
  AchievementReward,
} from '../../admin-gamification/styled-gamification-system';
import {
  AutoMarginWrapper,
  BadgeImage,
  RequirementChip,
} from './trainer-gamification-components.styles';

interface AchievementGridProps {
  achievements: Achievement[];
}

const renderBadgeIcon = (achievement: Achievement) => {
  const badgeUrl = getBadgeImage(achievement.name, 'glass');
  if (badgeUrl) return <BadgeImage src={badgeUrl} alt={achievement.name} />;
  return achievement.icon === 'Trophy' ? <Trophy /> : <Award />;
};

const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements }) => (
  <StyledAchievementGrid>
    {achievements.map((achievement) => (
      <AchievementItem key={achievement.id} tier={achievement.tier} whileHover={{ y: -5, transition: { duration: 0.2 } }}>
        <AchievementBadge tier={achievement.tier}>{achievement.tier.toUpperCase()}</AchievementBadge>
        <AchievementIcon tier={achievement.tier}>{renderBadgeIcon(achievement)}</AchievementIcon>
        <AchievementName>{achievement.name}</AchievementName>
        <AchievementDescription>{achievement.description}</AchievementDescription>
        <AutoMarginWrapper>
          <RequirementChip>
            {achievement.requirementValue} {achievement.requirementType.replace('_', ' ')}
          </RequirementChip>
        </AutoMarginWrapper>
        <AchievementReward><Star size={18} /> {achievement.pointValue} points</AchievementReward>
      </AchievementItem>
    ))}
  </StyledAchievementGrid>
);

export default AchievementGrid;
