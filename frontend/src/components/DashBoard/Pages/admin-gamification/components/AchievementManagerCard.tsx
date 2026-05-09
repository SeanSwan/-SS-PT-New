/**
 * Achievement grid card for the canonical admin achievement manager.
 */
import React from 'react';
import { Award, Edit, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import {
  AchievementBadge,
  AchievementDescription,
  AchievementIcon,
  AchievementItem,
  AchievementName,
  AchievementReward,
  getSwanTierLabel,
} from '../styled-gamification-system';
import { getBadgeImage } from '../../../../../utils/badgeImageResolver';
import { achievementIconOptions } from './AchievementManager.data';
import {
  ActionRow,
  BadgeIconImage,
  ChipRequirement,
  ChipSpan,
  EmojiIcon,
  IconActionButton,
  StatusPositioner,
  TooltipButton,
} from './AchievementManagerControls.styles';
import type { Achievement } from './AchievementManager.types';

interface AchievementManagerCardProps {
  achievement: Achievement;
  onEdit: (achievement: Achievement) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

const getIconComponent = (iconName: string, achievementName?: string) => {
  if (achievementName) {
    const badgeUrl = getBadgeImage(achievementName, 'glass');
    if (badgeUrl) {
      return <BadgeIconImage src={badgeUrl} alt={`${achievementName} badge`} />;
    }
  }

  if (iconName && !iconName.match(/^[A-Z]/)) {
    return <EmojiIcon>{iconName}</EmojiIcon>;
  }

  const icon = achievementIconOptions.find(option => option.name === iconName);
  return icon ? icon.component : <Award />;
};

export const AchievementManagerCard: React.FC<AchievementManagerCardProps> = ({
  achievement,
  onEdit,
  onDelete,
  onToggleStatus,
}) => (
  <AchievementItem
    tier={achievement.tier}
    whileHover={{
      y: -5,
      transition: { duration: 0.2 },
    }}
    style={{ opacity: achievement.isActive ? 1 : 0.6 }}
  >
    <AchievementBadge tier={achievement.tier}>{getSwanTierLabel(achievement.tier)}</AchievementBadge>

    <StatusPositioner>
      <TooltipButton
        $isActive={achievement.isActive}
        onClick={() => onToggleStatus(achievement.id, !achievement.isActive)}
        title={achievement.isActive ? 'Active' : 'Inactive'}
        aria-label={`${achievement.isActive ? 'Deactivate' : 'Activate'} ${achievement.name}`}
      >
        {achievement.isActive ? <Eye size={16} /> : <EyeOff size={16} />}
      </TooltipButton>
    </StatusPositioner>

    <AchievementIcon tier={achievement.tier}>{getIconComponent(achievement.icon, achievement.name)}</AchievementIcon>

    <AchievementName>{achievement.name}</AchievementName>

    <AchievementDescription>{achievement.description}</AchievementDescription>

    <ChipRequirement>
      <ChipSpan>{`${achievement.requirementValue} ${achievement.requirementType.replace('_', ' ')}`}</ChipSpan>
    </ChipRequirement>

    <AchievementReward>
      <Star size={18} /> {achievement.pointValue} points
    </AchievementReward>

    <ActionRow>
      <IconActionButton
        $variant="primary"
        onClick={() => onEdit(achievement)}
        title="Edit"
        aria-label={`Edit ${achievement.name}`}
      >
        <Edit size={16} />
      </IconActionButton>
      <IconActionButton
        $variant="danger"
        onClick={() => onDelete(achievement.id)}
        title="Delete"
        aria-label={`Delete ${achievement.name}`}
      >
        <Trash2 size={16} />
      </IconActionButton>
    </ActionRow>
  </AchievementItem>
);
