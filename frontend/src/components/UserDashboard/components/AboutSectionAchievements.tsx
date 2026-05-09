/**
 * Earned achievements card for the active UserDashboard V3 about section.
 */

import React from 'react';
import { Trophy } from 'lucide-react';
import { SKILL_TREE_DISPLAY } from '../../../types/gamification';
import {
  CardHeader,
  CardTitle,
  EmptyState,
  InfoCard,
} from './AboutSection.styles';
import {
  AchievementDescription,
  AchievementIcon,
  AchievementItem,
  AchievementMeta,
  AchievementsList,
  AchievementTitle,
  SkillTreeTag,
} from './AboutSectionProgress.styles';
import { getRarityFlat, getRarityGradient } from './AboutSection.helpers';
import type { EarnedAchievementCard } from './AboutSection.types';

interface AboutSectionAchievementsProps {
  achievements: EarnedAchievementCard[];
}

const AboutSectionAchievements: React.FC<AboutSectionAchievementsProps> = ({ achievements }) => (
  <InfoCard $spaced initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
    <CardHeader>
      <CardTitle>
        <Trophy size={20} />
        Achievements ({achievements.length > 0 ? `${achievements.length} earned` : 'none yet'})
      </CardTitle>
    </CardHeader>

    {achievements.length === 0 ? (
      <EmptyState>
        No achievements earned yet. Complete workouts and engage with the community to start unlocking badges!
      </EmptyState>
    ) : (
      <AchievementsList>
        {achievements.map((achievement, index) => {
          const skillTreeDisplay = achievement.skillTree ? SKILL_TREE_DISPLAY[achievement.skillTree] : null;
          const rarityColor = getRarityFlat(achievement.rarity);

          return (
            <AchievementItem
              key={achievement.id}
              $rarityColor={rarityColor}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <AchievementIcon $color={getRarityGradient(achievement.rarity)}>
                {achievement.icon}
              </AchievementIcon>
              <AchievementTitle>{achievement.title}</AchievementTitle>
              <AchievementDescription>{achievement.description}</AchievementDescription>
              <AchievementMeta $color={rarityColor}>
                {achievement.xpReward > 0 ? `${achievement.xpReward} XP` : ''} - {achievement.rarity}
              </AchievementMeta>
              {skillTreeDisplay && (
                <SkillTreeTag $color={skillTreeDisplay.color}>
                  {skillTreeDisplay.name}
                </SkillTreeTag>
              )}
            </AchievementItem>
          );
        })}
      </AchievementsList>
    )}
  </InfoCard>
);

export default AboutSectionAchievements;
