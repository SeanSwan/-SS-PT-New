/**
 * 🏆 ACHIEVEMENT SHOWCASE - USER ACHIEVEMENTS DISPLAY
 * =================================================== 
 * Interactive showcase for user achievements with animations, categories,
 * progress tracking, and social sharing capabilities
 */

import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { GamificationCard } from '../shared/GamificationCard';
import { AnimatedButton } from '../shared/AnimatedButton';
import { TabNavigation } from '../shared/TabNavigation';

// ================================================================
// ANIMATION KEYFRAMES
// ================================================================

const achievementUnlock = keyframes`
  0% { 
    transform: scale(0.8) rotate(-5deg);
    opacity: 0;
  }
  50% { 
    transform: scale(1.1) rotate(2deg);
    opacity: 0.8;
  }
  100% { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
`;

const starBurst = keyframes`
  0% { 
    transform: scale(0) rotate(0deg);
    opacity: 1;
  }
  100% { 
    transform: scale(1.5) rotate(360deg);
    opacity: 0;
  }
`;

const rarityGlow = keyframes`
  0%, 100% { 
    filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.3));
  }
  50% { 
    filter: drop-shadow(0 0 20px rgba(0, 255, 255, 0.6));
  }
`;

const legendaryPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.4),
                0 0 60px rgba(255, 215, 0, 0.2),
                inset 0 0 30px rgba(255, 215, 0, 0.1);
  }
  50% { 
    box-shadow: 0 0 50px rgba(255, 215, 0, 0.7),
                0 0 100px rgba(255, 215, 0, 0.3),
                inset 0 0 50px rgba(255, 215, 0, 0.2);
  }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  xpReward: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'fitness' | 'social' | 'streak' | 'milestone' | 'special';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirements: string[];
  shareCount?: number;
  isNew?: boolean;
}

export interface AchievementShowcaseProps {
  achievements: Achievement[];
  onShareAchievement?: (achievement: Achievement) => void;
  className?: string;
}

export type CategoryFilter = 'all' | 'fitness' | 'social' | 'streak' | 'milestone' | 'special';
export type RarityFilter = 'all' | 'common' | 'rare' | 'epic' | 'legendary';

// ================================================================
// STYLED COMPONENTS
// ================================================================

const ShowcaseContainer = styled(motion.div)`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ShowcaseHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, 
    #FFD700 0%, 
    #00FFFF 50%, 
    #7851A9 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const StatsRow = styled(motion.div)`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    gap: 1rem;
  }
`;

const StatBadge = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.1),
    rgba(120, 81, 169, 0.1)
  );
  border: 1px solid rgba(0, 255, 255, 0.3);
  border-radius: 20px;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #00FFFF;
  backdrop-filter: blur(10px);
`;

const FilterSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;
`;

const FilterLabel = styled.h4`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AchievementsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const AchievementCard = styled(motion.div)<{ 
  rarity: Achievement['rarity'];
  isUnlocked: boolean;
  isNew?: boolean;
}>`
  position: relative;
  background: ${props => {
    if (!props.isUnlocked) return 'rgba(50, 50, 50, 0.3)';
    
    switch (props.rarity) {
      case 'legendary':
        return 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.05))';
      case 'epic':
        return 'linear-gradient(135deg, rgba(138, 43, 226, 0.1), rgba(75, 0, 130, 0.05))';
      case 'rare':
        return 'linear-gradient(135deg, rgba(0, 191, 255, 0.1), rgba(30, 144, 255, 0.05))';
      default:
        return 'linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(120, 81, 169, 0.05))';
    }
  }};
  
  border: 1px solid ${props => {
    if (!props.isUnlocked) return 'rgba(100, 100, 100, 0.2)';
    
    switch (props.rarity) {
      case 'legendary': return 'rgba(255, 215, 0, 0.5)';
      case 'epic': return 'rgba(138, 43, 226, 0.4)';
      case 'rare': return 'rgba(0, 191, 255, 0.4)';
      default: return 'rgba(0, 255, 255, 0.2)';
    }
  }};

  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

  ${props => props.rarity === 'legendary' && props.isUnlocked && `
    animation: ${legendaryPulse} 3s ease-in-out infinite;
  `}

  ${props => props.isNew && `
    animation: ${achievementUnlock} 1s ease-out;
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 40px ${props => {
      if (!props.isUnlocked) return 'rgba(0, 0, 0, 0.3)';
      
      switch (props.rarity) {
        case 'legendary': return 'rgba(255, 215, 0, 0.3)';
        case 'epic': return 'rgba(138, 43, 226, 0.3)';
        case 'rare': return 'rgba(0, 191, 255, 0.3)';
        default: return 'rgba(0, 255, 255, 0.2)';
      }
    }};
  }

  ${props => !props.isUnlocked && `
    filter: grayscale(70%);
    opacity: 0.6;
  `}
