/**
 * ============================================================================
 * FILE: AchievementGrid.tsx
 * PURPOSE: Trainer-facing achievement grid displaying all available achievements
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-23
 * AI VILLAGE VALIDATED: 2026-03-23
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Renders a grid of all available achievements that trainers can award to
 * clients. Each achievement card shows its icon, name, description, XP reward,
 * category, and rarity. Reuses styled-components from admin styled-gamification-system.
 *
 * HOW IT FITS IN THE APP:
 * trainer-gamification-view -> AchievementGrid (child component)
 * Displays achievement definitions; selection triggers AwardAchievementDialog.
 *
 * KEY DECISIONS:
 * - Reuses admin styled-components for visual consistency across roles
 * - Icon mapping shared with AchievementManager for consistent iconography
 */
import React from 'react';
import styled from 'styled-components';
import { Award, Trophy } from 'lucide-react';
import { getBadgeImage } from '../../../../../utils/badgeImageResolver';
import {
  AchievementGrid as StyledAchievementGrid,
  AchievementItem,
  AchievementIcon,
  AchievementName,
  AchievementDescription,
  AchievementReward,
  AchievementBadge
} from '../../admin-gamification/styled-gamification-system';

const RequirementChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 8px;
`;

const AutoMarginWrapper = styled.div`
  margin-top: auto;
  margin-bottom: 8px;
`;

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  pointValue: number;
  requirementType: string;
  requirementValue: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  isActive: boolean;
}

interface AchievementGridProps {
  achievements: Achievement[];
}

/**
 * AchievementGrid Component
 * Displays a grid of achievements with their details
 */
const AchievementGrid: React.FC<AchievementGridProps> = ({ achievements }) => {
  // Render badge image from manifest — 729 badge images available
  const renderBadgeIcon = (achievement: Achievement) => {
    const badgeUrl = getBadgeImage(achievement.name, 'glass');
    if (badgeUrl) {
      return <img src={badgeUrl} alt={achievement.name} style={{ width: 36, height: 36, objectFit: 'contain' }} />;
    }
    return achievement.icon === 'Trophy' ? <Trophy /> : <Award />;
  };

  return (
    <StyledAchievementGrid>
      {achievements.map((achievement) => (
        <AchievementItem
          key={achievement.id}
          tier={achievement.tier}
          whileHover={{
            y: -5,
            transition: { duration: 0.2 }
          }}
        >
          <AchievementBadge tier={achievement.tier}>
            {achievement.tier.toUpperCase()}
          </AchievementBadge>

          <AchievementIcon tier={achievement.tier}>
            {renderBadgeIcon(achievement)}
          </AchievementIcon>

          <AchievementName>{achievement.name}</AchievementName>

          <AchievementDescription>
            {achievement.description}
          </AchievementDescription>

          <AutoMarginWrapper>
            <RequirementChip>
              {achievement.requirementValue} {achievement.requirementType.replace('_', ' ')}
            </RequirementChip>
          </AutoMarginWrapper>

          <AchievementReward>
            <Star size={18} /> {achievement.pointValue} points
          </AchievementReward>
        </AchievementItem>
      ))}
    </StyledAchievementGrid>
  );
};

export default AchievementGrid;
