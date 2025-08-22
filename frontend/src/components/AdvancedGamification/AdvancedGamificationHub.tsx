/**
 * 🎮 ADVANCED GAMIFICATION HUB - PHASE 4 ENHANCEMENT
 * ================================================================
 * 
 * Revolutionary gamification system that transforms fitness into
 * an engaging, social, and rewarding experience using cutting-edge
 * UX patterns and Digital Alchemist design principles.
 * 
 * Features:
 * - 🏆 Dynamic Achievement System with 3D Badge Animations
 * - 🎯 Social Challenges with Real-Time Leaderboards  
 * - ⚡ Streak Tracking with Celebration Effects
 * - 🎊 Community Events and Global Competitions
 * - 💎 Reward Marketplace with Premium Unlocks
 * - 📊 Advanced Analytics with Predictive Insights
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { 
  Trophy, Target, Zap, Users, Gift, Star, Crown, 
  Medal, Award, Sparkles, TrendingUp, Fire,
  Calendar, Globe, Heart, Gamepad2, Coins
} from 'lucide-react';

// ================================================================
// ADVANCED ANIMATIONS & EFFECTS
// ================================================================

const shimmerEffect = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3),
                0 0 40px rgba(120, 81, 169, 0.2),
                inset 0 0 20px rgba(255, 255, 255, 0.1);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6),
                0 0 60px rgba(120, 81, 169, 0.4),
                inset 0 0 30px rgba(255, 255, 255, 0.2);
  }
`;

const floatingParticles = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
  25% { transform: translateY(-10px) rotate(90deg); opacity: 0.8; }
  50% { transform: translateY(-5px) rotate(180deg); opacity: 0.6; }
  75% { transform: translateY(-15px) rotate(270deg); opacity: 0.9; }
`;

const achievementUnlock = keyframes`
  0% { 
    transform: scale(0) rotate(-180deg);
    opacity: 0;
    filter: hue-rotate(0deg);
  }
  30% { 
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
    filter: hue-rotate(180deg);
  }
  70% { 
    transform: scale(0.95) rotate(10deg);
    filter: hue-rotate(360deg);
  }
  100% { 
    transform: scale(1) rotate(0deg);
    opacity: 1;
    filter: hue-rotate(0deg);
  }
`;

// ================================================================
// STYLED COMPONENTS WITH GALAXY-SWAN THEME
// ================================================================

const GamificationContainer = styled(motion.div)`
  min-height: 100vh;
  background: 
    radial-gradient(circle at 20% 30%, rgba(120, 81, 169, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 80% 70%, rgba(0, 255, 255, 0.2) 0%, transparent 50%),
    linear-gradient(135deg, #0a0a0f 0%, #16213e 25%, #2e1e3e 50%, #16213e 75%, #0a0a0f 100%);
  background-size: 400% 400%;
  animation: ${css`
    ${keyframes`
      0%, 100% { background-position: 0% 0%; }
      25% { background-position: 100% 0%; }
      50% { background-position: 100% 100%; }
      75% { background-position: 0% 100%; }
    `} 20s ease-in-out infinite
  `};
  padding: 2rem;
  position: relative;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 1rem;
    min-height: calc(100vh - 60px);
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 30% 20%, rgba(255, 215, 0, 0.1) 0%, transparent 30%),
      radial-gradient(circle at 70% 80%, rgba(138, 43, 226, 0.1) 0%, transparent 30%);
    pointer-events: none;
    z-index: 1;
  }
`;

const FloatingParticle = styled(motion.div)`
  position: absolute;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, #00ffff 0%, #7851a9 100%);
  border-radius: 50%;
  animation: ${floatingParticles} 8s ease-in-out infinite;
  z-index: 2;
`;

const SectionGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  z-index: 3;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const GamificationCard = styled(motion.div)<{ variant?: 'primary' | 'secondary' | 'achievement' }>`
  background: ${props => {
    switch(props.variant) {
      case 'achievement':
        return `
          linear-gradient(135deg, 
            rgba(255, 215, 0, 0.15) 0%,
            rgba(255, 140, 0, 0.1) 25%,
            rgba(120, 81, 169, 0.1) 50%,
            rgba(0, 255, 255, 0.1) 75%,
            rgba(255, 215, 0, 0.15) 100%
          )
        `;
      case 'secondary':
        return `
          linear-gradient(135deg, 
            rgba(120, 81, 169, 0.15) 0%,
            rgba(75, 0, 130, 0.1) 50%,
            rgba(0, 255, 255, 0.1) 100%
          )
        `;
      default:
        return `
          linear-gradient(135deg, 
            rgba(0, 255, 255, 0.15) 0%,
            rgba(0, 160, 227, 0.1) 50%,
            rgba(120, 81, 169, 0.1) 100%
          )
        `;
    }
  }};
  
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    0 2px 8px rgba(0, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: translateY(-8px) scale(1.02);
    border-color: rgba(0, 255, 255, 0.3);
    animation: ${pulseGlow} 2s ease-in-out infinite;
  }

  @media (max-width: 768px) {
    padding: 1.5rem;
    border-radius: 16px;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    transition: left 0.5s;
  }

  &:hover::before {
    left: 100%;
  }
`;

const HeaderSection = styled(motion.div)`
  text-align: center;
  margin-bottom: 3rem;
  position: relative;
  z-index: 4;

  @media (max-width: 768px) {
    margin-bottom: 2rem;
  }
`;

const MainTitle = styled(motion.h1)`
  font-size: clamp(2.5rem, 5vw, 4rem);
  font-weight: 800;
  background: linear-gradient(
    135deg,
    #00ffff 0%,
    #ffffff 25%,
    #7851a9 50%,
    #ffd700 75%,
    #00ffff 100%
  );
  background-size: 300% 300%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
  position: relative;
  
  animation: ${shimmerEffect} 4s ease-in-out infinite;

  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 4px;
    background: linear-gradient(90deg, #00ffff, #7851a9, #ffd700);
    border-radius: 2px;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);

    @media (max-width: 768px) {
      width: 60px;
      height: 3px;
    }
  }
`;

const SubTitle = styled(motion.p)`
  font-size: clamp(1.1rem, 2.5vw, 1.3rem);
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
`;

const AchievementBadge = styled(motion.div)<{ tier: 'bronze' | 'silver' | 'gold' | 'diamond' }>`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin: 0 auto 1rem;
  
  background: ${props => {
    switch(props.tier) {
      case 'diamond':
        return 'linear-gradient(135deg, #b9f2ff 0%, #006064 100%)';
      case 'gold':
        return 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)';
      case 'silver':
        return 'linear-gradient(135deg, #e8e8e8 0%, #9e9e9e 100%)';
      default:
        return 'linear-gradient(135deg, #cd7f32 0%, #8b4513 100%)';
    }
  }};

  box-shadow: 
    0 8px 25px rgba(0, 0, 0, 0.3),
    0 3px 12px ${props => {
      switch(props.tier) {
        case 'diamond': return 'rgba(185, 242, 255, 0.4)';
        case 'gold': return 'rgba(255, 215, 0, 0.4)';
        case 'silver': return 'rgba(232, 232, 232, 0.4)';
        default: return 'rgba(205, 127, 50, 0.4)';
      }
    }},
    inset 0 1px 0 rgba(255, 255, 255, 0.3);

  &::before {
    content: '';
    position: absolute;
    top: -5px;
    left: -5px;
    right: -5px;
    bottom: -5px;
    border-radius: 50%;
    background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
    animation: ${keyframes`
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    `} 3s linear infinite;
  }

  @media (max-width: 768px) {
    width: 60px;
    height: 60px;
  }
`;

const StatCard = styled(motion.div)`
  background: rgba(0, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9, #ffd700);
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const StatNumber = styled(motion.div)`
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800;
  color: #00ffff;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

// ================================================================
// CHALLENGE COMPONENTS
// ================================================================

const ChallengeCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(138, 43, 226, 0.15) 0%, rgba(75, 0, 130, 0.1) 100%);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(138, 43, 226, 0.3);
  border-radius: 20px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #8a2be2, #4b0082, #00ffff);
  }

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const ProgressBarContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  height: 12px;
  margin: 1rem 0;
  overflow: hidden;
  position: relative;
`;

const ProgressBar = styled(motion.div)<{ progress: number }>`
  height: 100%;
  background: linear-gradient(90deg, #00ffff 0%, #7851a9 50%, #ffd700 100%);
  border-radius: 10px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.3) 50%,
      transparent 100%
    );
    animation: ${shimmerEffect} 2s ease-in-out infinite;
  }
`;

// ================================================================
// LEADERBOARD COMPONENTS
// ================================================================

const LeaderboardEntry = styled(motion.div)<{ rank: number }>`
  display: flex;
  align-items: center;
  padding: 1rem;
  margin-bottom: 1rem;
  background: ${props => {
    if (props.rank === 1) return 'linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 140, 0, 0.1) 100%)';
    if (props.rank === 2) return 'linear-gradient(135deg, rgba(192, 192, 192, 0.2) 0%, rgba(169, 169, 169, 0.1) 100%)';
    if (props.rank === 3) return 'linear-gradient(135deg, rgba(205, 127, 50, 0.2) 0%, rgba(139, 69, 19, 0.1) 100%)';
    return 'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(120, 81, 169, 0.05) 100%)';
  }};
  border: 1px solid ${props => {
    if (props.rank === 1) return 'rgba(255, 215, 0, 0.3)';
    if (props.rank === 2) return 'rgba(192, 192, 192, 0.3)';
    if (props.rank === 3) return 'rgba(205, 127, 50, 0.3)';
    return 'rgba(255, 255, 255, 0.1)';
  }};
  border-radius: 16px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateX(8px);
    border-color: rgba(0, 255, 255, 0.4);
  }
`;

const RankBadge = styled.div<{ rank: number }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  margin-right: 1rem;
  
  background: ${props => {
    if (props.rank === 1) return 'linear-gradient(135deg, #ffd700, #ff8f00)';
    if (props.rank === 2) return 'linear-gradient(135deg, #e8e8e8, #9e9e9e)';
    if (props.rank === 3) return 'linear-gradient(135deg, #cd7f32, #8b4513)';
    return 'linear-gradient(135deg, #00ffff, #7851a9)';
  }};
  
  color: ${props => props.rank <= 3 ? '#000' : '#fff'};
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    width: 32px;
    height: 32px;
    font-size: 0.8rem;
  }
`;

// ================================================================
// MAIN COMPONENT INTERFACE
// ================================================================

interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  progress: number;
  maxProgress: number;
  reward: string;
  expiresAt: Date;
  participants: number;
}

interface LeaderboardUser {
  id: string;
  username: string;
  avatar: string;
  points: number;
  rank: number;
  streak: number;
  level: number;
}

interface AdvancedGamificationHubProps {
  userId: string;
  className?: string;
}

// ================================================================
// MAIN COMPONENT
// ================================================================

const AdvancedGamificationHub: React.FC<AdvancedGamificationHubProps> = ({
  userId,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userStats, setUserStats] = useState({
    totalPoints: 0,
    currentStreak: 0,
    level: 1,
    totalWorkouts: 0,
    weeklyGoal: 5,
    completedThisWeek: 0
  });
  const [selectedTab, setSelectedTab] = useState<'achievements' | 'challenges' | 'leaderboard' | 'stats'>('achievements');
  const [showCelebration, setShowCelebration] = useState(false);

  // Animation controls
  const controls = useAnimation();

  // ================================================================
  // MOCK DATA GENERATION
  // ================================================================
  
  const generateMockAchievements = useCallback((): Achievement[] => [
    {
      id: 'first-workout',
      title: 'First Steps',
      description: 'Complete your first workout',
      tier: 'bronze',
      icon: <Star size={24} />,
      progress: 1,
      maxProgress: 1,
      unlocked: true,
      unlockedAt: new Date('2024-01-15')
    },
    {
      id: 'week-warrior',
      title: 'Week Warrior',
      description: 'Complete 7 workouts in a week',
      tier: 'silver',
      icon: <Trophy size={24} />,
      progress: 5,
      maxProgress: 7,
      unlocked: false
    },
    {
      id: 'streak-master',
      title: 'Streak Master',
      description: 'Maintain a 30-day workout streak',
      tier: 'gold',
      icon: <Fire size={24} />,
      progress: 12,
      maxProgress: 30,
      unlocked: false
    },
    {
      id: 'fitness-legend',
      title: 'Fitness Legend',
      description: 'Complete 100 total workouts',
      tier: 'diamond',
      icon: <Crown size={24} />,
      progress: 23,
      maxProgress: 100,
      unlocked: false
    }
  ], []);

  const generateMockChallenges = useCallback((): Challenge[] => [
    {
      id: 'daily-cardio',
      title: 'Cardio Crusher',
      description: 'Complete 30 minutes of cardio today',
      type: 'daily',
      progress: 15,
      maxProgress: 30,
      reward: '50 XP + Cardio Badge',
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
      participants: 247
    },
    {
      id: 'weekly-strength',
      title: 'Strength Builder',
      description: 'Complete 3 strength training sessions this week',
      type: 'weekly',
      progress: 1,
      maxProgress: 3,
      reward: '200 XP + Strength Champion Title',
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      participants: 89
    },
    {
      id: 'community-miles',
      title: 'Community Miles',
      description: 'Help the community reach 10,000 miles this month',
      type: 'monthly',
      progress: 3847,
      maxProgress: 10000,
      reward: 'Exclusive Community Badge + 500 XP',
      expiresAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // 18 days from now
      participants: 1542
    }
  ], []);

  const generateMockLeaderboard = useCallback((): LeaderboardUser[] => [
    {
      id: 'user1',
      username: 'FitnessGuru23',
      avatar: '/api/placeholder/40/40',
      points: 2847,
      rank: 1,
      streak: 24,
      level: 18
    },
    {
      id: 'user2', 
      username: 'SweatSuperstar',
      avatar: '/api/placeholder/40/40',
      points: 2691,
      rank: 2,
      streak: 18,
      level: 16
    },
    {
      id: 'user3',
      username: 'IronWillpower',
      avatar: '/api/placeholder/40/40',
      points: 2534,
      rank: 3,
      streak: 31,
      level: 15
    },
    {
      id: 'user4',
      username: 'CardioChampion',
      avatar: '/api/placeholder/40/40',
      points: 2401,
      rank: 4,
      streak: 12,
      level: 14
    },
    {
      id: 'user5',
      username: 'StrengthSeeker',
      avatar: '/api/placeholder/40/40',
      points: 2298,
      rank: 5,
      streak: 8,
      level: 13
    }
  ], []);

  // ================================================================
  // EFFECTS & INITIALIZATION
  // ================================================================
  
  useEffect(() => {
    // Initialize mock data
    setAchievements(generateMockAchievements());
    setChallenges(generateMockChallenges());
    setLeaderboard(generateMockLeaderboard());
    
    // Set user stats
    setUserStats({
      totalPoints: 1847,
      currentStreak: 7,
      level: 12,
      totalWorkouts: 23,
      weeklyGoal: 5,
      completedThisWeek: 3
    });

    // Start entrance animation
    controls.start('visible');
  }, [generateMockAchievements, generateMockChallenges, generateMockLeaderboard, controls]);

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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // ================================================================
  // FLOATING PARTICLES GENERATION
  // ================================================================
  
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8
    }));
  }, []);

  // ================================================================
  // EVENT HANDLERS
  // ================================================================
  
  const handleAchievementClick = useCallback((achievement: Achievement) => {
    if (achievement.unlocked) {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  }, []);

  const handleTabChange = useCallback((tab: typeof selectedTab) => {
    setSelectedTab(tab);
    controls.start('visible');
  }, [controls]);

  // ================================================================
  // RENDER HELPERS
  // ================================================================
  
  const renderAchievements = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.id}
            variants={itemVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleAchievementClick(achievement)}
            style={{ cursor: 'pointer' }}
          >
            <GamificationCard variant="achievement">
              <AchievementBadge
                tier={achievement.tier}
                animate={achievement.unlocked ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                {achievement.icon}
              </AchievementBadge>
              
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ 
                  color: '#fff', 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  marginBottom: '0.5rem' 
                }}>
                  {achievement.title}
                </h3>
                <p style={{ 
                  color: 'rgba(255, 255, 255, 0.7)', 
                  fontSize: '0.9rem',
                  marginBottom: '1rem' 
                }}>
                  {achievement.description}
                </p>
                
                <ProgressBarContainer>
                  <ProgressBar
                    progress={achievement.progress}
                    initial={{ width: 0 }}
                    animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                    transition={{ duration: 1, delay: index * 0.1 }}
                  />
                </ProgressBarContainer>
                
                <div style={{ 
                  color: '#00ffff', 
                  fontSize: '0.8rem',
                  fontWeight: '500' 
                }}>
                  {achievement.progress} / {achievement.maxProgress}
                  {achievement.unlocked && (
                    <span style={{ marginLeft: '0.5rem', color: '#ffd700' }}>
                      ✓ Unlocked
                    </span>
                  )}
                </div>
              </div>
            </GamificationCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderChallenges = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {challenges.map((challenge, index) => (
          <motion.div key={challenge.id} variants={itemVariants}>
            <ChallengeCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                    {challenge.title}
                  </h3>
                  <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>
                    {challenge.description}
                  </p>
                </div>
                <div style={{
                  background: challenge.type === 'daily' ? '#ff4444' : 
                             challenge.type === 'weekly' ? '#ff8800' : 
                             challenge.type === 'monthly' ? '#00ff88' : '#8844ff',
                  color: '#fff',
                  padding: '0.3rem 0.8rem',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  {challenge.type}
                </div>
              </div>
              
              <ProgressBarContainer>
                <ProgressBar
                  progress={challenge.progress}
                  initial={{ width: 0 }}
                  animate={{ width: `${(challenge.progress / challenge.maxProgress) * 100}%` }}
                  transition={{ duration: 1.5, delay: index * 0.2 }}
                />
              </ProgressBarContainer>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                <div>
                  <div style={{ color: '#00ffff', fontSize: '0.9rem', fontWeight: '500' }}>
                    {challenge.progress} / {challenge.maxProgress}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                    {challenge.participants} participants
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#ffd700', fontSize: '0.8rem', fontWeight: '500' }}>
                    {challenge.reward}
                  </div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.7rem' }}>
                    Expires {challenge.expiresAt.toLocaleDateString()}
                  </div>
                </div>
              </div>
            </ChallengeCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderLeaderboard = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {leaderboard.map((user, index) => (
          <motion.div key={user.id} variants={itemVariants}>
            <LeaderboardEntry rank={user.rank}>
              <RankBadge rank={user.rank}>
                {user.rank <= 3 ? (
                  user.rank === 1 ? <Crown size={20} /> :
                  user.rank === 2 ? <Medal size={20} /> :
                  <Award size={20} />
                ) : user.rank}
              </RankBadge>
              
              <div style={{ flex: 1 }}>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '1rem' }}>
                  {user.username}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                  Level {user.level} • {user.streak} day streak
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#00ffff', fontWeight: '700', fontSize: '1.2rem' }}>
                  {user.points.toLocaleString()}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
                  points
                </div>
              </div>
            </LeaderboardEntry>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const renderStats = () => (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '1.5rem' 
      }}>
        <motion.div variants={itemVariants}>
          <StatCard>
            <StatNumber
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
            >
              {userStats.totalPoints.toLocaleString()}
            </StatNumber>
            <StatLabel>Total Points</StatLabel>
          </StatCard>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <StatCard>
            <StatNumber>
              {userStats.currentStreak}
            </StatNumber>
            <StatLabel>Current Streak</StatLabel>
          </StatCard>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <StatCard>
            <StatNumber>
              {userStats.level}
            </StatNumber>
            <StatLabel>Current Level</StatLabel>
          </StatCard>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <StatCard>
            <StatNumber>
              {userStats.totalWorkouts}
            </StatNumber>
            <StatLabel>Total Workouts</StatLabel>
          </StatCard>
        </motion.div>
        
        <motion.div variants={itemVariants} style={{ gridColumn: 'span 2' }}>
          <GamificationCard>
            <h3 style={{ color: '#fff', marginBottom: '1rem', textAlign: 'center' }}>
              Weekly Progress
            </h3>
            <ProgressBarContainer>
              <ProgressBar
                progress={userStats.completedThisWeek}
                initial={{ width: 0 }}
                animate={{ width: `${(userStats.completedThisWeek / userStats.weeklyGoal) * 100}%` }}
                transition={{ duration: 2 }}
              />
            </ProgressBarContainer>
            <div style={{ textAlign: 'center', color: '#00ffff', marginTop: '0.5rem' }}>
              {userStats.completedThisWeek} / {userStats.weeklyGoal} workouts completed
            </div>
          </GamificationCard>
        </motion.div>
      </div>
    </motion.div>
  );

  // ================================================================
  // MAIN RENDER
  // ================================================================
  
  return (
    <GamificationContainer className={className}>
      {/* Floating Particles */}
      {particles.map((particle) => (
        <FloatingParticle
          key={particle.id}
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            animationDelay: `${particle.delay}s`
          }}
        />
      ))}

      {/* Header Section */}
      <HeaderSection>
        <MainTitle
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          🎮 Gamification Hub
        </MainTitle>
        <SubTitle
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          Transform your fitness journey into an epic adventure with achievements, 
          challenges, and social competitions that keep you motivated and engaged.
        </SubTitle>
      </HeaderSection>

      {/* Tab Navigation */}
      <motion.div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '3rem',
          gap: '1rem',
          flexWrap: 'wrap'
        }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {[
          { key: 'achievements', label: 'Achievements', icon: <Trophy size={20} /> },
          { key: 'challenges', label: 'Challenges', icon: <Target size={20} /> },
          { key: 'leaderboard', label: 'Leaderboard', icon: <Users size={20} /> },
          { key: 'stats', label: 'Statistics', icon: <TrendingUp size={20} /> }
        ].map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => handleTabChange(tab.key as typeof selectedTab)}
            style={{
              background: selectedTab === tab.key ? 
                'linear-gradient(135deg, #00ffff 0%, #7851a9 100%)' : 
                'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: `1px solid ${selectedTab === tab.key ? '#00ffff' : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '16px',
              padding: '0.8rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab.icon}
            {tab.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
        >
          {selectedTab === 'achievements' && renderAchievements()}
          {selectedTab === 'challenges' && renderChallenges()}
          {selectedTab === 'leaderboard' && renderLeaderboard()}
          {selectedTab === 'stats' && renderStats()}
        </motion.div>
      </AnimatePresence>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ff8f00 100%)',
                borderRadius: '50%',
                width: '200px',
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 50px rgba(255, 215, 0, 0.6)'
              }}
            >
              <Trophy size={80} color="#fff" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GamificationContainer>
  );
};

export default AdvancedGamificationHub;