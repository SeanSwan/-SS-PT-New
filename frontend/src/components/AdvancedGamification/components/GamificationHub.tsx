/**
 * 🎮 GAMIFICATION HUB - MAIN USER DASHBOARD
 * ========================================== 
 * Central dashboard for user's gamification journey, progress tracking,
 * achievements, active challenges, and social engagement features
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

const galaxyFlow = keyframes`
  0%, 100% { 
    background-position: 0% 50%;
    transform: rotate(0deg);
  }
  25% { background-position: 100% 50%; }
  50% { 
    background-position: 100% 100%;
    transform: rotate(0.5deg);
  }
  75% { background-position: 0% 100%; }
`;

const statsCounter = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const achievementPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
                0 0 40px rgba(120, 81, 169, 0.2);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6),
                0 0 60px rgba(120, 81, 169, 0.4);
  }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface UserStats {
  totalXP: number;
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  streakDays: number;
  completedChallenges: number;
  totalAchievements: number;
  rank: number;
  totalUsers: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconUrl?: string;
  xpReward: number;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  category: 'fitness' | 'social' | 'streak' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface ActiveChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  expiresAt: string;
  progress: number;
  maxProgress: number;
  challengeType: 'daily' | 'weekly' | 'monthly' | 'community';
}

export interface GamificationHubProps {
  userId: string;
  className?: string;
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const HubContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, 
    rgba(10, 10, 30, 0.95) 0%,
    rgba(30, 30, 60, 0.9) 25%,
    rgba(120, 81, 169, 0.1) 50%,
    rgba(0, 255, 255, 0.05) 75%,
    rgba(10, 10, 30, 0.95) 100%
  );
  background-size: 400% 400%;
  animation: ${galaxyFlow} 20s ease-in-out infinite;
  padding: 2rem 1rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(ellipse at top, rgba(0, 255, 255, 0.05) 0%, transparent 70%);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    padding: 1rem 0.5rem;
  }
`;

const HubHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
`;

const WelcomeTitle = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, 
    #00FFFF 0%, 
    #7851A9 50%, 
    #00A0E3 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.3);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SubTitle = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  max-width: 1400px;
  margin-left: auto;
  margin-right: auto;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

const StatCard = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.1) 0%,
    rgba(120, 81, 169, 0.05) 100%
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, 
      transparent,
      rgba(0, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s ease;
  }

  &:hover::before {
    left: 100%;
  }

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    box-shadow: 0 8px 32px rgba(0, 255, 255, 0.2);
  }
`;

const StatValue = styled(motion.div)`
  font-size: 2.5rem;
  font-weight: 700;
  color: #00FFFF;
  margin-bottom: 0.5rem;
  animation: ${statsCounter} 0.8s ease-out;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const LevelProgress = styled(motion.div)`
  width: 100%;
  height: 8px;
  background: rgba(0, 255, 255, 0.1);
  border-radius: 4px;
  margin-top: 1rem;
  overflow: hidden;
`;

const ProgressBar = styled(motion.div)<{ progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #00FFFF, #7851A9);
  border-radius: 4px;
  width: ${props => props.progress}%;
  transition: width 1s ease;
`;

const ContentTabs = styled(motion.div)`
  max-width: 1400px;
  margin: 0 auto;
`;

const TabContent = styled(motion.div)`
  margin-top: 2rem;
`;

const QuickActionsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const GamificationHub: React.FC<GamificationHubProps> = ({
  userId,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================

  const [activeTab, setActiveTab] = useState('overview');
  const [userStats, setUserStats] = useState<UserStats>({
    totalXP: 2847,
    level: 12,
    currentLevelXP: 347,
    nextLevelXP: 500,
    streakDays: 7,
    completedChallenges: 23,
    totalAchievements: 15,
    rank: 142,
    totalUsers: 2847
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<ActiveChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const levelProgress = (userStats.currentLevelXP / userStats.nextLevelXP) * 100;
  const rankPercentile = Math.round(((userStats.totalUsers - userStats.rank) / userStats.totalUsers) * 100);

  // ================================================================
  // TAB CONFIGURATION
  // ================================================================

  const tabOptions = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'challenges', label: 'Challenges', icon: '🎯' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '📊' },
    { id: 'progress', label: 'Progress', icon: '📈' }
  ];

  // ================================================================
  // ANIMATION VARIANTS
  // ================================================================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
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

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    // TODO: Fetch user stats, achievements, and challenges
    setIsLoading(false);
  }, [userId]);

  // ================================================================
  // RENDER FUNCTIONS
  // ================================================================

  const renderOverviewContent = () => (
    <TabContent
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <StatsGrid variants={statsVariants} initial="hidden" animate="visible">
        <StatCard variants={itemVariants}>
          <StatValue>{userStats.totalXP.toLocaleString()}</StatValue>
          <StatLabel>Total XP</StatLabel>
        </StatCard>

        <StatCard variants={itemVariants}>
          <StatValue>Level {userStats.level}</StatValue>
          <StatLabel>Current Level</StatLabel>
          <LevelProgress>
            <ProgressBar progress={levelProgress} />
          </LevelProgress>
        </StatCard>

        <StatCard variants={itemVariants}>
          <StatValue>{userStats.streakDays}</StatValue>
          <StatLabel>Day Streak</StatLabel>
        </StatCard>

        <StatCard variants={itemVariants}>
          <StatValue>#{userStats.rank}</StatValue>
          <StatLabel>Global Rank ({rankPercentile}%)</StatLabel>
        </StatCard>
      </StatsGrid>

      <QuickActionsGrid>
        <GamificationCard
          variant="gradient"
          size="medium"
          padding="medium"
          isHoverable
        >
          <h3 style={{ color: '#00FFFF', marginBottom: '1rem' }}>Daily Challenge</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
            Complete 3 workout sessions today
          </p>
          <AnimatedButton 
            variant="primary"
            size="medium"
            fullWidth
          >
            Start Challenge
          </AnimatedButton>
        </GamificationCard>

        <GamificationCard
          variant="glass"
          size="medium"
          padding="medium"
          isHoverable
        >
          <h3 style={{ color: '#7851A9', marginBottom: '1rem' }}>Recent Achievement</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
            🏆 Week Warrior - 7 day streak!
          </p>
          <AnimatedButton 
            variant="secondary"
            size="medium"
            fullWidth
          >
            View All
          </AnimatedButton>
        </GamificationCard>

        <GamificationCard
          variant="outlined"
          size="medium"
          padding="medium"
          isHoverable
        >
          <h3 style={{ color: '#00FFFF', marginBottom: '1rem' }}>Community</h3>
          <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
            Join weekly group challenges
          </p>
          <AnimatedButton 
            variant="outline"
            size="medium"
            fullWidth
          >
            Explore
          </AnimatedButton>
        </GamificationCard>
      </QuickActionsGrid>
    </TabContent>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <HubContainer
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <HubHeader variants={itemVariants}>
        <WelcomeTitle>
          🌟 Your Fitness Journey
        </WelcomeTitle>
        <SubTitle>
          Track progress, unlock achievements, and join the community
        </SubTitle>
      </HubHeader>

      <ContentTabs>
        <TabNavigation
          options={tabOptions}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="cosmic"
          orientation="horizontal"
        />

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && renderOverviewContent()}
          
          {activeTab === 'achievements' && (
            <TabContent key="achievements">
              <GamificationCard variant="glass" padding="large">
                <h2 style={{ color: '#00FFFF', textAlign: 'center' }}>
                  🏆 Achievement Showcase Coming Soon!
                </h2>
              </GamificationCard>
            </TabContent>
          )}

          {activeTab === 'challenges' && (
            <TabContent key="challenges">
              <GamificationCard variant="gradient" padding="large">
                <h2 style={{ color: '#7851A9', textAlign: 'center' }}>
                  🎯 Challenge Center Coming Soon!
                </h2>
              </GamificationCard>
            </TabContent>
          )}

          {activeTab === 'leaderboard' && (
            <TabContent key="leaderboard">
              <GamificationCard variant="premium" padding="large">
                <h2 style={{ color: '#00FFFF', textAlign: 'center' }}>
                  📊 Leaderboard Coming Soon!
                </h2>
              </GamificationCard>
            </TabContent>
          )}

          {activeTab === 'progress' && (
            <TabContent key="progress">
              <GamificationCard variant="elevated" padding="large">
                <h2 style={{ color: '#7851A9', textAlign: 'center' }}>
                  📈 Progress Tracker Coming Soon!
                </h2>
              </GamificationCard>
            </TabContent>
          )}
        </AnimatePresence>
      </ContentTabs>
    </HubContainer>
  );
};

export default GamificationHub;
