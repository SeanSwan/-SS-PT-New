/**
 * 🚀 GAMIFICATION SYSTEM INTEGRATION EXAMPLE
 * ===========================================
 * Complete integration example showing how to use all gamification components
 * together with Redux state management and real-time updates
 */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GamificationHub,
  AchievementShowcase,
  ChallengeCenter,
  LeaderboardWidget,
  ProgressTracker,
  TabNavigation,
  fetchUserStats,
  fetchAchievements,
  fetchChallenges,
  fetchLeaderboard,
  fetchProgressData,
  fetchMilestones,
  fetchGoals,
  joinChallenge,
  leaveChallenge,
  createChallenge,
  createGoal,
  shareAchievement,
  followUser,
  challengeUser,
  selectUserStats,
  selectAchievements,
  selectActiveChallenges,
  selectAvailableChallenges,
  selectLeaderboard,
  selectProgressData,
  selectMilestones,
  selectGoals,
  selectGamificationLoading,
  selectGamificationError
} from '../';
import type { RootState, AppDispatch } from '../../../redux/store';

// ================================================================
// STYLED COMPONENTS
// ================================================================

const IntegrationContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, 
    rgba(10, 10, 30, 0.95) 0%,
    rgba(30, 30, 60, 0.9) 25%,
    rgba(120, 81, 169, 0.1) 50%,
    rgba(0, 255, 255, 0.05) 75%,
    rgba(10, 10, 30, 0.95) 100%
  );
  background-size: 400% 400%;
  animation: galaxyFlow 20s ease-in-out infinite;
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
`;

const Header = styled(motion.div)`
  text-align: center;
  margin-bottom: 3rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const Title = styled(motion.h1)`
  font-size: 3.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, 
    #00FFFF 0%, 
    #7851A9 50%, 
    #FFD700 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
  text-shadow: 0 0 30px rgba(0, 255, 255, 0.3);

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const Subtitle = styled(motion.p)`
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const NavigationContainer = styled(motion.div)`
  max-width: 1200px;
  margin: 0 auto 3rem;
`;

const ContentContainer = styled(motion.div)`
  max-width: 1400px;
  margin: 0 auto;
  min-height: 600px;
`;

const LoadingIndicator = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.8);
`;

const ErrorMessage = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
  font-size: 1.2rem;
  color: #FF6B6B;
  text-align: center;
`;

