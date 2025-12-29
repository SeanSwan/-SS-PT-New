/**
 * 🎮 OVERWATCH 2-STYLE GAMIFICATION HUB
 * =====================================
 * Inspired by Overwatch 2's career profile and stats dashboard
 * Integrates with SwanStudios MCP Gamification Server
 *
 * Features:
 * - Overwatch-style hero select aesthetic
 * - Real-time stats from MCP server
 * - Achievement gallery with 3D unlocks
 * - Competitive leaderboards
 * - Season progression & battle pass
 * - Social features & challenges
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Target, Zap, Users, Gift, Star, Crown,
  Medal, Award, Sparkles, TrendingUp, Fire, Flame,
  Calendar, Globe, Heart, Gamepad2, Coins, Shield,
  Swords, Activity, BarChart3, Lock
} from 'lucide-react';

// MCP Integration
import { gamificationMcpService } from '../services/mcp/gamificationMcpService';
import type {
  GamificationProfile,
  Achievement,
  Challenge
} from '../types/mcp/gamification.types';

// ================================================================
// OVERWATCH-STYLE ANIMATIONS
// ================================================================

const hexagonScan = keyframes`
  0%, 100% {
    clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
    opacity: 1;
  }
  50% {
    clip-path: polygon(25% 10%, 75% 10%, 90% 50%, 75% 90%, 25% 90%, 10% 50%);
    opacity: 0.8;
  }
`;

const glitchEffect = keyframes`
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
`;

const overwatchGlow = keyframes`
  0%, 100% {
    box-shadow:
      0 0 20px rgba(255, 153, 0, 0.6),
      0 0 40px rgba(255, 153, 0, 0.4),
      inset 0 0 20px rgba(255, 153, 0, 0.2);
  }
  50% {
    box-shadow:
      0 0 30px rgba(255, 153, 0, 0.8),
      0 0 60px rgba(255, 153, 0, 0.6),
      inset 0 0 30px rgba(255, 153, 0, 0.3);
  }
`;

const progressFill = keyframes`
  from { width: 0%; }
  to { width: var(--progress); }
`;

// ================================================================
// OVERWATCH-THEMED STYLED COMPONENTS
// ================================================================

const HubContainer = styled(motion.div)`
  min-height: 100vh;
  background:
    linear-gradient(135deg, #0f1419 0%, #1a1f2e 25%, #2a2438 50%, #1a1f2e 75%, #0f1419 100%);
  background-size: 400% 400%;
  animation: ${css`
    ${keyframes`
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    `} 15s ease infinite
  `};
  position: relative;
  overflow: hidden;
  padding: 2rem;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background:
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        rgba(255, 153, 0, 0.03) 1px,
        transparent 2px,
        transparent 4px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        rgba(0, 162, 255, 0.03) 1px,
        transparent 2px,
        transparent 4px
      );
    pointer-events: none;
    animation: ${glitchEffect} 8s infinite;
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const HexagonBorder = styled.div`
  position: absolute;
  top: 10%;
  right: 5%;
  width: 200px;
  height: 200px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
  background: linear-gradient(135deg, rgba(255, 153, 0, 0.2), rgba(0, 162, 255, 0.2));
  animation: ${hexagonScan} 4s ease-in-out infinite;
  opacity: 0.3;
`;

const Header = styled(motion.header)`
  position: relative;
  z-index: 10;
  max-width: 1600px;
  margin: 0 auto 3rem;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(255, 153, 0, 0.1), rgba(0, 162, 255, 0.1));
  border: 2px solid rgba(255, 153, 0, 0.3);
  border-radius: 0;
  clip-path: polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px));

  @media (max-width: 768px) {
    padding: 1.5rem;
    margin-bottom: 2rem;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 2rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

const ProfileIcon = styled(motion.div)`
  width: 120px;
  height: 120px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  background: linear-gradient(135deg, #ff9900, #00a2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  animation: ${overwatchGlow} 3s ease-in-out infinite;

  &::before {
    content: '';
    position: absolute;
    inset: 3px;
    clip-path: inherit;
    background: #1a1f2e;
  }

  svg {
    position: relative;
    z-index: 1;
    width: 60px;
    height: 60px;
    color: #ff9900;
  }

  @media (max-width: 768px) {
    width: 100px;
    height: 100px;

    svg {
      width: 50px;
      height: 50px;
    }
  }
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const PlayerName = styled.h1`
  font-size: 3rem;
  font-weight: 900;
  text-transform: uppercase;
  background: linear-gradient(90deg, #ff9900, #00a2ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 2px;
  margin: 0 0 0.5rem 0;
  text-shadow: 0 0 30px rgba(255, 153, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const PlayerLevel = styled.div`
  font-size: 1.2rem;
  color: #00a2ff;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 1rem;

  @media (max-width: 768px) {
    justify-content: center;
    font-size: 1rem;
  }
`;

const LevelBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(255, 153, 0, 0.2), rgba(0, 162, 255, 0.2));
  border: 2px solid rgba(255, 153, 0, 0.5);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
`;

const StatsGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  max-width: 1600px;
  margin: 0 auto 3rem;
  position: relative;
  z-index: 5;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(26, 31, 46, 0.9);
  border: 2px solid rgba(255, 153, 0, 0.3);
  padding: 2rem;
  clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(255, 153, 0, 0.6);
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(255, 153, 0, 0.3);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, rgba(255, 153, 0, 0.3), transparent);
    clip-path: polygon(100% 0, 0 0, 100% 100%);
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  width: 60px;
  height: 60px;
  clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
  background: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;

  svg {
    width: 30px;
    height: 30px;
    color: white;
  }
`;

const StatValue = styled.div`
  font-size: 2.5rem;
  font-weight: 900;
  color: #ff9900;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.5);
  margin-top: 1rem;
  position: relative;
  overflow: hidden;
  clip-path: polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px);
`;

const ProgressFill = styled(motion.div)<{ $progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #ff9900, #00a2ff);
  --progress: ${props => props.$progress}%;
  animation: ${progressFill} 1.5s ease-out forwards;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 50%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
    animation: ${css`
      ${keyframes`
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      `} 2s ease-in-out infinite
    `};
  }
`;

const SectionTitle = styled(motion.h2)`
  font-size: 2rem;
  font-weight: 900;
  text-transform: uppercase;
  color: #ff9900;
  margin: 3rem 0 2rem;
  text-align: center;
  letter-spacing: 3px;
  position: relative;
  display: inline-block;
  left: 50%;
  transform: translateX(-50%);

  &::before,
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ff9900);
  }

  &::before {
    right: 100%;
    margin-right: 1rem;
  }

  &::after {
    left: 100%;
    margin-left: 1rem;
    background: linear-gradient(90deg, #ff9900, transparent);
  }
`;

const AchievementGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  max-width: 1600px;
  margin: 0 auto;
  position: relative;
  z-index: 5;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
`;

const AchievementCard = styled(motion.div)<{ $unlocked: boolean }>`
  aspect-ratio: 1;
  background: ${props =>
    props.$unlocked
      ? 'linear-gradient(135deg, rgba(255, 153, 0, 0.2), rgba(0, 162, 255, 0.2))'
      : 'rgba(26, 31, 46, 0.5)'
  };
  border: 2px solid ${props =>
    props.$unlocked
      ? 'rgba(255, 153, 0, 0.5)'
      : 'rgba(255, 255, 255, 0.1)'
  };
  clip-path: polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  filter: ${props => props.$unlocked ? 'grayscale(0)' : 'grayscale(100%)'};

  &:hover {
    transform: ${props => props.$unlocked ? 'translateY(-10px) scale(1.05)' : 'none'};
    border-color: ${props => props.$unlocked ? 'rgba(255, 153, 0, 0.8)' : 'rgba(255, 255, 255, 0.2)'};
    box-shadow: ${props => props.$unlocked ? '0 10px 30px rgba(255, 153, 0, 0.4)' : 'none'};
  }

  ${props => !props.$unlocked && css`
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &::after {
      content: '🔒';
      position: absolute;
      font-size: 2rem;
      z-index: 1;
    }
  `}
`;

const AchievementIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const AchievementName = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  color: #ff9900;
  font-size: 1.5rem;
  font-weight: 600;
`;

const Spinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 153, 0, 0.2);
  border-top-color: #ff9900;
  border-radius: 50%;
  margin-bottom: 1rem;
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

const OverwatchGamificationHub: React.FC = () => {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [mcpConnected, setMcpConnected] = useState(false);

  // Fetch data from MCP server
  const fetchGamificationData = useCallback(async () => {
    try {
      setLoading(true);

      // Check MCP server status
      const statusResponse = await gamificationMcpService.checkServerStatus();
      setMcpConnected(statusResponse.success);

      if (statusResponse.success) {
        // Get user ID from localStorage (or auth context)
        const userId = localStorage.getItem('userId') || 'demo-user';

        // Fetch gamification profile
        const profileResponse = await gamificationMcpService.getGamificationProfile({ userId });
        if (profileResponse.success && profileResponse.data) {
          setProfile(profileResponse.data);
        }

        // Fetch achievements
        const achievementsResponse = await gamificationMcpService.getAchievements({ userId });
        if (achievementsResponse.success && achievementsResponse.data) {
          setAchievements(achievementsResponse.data);
        }

        // Fetch challenges
        const challengesResponse = await gamificationMcpService.getChallenges({ userId });
        if (challengesResponse.success && challengesResponse.data) {
          setChallenges(challengesResponse.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch gamification data:', error);
      setMcpConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamificationData();
  }, [fetchGamificationData]);

  if (loading) {
    return (
      <HubContainer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <LoadingState>
          <Spinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <div>LOADING PLAYER STATS...</div>
        </LoadingState>
      </HubContainer>
    );
  }

  const levelProgress = profile ? (profile.points % 1000) / 10 : 0; // Example calculation

  return (
    <HubContainer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <HexagonBorder />
      <HexagonBorder style={{ top: '60%', right: '80%', width: '150px', height: '150px' }} />

      {/* Header */}
      <Header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <HeaderContent>
          <ProfileIcon
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            <Crown />
          </ProfileIcon>

          <HeaderInfo>
            <PlayerName>
              {mcpConnected ? 'SWAN WARRIOR' : 'OFFLINE MODE'}
            </PlayerName>
            <PlayerLevel>
              <LevelBadge>
                <Star size={20} />
                <span>LEVEL {profile?.level || 1}</span>
              </LevelBadge>
              <span>{profile?.points || 0} XP</span>
            </PlayerLevel>
            <ProgressBar>
              <ProgressFill $progress={levelProgress} />
            </ProgressBar>
          </HeaderInfo>
        </HeaderContent>
      </Header>

      {/* Stats Grid */}
      <StatsGrid
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        <StatCard
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon $color="linear-gradient(135deg, #ff9900, #ff6b00)">
            <Fire />
          </StatIcon>
          <StatValue>{profile?.streak || 0}</StatValue>
          <StatLabel>Day Streak</StatLabel>
        </StatCard>

        <StatCard
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon $color="linear-gradient(135deg, #00a2ff, #0066cc)">
            <Trophy />
          </StatIcon>
          <StatValue>{achievements.filter(a => a.isUnlocked).length}</StatValue>
          <StatLabel>Achievements</StatLabel>
        </StatCard>

        <StatCard
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon $color="linear-gradient(135deg, #7851a9, #5a3d8a)">
            <Target />
          </StatIcon>
          <StatValue>{profile?.challengesCompleted || 0}</StatValue>
          <StatLabel>Challenges</StatLabel>
        </StatCard>

        <StatCard
          variants={{
            hidden: { y: 20, opacity: 0 },
            visible: { y: 0, opacity: 1 },
          }}
          whileHover={{ scale: 1.05 }}
        >
          <StatIcon $color="linear-gradient(135deg, #00e676, #00c853)">
            <Zap />
          </StatIcon>
          <StatValue>{profile?.powerups || 0}</StatValue>
          <StatLabel>Power-Ups</StatLabel>
        </StatCard>
      </StatsGrid>

      {/* Achievements Section */}
      <SectionTitle
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        ACHIEVEMENT GALLERY
      </SectionTitle>

      <AchievementGrid
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05,
            },
          },
        }}
      >
        {achievements.length > 0 ? (
          achievements.map((achievement, index) => (
            <AchievementCard
              key={achievement.id}
              $unlocked={achievement.isUnlocked}
              variants={{
                hidden: { scale: 0, opacity: 0 },
                visible: {
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                  },
                },
              }}
              whileHover={achievement.isUnlocked ? { scale: 1.1 } : {}}
            >
              <AchievementIcon>{achievement.icon || '🏆'}</AchievementIcon>
              <AchievementName>{achievement.name}</AchievementName>
            </AchievementCard>
          ))
        ) : (
          // Placeholder achievements
          Array.from({ length: 12 }).map((_, i) => (
            <AchievementCard
              key={i}
              $unlocked={false}
              variants={{
                hidden: { scale: 0, opacity: 0 },
                visible: { scale: 1, opacity: 1 },
              }}
            >
              <AchievementIcon>🔒</AchievementIcon>
              <AchievementName>Locked</AchievementName>
            </AchievementCard>
          ))
        )}
      </AchievementGrid>

      {/* MCP Status Indicator */}
      {!mcpConnected && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          padding: '1rem',
          background: 'rgba(255, 0, 0, 0.8)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          color: 'white',
          zIndex: 1000
        }}>
          ⚠️ MCP Server Offline - Using Fallback Data
        </div>
      )}
    </HubContainer>
  );
};

export default OverwatchGamificationHub;
