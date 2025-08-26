/**
 * 📊 LEADERBOARD WIDGET - SOCIAL COMPETITION DISPLAY
 * ================================================== 
 * Interactive leaderboard with rankings, stats, social features,
 * and competitive elements to drive engagement
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

const crownFloat = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
`;

const rankingPulse = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
    transform: scale(1.02);
  }
`;

const medalShine = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const levelUpCelebration = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.1) rotate(5deg); }
  50% { transform: scale(1.2) rotate(-5deg); }
  75% { transform: scale(1.1) rotate(3deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const streakFire = keyframes`
  0%, 100% { 
    filter: hue-rotate(0deg) brightness(1);
    text-shadow: 0 0 10px rgba(255, 69, 0, 0.8);
  }
  50% { 
    filter: hue-rotate(30deg) brightness(1.2);
    text-shadow: 0 0 20px rgba(255, 140, 0, 1);
  }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface LeaderboardUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  totalXP: number;
  weeklyXP: number;
  monthlyXP: number;
  rank: number;
  previousRank?: number;
  streak: number;
  totalWorkouts: number;
  completedChallenges: number;
  achievementCount: number;
  isOnline: boolean;
  isFriend: boolean;
  isCurrentUser: boolean;
  badges: string[];
  joinedDate: string;
}

export interface LeaderboardWidgetProps {
  timeframe?: 'weekly' | 'monthly' | 'all-time';
  category?: 'all' | 'fitness' | 'social' | 'achievements';
  limit?: number;
  showCurrentUser?: boolean;
  onFollowUser?: (userId: string) => void;
  onChallengeUser?: (userId: string) => void;
  className?: string;
}

export type LeaderboardTimeframe = 'weekly' | 'monthly' | 'all-time';
export type LeaderboardCategory = 'all' | 'fitness' | 'social' | 'achievements';

// ================================================================
// STYLED COMPONENTS
// ================================================================

const WidgetContainer = styled(motion.div)`
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const WidgetHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled(motion.h2)`
  font-size: 2rem;
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
  position: relative;

  &::after {
    content: '👑';
    position: absolute;
    top: -10px;
    right: -30px;
    font-size: 1.5rem;
    animation: ${crownFloat} 3s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
    
    &::after {
      right: -25px;
      font-size: 1.2rem;
    }
  }
`;

const FilterSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const FilterGroup = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const FilterLabel = styled.h4`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const PodiumSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const Podium = styled(motion.div)`
  display: flex;
  justify-content: center;
  align-items: end;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
  }
`;

const PodiumPlace = styled(motion.div)<{ place: number }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border-radius: 16px;
  min-width: 150px;
  
  background: ${props => {
    switch (props.place) {
      case 1: return 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.1))';
      case 2: return 'linear-gradient(135deg, rgba(192, 192, 192, 0.2), rgba(169, 169, 169, 0.1))';
      case 3: return 'linear-gradient(135deg, rgba(205, 127, 50, 0.2), rgba(160, 82, 45, 0.1))';
      default: return 'linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(120, 81, 169, 0.05))';
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.place) {
      case 1: return 'rgba(255, 215, 0, 0.5)';
      case 2: return 'rgba(192, 192, 192, 0.5)';
      case 3: return 'rgba(205, 127, 50, 0.5)';
      default: return 'rgba(0, 255, 255, 0.3)';
    }
  }};

  height: ${props => {
    switch (props.place) {
      case 1: return '200px';
      case 2: return '160px';
      case 3: return '120px';
      default: return '100px';
    }
  }};

  ${props => props.place === 1 && `
    animation: ${levelUpCelebration} 2s ease-out;
  `}

  @media (max-width: 768px) {
    min-width: 120px;
    height: auto !important;
    padding: 1rem 0.5rem;
  }
`;

const PodiumMedal = styled.div<{ place: number }>`
  font-size: 2rem;
  margin-bottom: 0.5rem;
  position: relative;
  
  ${props => props.place <= 3 && `
    &::before {
      content: '';
      position: absolute;
      top: -5px;
      left: -5px;
      right: -5px;
      bottom: -5px;
      background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.3), transparent);
      border-radius: 50%;
      animation: ${medalShine} 3s linear infinite;
    }
  `}
`;

const PodiumUser = styled.div`
  text-align: center;
`;

const PodiumUsername = styled.div`
  font-weight: 700;
  color: #FFFFFF;
  margin-bottom: 0.25rem;
  font-size: 0.9rem;
`;

const PodiumXP = styled.div<{ place: number }>`
  font-weight: 600;
  font-size: 0.8rem;
  color: ${props => {
    switch (props.place) {
      case 1: return '#FFD700';
      case 2: return '#C0C0C0';
      case 3: return '#CD7F32';
      default: return '#00FFFF';
    }
  }};
`;

const LeaderboardList = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const LeaderboardRow = styled(motion.div)<{ 
  rank: number; 
  isCurrentUser: boolean;
  isRising?: boolean;
}>`
  display: flex;
  align-items: center;
  padding: 1rem;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  cursor: pointer;

  background: ${props => {
    if (props.isCurrentUser) {
      return 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(120, 81, 169, 0.1))';
    }
    if (props.rank <= 3) {
      return 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.05))';
    }
    if (props.rank <= 10) {
      return 'linear-gradient(135deg, rgba(0, 255, 255, 0.08), rgba(120, 81, 169, 0.05))';
    }
    return 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(120, 81, 169, 0.03))';
  }};

  border: 1px solid ${props => {
    if (props.isCurrentUser) return 'rgba(0, 255, 255, 0.4)';
    if (props.rank <= 3) return 'rgba(255, 215, 0, 0.3)';
    if (props.rank <= 10) return 'rgba(0, 255, 255, 0.2)';
    return 'rgba(255, 255, 255, 0.1)';
  }};

  ${props => props.isCurrentUser && `
    animation: ${rankingPulse} 3s ease-in-out infinite;
  `}

  &:hover {
    transform: translateX(5px);
    box-shadow: 0 8px 25px rgba(0, 255, 255, 0.2);
  }
`;

const RankPosition = styled.div<{ rank: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 40px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1rem;
  margin-right: 1rem;

  background: ${props => {
    if (props.rank === 1) return 'linear-gradient(135deg, #FFD700, #FFA500)';
    if (props.rank === 2) return 'linear-gradient(135deg, #C0C0C0, #A9A9A9)';
    if (props.rank === 3) return 'linear-gradient(135deg, #CD7F32, #A0522D)';
    if (props.rank <= 10) return 'linear-gradient(135deg, #00FFFF, #7851A9)';
    return 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(120, 81, 169, 0.2))';
  }};

  color: ${props => (props.rank <= 3 ? '#000' : '#FFF')};

  @media (max-width: 768px) {
    min-width: 35px;
    height: 35px;
    font-size: 0.9rem;
    margin-right: 0.75rem;
  }
`;

const RankChange = styled.div<{ change: 'up' | 'down' | 'new' | 'same' }>`
  font-size: 0.7rem;
  margin-left: 0.25rem;
  color: ${props => {
    switch (props.change) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      case 'new': return '#2196F3';
      default: return 'rgba(255, 255, 255, 0.5)';
    }
  }};
`;

const UserInfo = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
`;

const Avatar = styled.div<{ isOnline: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00FFFF, #7851A9);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 0.75rem;
  position: relative;
  font-weight: 700;
  color: white;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${props => props.isOnline ? '#4CAF50' : '#757575'};
    border: 2px solid #000;
  }

  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
    margin-right: 0.5rem;
    
    &::after {
      width: 10px;
      height: 10px;
      bottom: 1px;
      right: 1px;
    }
  }
`;

const UserDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

const Username = styled.div`
  font-weight: 600;
  color: #FFFFFF;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const UserStats = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  gap: 1rem;
  align-items: center;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    gap: 0.5rem;
  }
`;

const StatBadge = styled.span<{ type: 'streak' | 'level' | 'achievements' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  ${props => props.type === 'streak' && `
    animation: ${streakFire} 2s ease-in-out infinite;
  `}
`;

const XPDisplay = styled.div`
  text-align: right;
  margin-left: 1rem;

  @media (max-width: 768px) {
    margin-left: 0.5rem;
  }
`;

const XPValue = styled.div`
  font-weight: 700;
  color: #00FFFF;
  font-size: 1rem;

  @media (max-width: 768px) {
    font-size: 0.9rem;
  }
`;

const XPLabel = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-left: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.25rem;
    margin-left: 0.5rem;
  }
`;

const CurrentUserIndicator = styled.div`
  background: linear-gradient(135deg, #00FFFF, #7851A9);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  margin-left: 0.5rem;
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({
  timeframe = 'weekly',
  category = 'all',
  limit = 50,
  showCurrentUser = true,
  onFollowUser,
  onChallengeUser,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================

  const [activeTimeframe, setActiveTimeframe] = useState<LeaderboardTimeframe>(timeframe);
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>(category);
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);

  // ================================================================
  // TAB OPTIONS
  // ================================================================

  const timeframeOptions = [
    { id: 'weekly', label: 'Weekly', icon: '📅' },
    { id: 'monthly', label: 'Monthly', icon: '🗓️' },
    { id: 'all-time', label: 'All Time', icon: '🏆' }
  ];

  const categoryOptions = [
    { id: 'all', label: 'Overall', icon: '🎯' },
    { id: 'fitness', label: 'Fitness', icon: '💪' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' }
  ];

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const topThree = users.slice(0, 3);
  const remainingUsers = users.slice(3, limit);
  
  const getXPForTimeframe = (user: LeaderboardUser) => {
    switch (activeTimeframe) {
      case 'weekly': return user.weeklyXP;
      case 'monthly': return user.monthlyXP;
      default: return user.totalXP;
    }
  };

  const getRankChange = (user: LeaderboardUser) => {
    if (!user.previousRank) return 'new';
    if (user.rank < user.previousRank) return 'up';
    if (user.rank > user.previousRank) return 'down';
    return 'same';
  };

  const getRankChangeIcon = (change: string) => {
    switch (change) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'new': return '✨';
      default: return '➖';
    }
  };

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  const handleFollowUser = (userId: string) => {
    onFollowUser?.(userId);
  };

  const handleChallengeUser = (userId: string) => {
    onChallengeUser?.(userId);
  };

  // ================================================================
  // ANIMATION VARIANTS
  // ================================================================

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  // ================================================================
  // MOCK DATA (TODO: Replace with API)
  // ================================================================

  useEffect(() => {
    // Mock leaderboard data
    const mockUsers: LeaderboardUser[] = [
      {
        id: '1',
        username: 'fitnessguru',
        displayName: 'Fitness Guru',
        level: 25,
        totalXP: 12847,
        weeklyXP: 1247,
        monthlyXP: 4830,
        rank: 1,
        previousRank: 2,
        streak: 15,
        totalWorkouts: 87,
        completedChallenges: 23,
        achievementCount: 45,
        isOnline: true,
        isFriend: false,
        isCurrentUser: false,
        badges: ['🔥', '💪', '🏆'],
        joinedDate: '2024-01-15'
      },
      {
        id: '2',
        username: 'currentuser',
        displayName: 'You',
        level: 18,
        totalXP: 8930,
        weeklyXP: 890,
        monthlyXP: 3420,
        rank: 5,
        previousRank: 7,
        streak: 7,
        totalWorkouts: 52,
        completedChallenges: 15,
        achievementCount: 28,
        isOnline: true,
        isFriend: false,
        isCurrentUser: true,
        badges: ['🔥', '💪'],
        joinedDate: '2024-03-10'
      },
      // Add more mock users...
    ];

    // Generate additional mock users
    for (let i = 3; i <= 20; i++) {
      mockUsers.push({
        id: `user${i}`,
        username: `user${i}`,
        displayName: `User ${i}`,
        level: Math.floor(Math.random() * 30) + 1,
        totalXP: Math.floor(Math.random() * 10000) + 1000,
        weeklyXP: Math.floor(Math.random() * 500) + 50,
        monthlyXP: Math.floor(Math.random() * 2000) + 200,
        rank: i,
        previousRank: Math.floor(Math.random() * 25) + 1,
        streak: Math.floor(Math.random() * 20),
        totalWorkouts: Math.floor(Math.random() * 100),
        completedChallenges: Math.floor(Math.random() * 30),
        achievementCount: Math.floor(Math.random() * 50),
        isOnline: Math.random() > 0.5,
        isFriend: Math.random() > 0.7,
        isCurrentUser: false,
        badges: ['🔥'],
        joinedDate: '2024-01-01'
      });
    }

    // Sort by the appropriate XP value
    mockUsers.sort((a, b) => {
      const aXP = getXPForTimeframe(a);
      const bXP = getXPForTimeframe(b);
      return bXP - aXP;
    });

    // Update ranks
    mockUsers.forEach((user, index) => {
      user.rank = index + 1;
    });

    setUsers(mockUsers);
    setCurrentUser(mockUsers.find(u => u.isCurrentUser) || null);
  }, [activeTimeframe, activeCategory]);

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <WidgetContainer className={className}>
      <WidgetHeader>
        <Title>📊 Leaderboard</Title>
      </WidgetHeader>

      <FilterSection>
        <FilterGroup>
          <FilterLabel>Timeframe</FilterLabel>
          <TabNavigation
            options={timeframeOptions}
            activeTab={activeTimeframe}
            onTabChange={(tab) => setActiveTimeframe(tab as LeaderboardTimeframe)}
            variant="cosmic"
            orientation="horizontal"
          />
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Category</FilterLabel>
          <TabNavigation
            options={categoryOptions}
            activeTab={activeCategory}
            onTabChange={(tab) => setActiveCategory(tab as LeaderboardCategory)}
            variant="minimal"
            orientation="horizontal"
          />
        </FilterGroup>
      </FilterSection>

      <PodiumSection>
        <Podium>
          {topThree.map((user, index) => {
            const place = index + 1;
            const medalEmojis = ['🥇', '🥈', '🥉'];
            
            return (
              <PodiumPlace
                key={user.id}
                place={place}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                <PodiumMedal place={place}>
                  {medalEmojis[index]}
                </PodiumMedal>
                <PodiumUser>
                  <PodiumUsername>{user.displayName}</PodiumUsername>
                  <PodiumXP place={place}>
                    {getXPForTimeframe(user).toLocaleString()} XP
                  </PodiumXP>
                </PodiumUser>
              </PodiumPlace>
            );
          })}
        </Podium>
      </PodiumSection>

      <LeaderboardList
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <AnimatePresence>
          {remainingUsers.map((user) => {
            const xpValue = getXPForTimeframe(user);
            const rankChange = getRankChange(user);
            const rankChangeIcon = getRankChangeIcon(rankChange);

            return (
              <LeaderboardRow
                key={user.id}
                variants={itemVariants}
                layout
                rank={user.rank}
                isCurrentUser={user.isCurrentUser}
                isRising={rankChange === 'up'}
              >
                <RankPosition rank={user.rank}>
                  {user.rank}
                  <RankChange change={rankChange}>
                    {rankChangeIcon}
                  </RankChange>
                </RankPosition>

                <UserInfo>
                  <Avatar isOnline={user.isOnline}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </Avatar>
                  <UserDetails>
                    <Username>
                      {user.displayName}
                      {user.isCurrentUser && (
                        <CurrentUserIndicator>You</CurrentUserIndicator>
                      )}
                    </Username>
                    <UserStats>
                      <StatBadge type="level">
                        ⭐ Level {user.level}
                      </StatBadge>
                      <StatBadge type="streak">
                        🔥 {user.streak}
                      </StatBadge>
                      <StatBadge type="achievements">
                        🏆 {user.achievementCount}
                      </StatBadge>
                    </UserStats>
                  </UserDetails>
                </UserInfo>

                <XPDisplay>
                  <XPValue>{xpValue.toLocaleString()}</XPValue>
                  <XPLabel>XP</XPLabel>
                </XPDisplay>

                {!user.isCurrentUser && (
                  <ActionButtons>
                    <AnimatedButton
                      variant="outline"
                      size="small"
                      onClick={() => handleFollowUser(user.id)}
                    >
                      {user.isFriend ? '👥' : '➕'}
                    </AnimatedButton>
                    <AnimatedButton
                      variant="primary"
                      size="small"
                      onClick={() => handleChallengeUser(user.id)}
                    >
                      ⚡
                    </AnimatedButton>
                  </ActionButtons>
                )}
              </LeaderboardRow>
            );
          })}
        </AnimatePresence>
      </LeaderboardList>
    </WidgetContainer>
  );
};

export default LeaderboardWidget;