const StatsBar = styled(motion.div)`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.1),
    rgba(120, 81, 169, 0.1)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1rem 2rem;
  margin-bottom: 2rem;
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;

  @media (max-width: 768px) {
    padding: 1rem;
    justify-content: center;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #00FFFF;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const GamificationSystemIntegration: React.FC = () => {
  // ================================================================
  // HOOKS AND STATE
  // ================================================================

  const dispatch = useDispatch<AppDispatch>();
  const [activeTab, setActiveTab] = useState('hub');
  const [userId] = useState('current-user'); // TODO: Get from auth context

  // Redux selectors
  const userStats = useSelector(selectUserStats);
  const achievements = useSelector(selectAchievements);
  const activeChallenges = useSelector(selectActiveChallenges);
  const availableChallenges = useSelector(selectAvailableChallenges);
  const leaderboard = useSelector(selectLeaderboard);
  const progressData = useSelector(selectProgressData);
  const milestones = useSelector(selectMilestones);
  const goals = useSelector(selectGoals);
  const loading = useSelector(selectGamificationLoading);
  const error = useSelector(selectGamificationError);

  // ================================================================
  // TAB CONFIGURATION
  // ================================================================

  const tabOptions = [
    { id: 'hub', label: 'Dashboard', icon: '🏠' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' },
    { id: 'challenges', label: 'Challenges', icon: '🎯' },
    { id: 'leaderboard', label: 'Leaderboard', icon: '📊' },
    { id: 'progress', label: 'Progress', icon: '📈' }
  ];

  // ================================================================
  // EFFECTS
  // ================================================================

  useEffect(() => {
    // Initial data fetch
    if (userId) {
      dispatch(fetchUserStats(userId));
      dispatch(fetchAchievements(userId));
      dispatch(fetchChallenges({}));
      dispatch(fetchLeaderboard({ timeframe: 'weekly', category: 'all' }));
      dispatch(fetchProgressData({ userId, timeframe: 'monthly' }));
      dispatch(fetchMilestones(userId));
      dispatch(fetchGoals(userId));
    }
  }, [dispatch, userId]);

  // Real-time updates simulation (replace with actual WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      if (userId && !loading.stats) {
        // Simulate real-time stat updates
        // In a real app, this would be handled by WebSocket connections
        // dispatch(updateUserStatsRealtime({ weeklyXP: userStats?.weeklyXP + 5 }));
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [dispatch, userId, loading.stats, userStats]);

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  const handleJoinChallenge = (challengeId: string) => {
    dispatch(joinChallenge({ challengeId, userId }));
  };

  const handleLeaveChallenge = (challengeId: string) => {
    dispatch(leaveChallenge({ challengeId, userId }));
  };

  const handleCreateChallenge = (challengeData: any) => {
    dispatch(createChallenge({
      ...challengeData,
      createdBy: userId
    }));
  };

  const handleShareAchievement = (achievement: any) => {
    dispatch(shareAchievement({ 
      achievementId: achievement.id, 
      platform: 'social' 
    }));
  };

  const handleFollowUser = (targetUserId: string) => {
    dispatch(followUser({ userId, targetUserId }));
  };

  const handleChallengeUser = (targetUserId: string) => {
    dispatch(challengeUser({ 
      userId, 
      targetUserId, 
      challengeType: 'weekly-xp' 
    }));
  };

  const handleSetGoal = (goalData: any) => {
    dispatch(createGoal({ userId, goalData }));
  };

  // ================================================================
  // RENDER HELPERS
  // ================================================================

  const renderActiveContent = () => {
    if (loading.stats && !userStats) {
      return (
        <LoadingIndicator>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            ⭐
          </motion.div>
          <span style={{ marginLeft: '1rem' }}>Loading your gamification data...</span>
        </LoadingIndicator>
      );
    }

    if (error.stats || error.achievements || error.challenges) {
      return (
        <ErrorMessage>
          <div>
            <h3>Oops! Something went wrong</h3>
            <p>Please try refreshing the page or contact support if the issue persists.</p>
          </div>
        </ErrorMessage>
      );
    }

    switch (activeTab) {
      case 'hub':
        return (
          <GamificationHub
            userId={userId}
          />
        );

      case 'achievements':
        return (
          <AchievementShowcase
            achievements={achievements}
            onShareAchievement={handleShareAchievement}
          />
        );

      case 'challenges':
        return (
          <ChallengeCenter
            onCreateChallenge={handleCreateChallenge}
            onJoinChallenge={handleJoinChallenge}
            onLeaveChallenge={handleLeaveChallenge}
          />
        );

      case 'leaderboard':
        return (
          <LeaderboardWidget
            timeframe="weekly"
            category="all"
            showCurrentUser={true}
            onFollowUser={handleFollowUser}
            onChallengeUser={handleChallengeUser}
          />
        );

      case 'progress':
        return (
          <ProgressTracker
            timeframe="monthly"
            onSetGoal={handleSetGoal}
          />
        );

      default:
        return null;
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
        duration: 0.8,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <IntegrationContainer
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Header variants={itemVariants}>
        <Title>🎮 SwanStudios Gamification System</Title>
        <Subtitle>
          Your complete fitness journey with achievements, challenges, and social competition
        </Subtitle>

        {userStats && (
          <StatsBar variants={itemVariants}>
            <StatItem>
              <StatValue>Level {userStats.level}</StatValue>
              <StatLabel>Current Level</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{userStats.totalXP.toLocaleString()}</StatValue>
              <StatLabel>Total XP</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{userStats.streakDays}</StatValue>
              <StatLabel>Day Streak</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>#{userStats.rank}</StatValue>
              <StatLabel>Global Rank</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{userStats.totalAchievements}</StatValue>
              <StatLabel>Achievements</StatLabel>
            </StatItem>
            <StatItem>
              <StatValue>{activeChallenges.length}</StatValue>
              <StatLabel>Active Challenges</StatLabel>
            </StatItem>
          </StatsBar>
        )}
      </Header>

      <NavigationContainer variants={itemVariants}>
        <TabNavigation
          options={tabOptions}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="cosmic"
          orientation="horizontal"
        />
      </NavigationContainer>

      <ContentContainer>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderActiveContent()}
          </motion.div>
        </AnimatePresence>
      </ContentContainer>
    </IntegrationContainer>
  );
};

export default GamificationSystemIntegration;