`;

const AchievementIcon = styled(motion.div)<{ rarity: Achievement['rarity'] }>`
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
  
  ${props => props.rarity === 'legendary' && `
    animation: ${rarityGlow} 2s ease-in-out infinite;
  `}

  ${props => props.rarity === 'epic' && `
    filter: drop-shadow(0 0 15px rgba(138, 43, 226, 0.5));
  `}

  ${props => props.rarity === 'rare' && `
    filter: drop-shadow(0 0 10px rgba(0, 191, 255, 0.4));
  `}
`;

const AchievementTitle = styled.h3<{ isUnlocked: boolean }>`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${props => props.isUnlocked ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'};
  margin-bottom: 0.5rem;
  text-align: center;
`;

const AchievementDescription = styled.p<{ isUnlocked: boolean }>`
  font-size: 0.9rem;
  color: ${props => props.isUnlocked ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)'};
  margin-bottom: 1rem;
  text-align: center;
  line-height: 1.4;
`;

const ProgressSection = styled.div<{ isUnlocked: boolean }>`
  margin-bottom: 1rem;
  opacity: ${props => props.isUnlocked ? 1 : 0.6};
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  margin-bottom: 0.5rem;
  overflow: hidden;
`;

const ProgressFill = styled(motion.div)<{ progress: number; rarity: Achievement['rarity'] }>`
  height: 100%;
  border-radius: 3px;
  background: ${props => {
    switch (props.rarity) {
      case 'legendary': return 'linear-gradient(90deg, #FFD700, #FFA500)';
      case 'epic': return 'linear-gradient(90deg, #8A2BE2, #4B0082)';
      case 'rare': return 'linear-gradient(90deg, #00BFFF, #1E90FF)';
      default: return 'linear-gradient(90deg, #00FFFF, #7851A9)';
    }
  }};
  width: ${props => props.progress}%;
  transition: width 1s ease;
`;

const ProgressText = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
`;

const XpReward = styled.div<{ rarity: Achievement['rarity'] }>`
  text-align: center;
  font-weight: 600;
  color: ${props => {
    switch (props.rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#8A2BE2';
      case 'rare': return '#00BFFF';
      default: return '#00FFFF';
    }
  }};
  margin-bottom: 1rem;
`;

const ShareButton = styled(AnimatedButton)`
  width: 100%;
  margin-top: 0.5rem;
`;

const RarityBadge = styled.div<{ rarity: Achievement['rarity'] }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: ${props => {
    switch (props.rarity) {
      case 'legendary': return 'linear-gradient(135deg, #FFD700, #FFA500)';
      case 'epic': return 'linear-gradient(135deg, #8A2BE2, #4B0082)';
      case 'rare': return 'linear-gradient(135deg, #00BFFF, #1E90FF)';
      default: return 'linear-gradient(135deg, #00FFFF, #7851A9)';
    }
  }};
  color: ${props => props.rarity === 'legendary' ? '#000' : '#FFF'};
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const NewBadge = styled(motion.div)`
  position: absolute;
  top: -0.5rem;
  left: -0.5rem;
  background: linear-gradient(135deg, #FF6B6B, #FF8E8E);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  z-index: 2;
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const AchievementShowcase: React.FC<AchievementShowcaseProps> = ({
  achievements,
  onShareAchievement,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const unlockedAchievements = achievements.filter(a => a.progress >= a.maxProgress);
  const totalXpEarned = unlockedAchievements.reduce((sum, a) => sum + a.xpReward, 0);

  const filteredAchievements = achievements.filter(achievement => {
    const categoryMatch = categoryFilter === 'all' || achievement.category === categoryFilter;
    const rarityMatch = rarityFilter === 'all' || achievement.rarity === rarityFilter;
    return categoryMatch && rarityMatch;
  });

  // ================================================================
  // TAB OPTIONS
  // ================================================================

  const categoryOptions = [
    { id: 'all', label: 'All', icon: '🏆' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'streak', label: 'Streaks', icon: '🔥' },
    { id: 'milestone', label: 'Milestones', icon: '🎯' },
    { id: 'special', label: 'Special', icon: '⭐' }
  ];

  const rarityOptions = [
    { id: 'all', label: 'All', icon: '🎨' },
    { id: 'common', label: 'Common', icon: '🔵' },
    { id: 'rare', label: 'Rare', icon: '🟢' },
    { id: 'epic', label: 'Epic', icon: '🟣' },
    { id: 'legendary', label: 'Legendary', icon: '🟡' }
  ];

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  const handleShareAchievement = (achievement: Achievement) => {
    onShareAchievement?.(achievement);
  };

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#8A2BE2';
      case 'rare': return '#00BFFF';
      default: return '#00FFFF';
    }
  };

  // ================================================================
  // ANIMATION VARIANTS
  // ================================================================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <ShowcaseContainer className={className}>
      <ShowcaseHeader>
        <Title>🏆 Achievement Gallery</Title>
        <StatsRow>
          <StatBadge>
            {unlockedAchievements.length} / {achievements.length} Unlocked
          </StatBadge>
          <StatBadge>
            {totalXpEarned.toLocaleString()} XP Earned
          </StatBadge>
          <StatBadge>
            {Math.round((unlockedAchievements.length / achievements.length) * 100)}% Complete
          </StatBadge>
        </StatsRow>
      </ShowcaseHeader>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <TabNavigation
            options={categoryOptions}
            activeTab={categoryFilter}
            onTabChange={(tab) => setCategoryFilter(tab as CategoryFilter)}
            variant="minimal"
            orientation="horizontal"
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Rarity</FilterLabel>
          <TabNavigation
            options={rarityOptions}
            activeTab={rarityFilter}
            onTabChange={(tab) => setRarityFilter(tab as RarityFilter)}
            variant="outline"
            orientation="horizontal"
          />
        </FilterGroup>
      </FilterSection>

      <AchievementsGrid
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {filteredAchievements.map((achievement) => {
            const isUnlocked = achievement.progress >= achievement.maxProgress;
            const progressPercentage = Math.min((achievement.progress / achievement.maxProgress) * 100, 100);

            return (
              <AchievementCard
                key={achievement.id}
                variants={cardVariants}
                layout
                rarity={achievement.rarity}
                isUnlocked={isUnlocked}
                isNew={achievement.isNew}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {achievement.isNew && (
                  <NewBadge
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                  >
                    NEW!
                  </NewBadge>
                )}

                <RarityBadge rarity={achievement.rarity}>
                  {achievement.rarity}
                </RarityBadge>

                <AchievementIcon rarity={achievement.rarity}>
                  {achievement.iconEmoji}
                </AchievementIcon>

                <AchievementTitle isUnlocked={isUnlocked}>
                  {achievement.title}
                </AchievementTitle>

                <AchievementDescription isUnlocked={isUnlocked}>
                  {achievement.description}
                </AchievementDescription>

                <XpReward rarity={achievement.rarity}>
                  +{achievement.xpReward} XP
                </XpReward>

                <ProgressSection isUnlocked={isUnlocked}>
                  <ProgressBar>
                    <ProgressFill
                      progress={progressPercentage}
                      rarity={achievement.rarity}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 1, delay: 0.2 }}
                    />
                  </ProgressBar>
                  <ProgressText>
                    {achievement.progress} / {achievement.maxProgress}
                  </ProgressText>
                </ProgressSection>

                {isUnlocked && (
                  <ShareButton
                    variant="outline"
                    size="small"
                    onClick={() => handleShareAchievement(achievement)}
                  >
                    Share Achievement
                  </ShareButton>
                )}
              </AchievementCard>
            );
          })}
        </AnimatePresence>
      </AchievementsGrid>
    </ShowcaseContainer>
  );
};

export default AchievementShowcase;
