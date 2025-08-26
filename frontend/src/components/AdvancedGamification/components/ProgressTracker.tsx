/**
 * 📈 PROGRESS TRACKER - VISUAL PROGRESS TRACKING WITH STATS
 * ========================================================= 
 * Comprehensive progress visualization with charts, milestones,
 * goal tracking, and achievement predictions
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

const progressFill = keyframes`
  from { width: 0%; }
  to { width: var(--target-width); }
`;

const milestoneUnlock = keyframes`
  0% { 
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% { 
    transform: scale(1.2);
    opacity: 1;
  }
  100% { 
    transform: scale(1);
    opacity: 1;
  }
`;

const chartAnimation = keyframes`
  0% { transform: scaleY(0); }
  100% { transform: scaleY(1); }
`;

const trendArrow = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-3px); }
`;

const achievementGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 255, 255, 0.6);
  }
`;

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface ProgressData {
  date: string;
  xp: number;
  workouts: number;
  achievements: number;
  challenges: number;
  streak: number;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: 'xp' | 'workouts' | 'achievements' | 'streak' | 'challenges';
  isCompleted: boolean;
  completedAt?: string;
  reward: {
    xp: number;
    badge?: string;
    title?: string;
  };
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  deadline: string;
  isActive: boolean;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface ProgressTrackerProps {
  timeframe?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  onSetGoal?: (goal: Partial<Goal>) => void;
  className?: string;
}

export type ProgressTimeframe = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type MetricType = 'xp' | 'workouts' | 'achievements' | 'streak' | 'challenges';

// ================================================================
// STYLED COMPONENTS
// ================================================================

const TrackerContainer = styled(motion.div)`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const TrackerHeader = styled(motion.div)`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled(motion.h2)`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, 
    #4CAF50 0%, 
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

const StatsOverview = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
`;

const StatCard = styled(motion.div)<{ trend: 'up' | 'down' | 'neutral' }>`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.1),
    rgba(120, 81, 169, 0.1)
  );
  border: 1px solid ${props => {
    switch (props.trend) {
      case 'up': return 'rgba(76, 175, 80, 0.4)';
      case 'down': return 'rgba(244, 67, 54, 0.4)';
      default: return 'rgba(0, 255, 255, 0.2)';
    }
  }};
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;

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
`;

const StatValue = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  font-size: 1.5rem;
  font-weight: 700;
  color: ${props => {
    switch (props.trend) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      default: return '#00FFFF';
    }
  }};
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const TrendArrow = styled.span<{ trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.8rem;
  animation: ${trendArrow} 1.5s ease-in-out infinite;
  
  ${props => props.trend !== 'neutral' && `
    color: ${props.trend === 'up' ? '#4CAF50' : '#F44336'};
  `}
`;

const StatLabel = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StatChange = styled.div<{ trend: 'up' | 'down' | 'neutral' }>`
  font-size: 0.7rem;
  color: ${props => {
    switch (props.trend) {
      case 'up': return '#4CAF50';
      case 'down': return '#F44336';
      default: return 'rgba(255, 255, 255, 0.5)';
    }
  }};
  margin-top: 0.25rem;
`;

const FilterSection = styled(motion.div)`
  margin-bottom: 2rem;
`;

const FilterLabel = styled.h4`
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ContentGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

const ChartSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ChartContainer = styled.div`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.05),
    rgba(120, 81, 169, 0.05)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const ChartTitle = styled.h3`
  color: #FFFFFF;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
`;

const Chart = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  height: 200px;
  gap: 4px;
  padding: 1rem 0;
`;

const ChartBar = styled(motion.div)<{ height: number; index: number }>`
  flex: 1;
  background: linear-gradient(to top, 
    #00FFFF 0%,
    #7851A9 50%,
    #4CAF50 100%
  );
  border-radius: 4px 4px 0 0;
  height: ${props => props.height}%;
  min-height: 2px;
  transform-origin: bottom;
  animation: ${chartAnimation} 1s ease-out ${props => props.index * 0.1}s both;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: -4px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    background: #00FFFF;
    border-radius: 50%;
    box-shadow: 0 0 6px rgba(0, 255, 255, 0.8);
  }
`;

const ChartLabels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
`;

const SidePanel = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MilestoneSection = styled.div`
  background: linear-gradient(135deg, 
    rgba(0, 255, 255, 0.05),
    rgba(120, 81, 169, 0.05)
  );
  border: 1px solid rgba(0, 255, 255, 0.2);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

const SectionTitle = styled.h3`
  color: #FFFFFF;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const MilestoneList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const MilestoneItem = styled(motion.div)<{ isCompleted: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 12px;
  background: ${props => props.isCompleted 
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(56, 142, 60, 0.05))'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(120, 81, 169, 0.05))'
  };
  border: 1px solid ${props => props.isCompleted 
    ? 'rgba(76, 175, 80, 0.3)' 
    : 'rgba(255, 255, 255, 0.1)'
  };
  
  ${props => props.isCompleted && `
    animation: ${milestoneUnlock} 0.6s ease-out;
  `}
`;

const MilestoneHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const MilestoneTitle = styled.div<{ isCompleted: boolean }>`
  font-weight: 600;
  color: ${props => props.isCompleted ? '#4CAF50' : '#FFFFFF'};
  flex: 1;
`;

const MilestoneStatus = styled.div<{ isCompleted: boolean }>`
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: ${props => props.isCompleted 
    ? 'linear-gradient(135deg, #4CAF50, #388E3C)'
    : 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(120, 81, 169, 0.1))'
  };
  color: white;
  font-weight: 600;
`;

const MilestoneProgress = styled.div`
  margin-bottom: 0.5rem;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
`;

const ProgressBarFill = styled(motion.div)<{ progress: number; isCompleted: boolean }>`
  height: 100%;
  border-radius: 3px;
  background: ${props => props.isCompleted
    ? 'linear-gradient(90deg, #4CAF50, #66BB6A)'
    : 'linear-gradient(90deg, #00FFFF, #7851A9)'
  };
  width: ${props => Math.min(props.progress, 100)}%;
  transition: width 1s ease;
`;

const ProgressText = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  display: flex;
  justify-content: space-between;
`;

const GoalSection = styled(MilestoneSection)``;

const GoalList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const GoalItem = styled(motion.div)<{ priority: 'low' | 'medium' | 'high'; isCompleted: boolean }>`
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 12px;
  background: ${props => {
    if (props.isCompleted) return 'linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(56, 142, 60, 0.05))';
    switch (props.priority) {
      case 'high': return 'linear-gradient(135deg, rgba(244, 67, 54, 0.1), rgba(198, 40, 40, 0.05))';
      case 'medium': return 'linear-gradient(135deg, rgba(255, 152, 0, 0.1), rgba(230, 81, 0, 0.05))';
      default: return 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(120, 81, 169, 0.05))';
    }
  }};
  border: 1px solid ${props => {
    if (props.isCompleted) return 'rgba(76, 175, 80, 0.3)';
    switch (props.priority) {
      case 'high': return 'rgba(244, 67, 54, 0.3)';
      case 'medium': return 'rgba(255, 152, 0, 0.3)';
      default: return 'rgba(255, 255, 255, 0.1)';
    }
  }};
`;

const GoalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
`;

const GoalTitle = styled.div<{ isCompleted: boolean }>`
  font-weight: 600;
  color: ${props => props.isCompleted ? '#4CAF50' : '#FFFFFF'};
  flex: 1;
`;

const GoalPriority = styled.div<{ priority: 'low' | 'medium' | 'high' }>`
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
  background: ${props => {
    switch (props.priority) {
      case 'high': return 'linear-gradient(135deg, #F44336, #C62828)';
      case 'medium': return 'linear-gradient(135deg, #FF9800, #E65100)';
      default: return 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(120, 81, 169, 0.2))';
    }
  }};
  color: white;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const GoalDeadline = styled.div`
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
`;

const AddGoalButton = styled(AnimatedButton)`
  margin-top: 1rem;
`;

// ================================================================
// MAIN COMPONENT
// ================================================================

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  timeframe = 'monthly',
  onSetGoal,
  className
}) => {
  // ================================================================
  // STATE MANAGEMENT
  // ================================================================

  const [activeTimeframe, setActiveTimeframe] = useState<ProgressTimeframe>(timeframe);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentStats, setCurrentStats] = useState({
    totalXP: 8947,
    weeklyXP: 1247,
    totalWorkouts: 89,
    currentStreak: 7,
    totalAchievements: 28,
    completedChallenges: 15
  });

  // ================================================================
  // TAB OPTIONS
  // ================================================================

  const timeframeOptions = [
    { id: 'weekly', label: 'Weekly', icon: '📅' },
    { id: 'monthly', label: 'Monthly', icon: '🗓️' },
    { id: 'quarterly', label: 'Quarterly', icon: '📊' },
    { id: 'yearly', label: 'Yearly', icon: '🎯' }
  ];

  // ================================================================
  // COMPUTED VALUES
  // ================================================================

  const getStatTrend = (current: number, previous: number): 'up' | 'down' | 'neutral' => {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'neutral';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '➖';
    }
  };

  const getChangeText = (current: number, previous: number, trend: 'up' | 'down' | 'neutral') => {
    const change = Math.abs(current - previous);
    const percentage = previous > 0 ? Math.round((change / previous) * 100) : 0;
    return trend !== 'neutral' ? `${percentage}% ${trend === 'up' ? 'increase' : 'decrease'}` : 'No change';
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

  // ================================================================
  // MOCK DATA GENERATION
  // ================================================================

  useEffect(() => {
    // Generate mock progress data
    const days = activeTimeframe === 'weekly' ? 7 : activeTimeframe === 'monthly' ? 30 : 90;
    const mockData: ProgressData[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      
      mockData.push({
        date: date.toISOString().split('T')[0],
        xp: Math.floor(Math.random() * 200) + 50,
        workouts: Math.floor(Math.random() * 3),
        achievements: Math.floor(Math.random() * 2),
        challenges: Math.floor(Math.random() * 2),
        streak: Math.min(i + 1, 30)
      });
    }
    
    setProgressData(mockData);

    // Mock milestones
    setMilestones([
      {
        id: '1',
        title: 'XP Master',
        description: 'Earn 10,000 total XP',
        targetValue: 10000,
        currentValue: 8947,
        unit: 'XP',
        category: 'xp',
        isCompleted: false,
        reward: { xp: 500, badge: '🎯' }
      },
      {
        id: '2',
        title: 'Workout Warrior',
        description: 'Complete 100 workouts',
        targetValue: 100,
        currentValue: 89,
        unit: 'workouts',
        category: 'workouts',
        isCompleted: false,
        reward: { xp: 1000, badge: '💪' }
      },
      {
        id: '3',
        title: 'Achievement Hunter',
        description: 'Unlock 50 achievements',
        targetValue: 50,
        currentValue: 28,
        unit: 'achievements',
        category: 'achievements',
        isCompleted: false,
        reward: { xp: 750, badge: '🏆' }
      }
    ]);

    // Mock goals
    setGoals([
      {
        id: '1',
        title: 'Weekly XP Target',
        description: 'Earn 1,500 XP this week',
        targetValue: 1500,
        currentValue: 1247,
        unit: 'XP',
        category: 'weekly',
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        isCompleted: false,
        priority: 'high'
      },
      {
        id: '2',
        title: 'Monthly Workout Goal',
        description: 'Complete 20 workouts this month',
        targetValue: 20,
        currentValue: 12,
        unit: 'workouts',
        category: 'monthly',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        isCompleted: false,
        priority: 'medium'
      }
    ]);
  }, [activeTimeframe]);

  // ================================================================
  // EVENT HANDLERS
  // ================================================================

  const handleAddGoal = () => {
    // TODO: Open goal creation modal
    onSetGoal?.({
      title: 'New Goal',
      description: 'Custom goal description',
      targetValue: 100,
      currentValue: 0,
      unit: 'units',
      category: 'custom',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      isCompleted: false,
      priority: 'medium'
    });
  };

  const maxValue = Math.max(...progressData.map(d => d.xp));

  // ================================================================
  // MAIN RENDER
  // ================================================================

  return (
    <TrackerContainer
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <TrackerHeader variants={itemVariants}>
        <Title>📈 Progress Tracker</Title>
      </TrackerHeader>

      <StatsOverview variants={itemVariants}>
        <StatCard trend="up">
          <StatValue trend="up">
            {currentStats.totalXP.toLocaleString()}
            <TrendArrow trend="up">{getTrendIcon('up')}</TrendArrow>
          </StatValue>
          <StatLabel>Total XP</StatLabel>
          <StatChange trend="up">12% increase</StatChange>
        </StatCard>

        <StatCard trend="up">
          <StatValue trend="up">
            {currentStats.totalWorkouts}
            <TrendArrow trend="up">{getTrendIcon('up')}</TrendArrow>
          </StatValue>
          <StatLabel>Total Workouts</StatLabel>
          <StatChange trend="up">8% increase</StatChange>
        </StatCard>

        <StatCard trend="neutral">
          <StatValue trend="neutral">
            {currentStats.currentStreak}
            <TrendArrow trend="neutral">{getTrendIcon('neutral')}</TrendArrow>
          </StatValue>
          <StatLabel>Current Streak</StatLabel>
          <StatChange trend="neutral">Maintaining</StatChange>
        </StatCard>

        <StatCard trend="up">
          <StatValue trend="up">
            {currentStats.totalAchievements}
            <TrendArrow trend="up">{getTrendIcon('up')}</TrendArrow>
          </StatValue>
          <StatLabel>Achievements</StatLabel>
          <StatChange trend="up">15% increase</StatChange>
        </StatCard>
      </StatsOverview>

      <FilterSection variants={itemVariants}>
        <FilterLabel>Timeframe</FilterLabel>
        <TabNavigation
          options={timeframeOptions}
          activeTab={activeTimeframe}
          onTabChange={(tab) => setActiveTimeframe(tab as ProgressTimeframe)}
          variant="cosmic"
          orientation="horizontal"
        />
      </FilterSection>

      <ContentGrid variants={itemVariants}>
        <ChartSection>
          <ChartContainer>
            <ChartTitle>XP Progress - {activeTimeframe.charAt(0).toUpperCase() + activeTimeframe.slice(1)}</ChartTitle>
            <Chart>
              {progressData.map((data, index) => (
                <ChartBar
                  key={data.date}
                  height={(data.xp / maxValue) * 100}
                  index={index}
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: '#4CAF50'
                  }}
                />
              ))}
            </Chart>
            <ChartLabels>
              {progressData.filter((_, i) => i % Math.ceil(progressData.length / 7) === 0).map(data => (
                <span key={data.date}>
                  {new Date(data.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              ))}
            </ChartLabels>
          </ChartContainer>
        </ChartSection>

        <SidePanel>
          <MilestoneSection>
            <SectionTitle>🎯 Milestones</SectionTitle>
            <MilestoneList>
              {milestones.map((milestone) => {
                const progressPercentage = (milestone.currentValue / milestone.targetValue) * 100;
                
                return (
                  <MilestoneItem
                    key={milestone.id}
                    isCompleted={milestone.isCompleted}
                    variants={itemVariants}
                  >
                    <MilestoneHeader>
                      <MilestoneTitle isCompleted={milestone.isCompleted}>
                        {milestone.title}
                      </MilestoneTitle>
                      <MilestoneStatus isCompleted={milestone.isCompleted}>
                        {milestone.isCompleted ? 'Completed' : 'In Progress'}
                      </MilestoneStatus>
                    </MilestoneHeader>
                    
                    <MilestoneProgress>
                      <ProgressBarContainer>
                        <ProgressBarFill 
                          progress={progressPercentage}
                          isCompleted={milestone.isCompleted}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                        />
                      </ProgressBarContainer>
                      <ProgressText>
                        <span>{milestone.currentValue} / {milestone.targetValue} {milestone.unit}</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </ProgressText>
                    </MilestoneProgress>
                  </MilestoneItem>
                );
              })}
            </MilestoneList>
          </MilestoneSection>

          <GoalSection>
            <SectionTitle>🚀 Goals</SectionTitle>
            <GoalList>
              {goals.map((goal) => {
                const progressPercentage = (goal.currentValue / goal.targetValue) * 100;
                const daysRemaining = Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                
                return (
                  <GoalItem
                    key={goal.id}
                    priority={goal.priority}
                    isCompleted={goal.isCompleted}
                    variants={itemVariants}
                  >
                    <GoalHeader>
                      <GoalTitle isCompleted={goal.isCompleted}>
                        {goal.title}
                      </GoalTitle>
                      <GoalPriority priority={goal.priority}>
                        {goal.priority}
                      </GoalPriority>
                    </GoalHeader>
                    
                    <MilestoneProgress>
                      <ProgressBarContainer>
                        <ProgressBarFill 
                          progress={progressPercentage}
                          isCompleted={goal.isCompleted}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPercentage}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                        />
                      </ProgressBarContainer>
                      <ProgressText>
                        <span>{goal.currentValue} / {goal.targetValue} {goal.unit}</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </ProgressText>
                    </MilestoneProgress>

                    <GoalDeadline>
                      ⏰ {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Deadline passed'}
                    </GoalDeadline>
                  </GoalItem>
                );
              })}
            </GoalList>
            <AddGoalButton
              variant="primary"
              size="small"
              onClick={handleAddGoal}
              fullWidth
            >
              + Add New Goal
            </AddGoalButton>
          </GoalSection>
        </SidePanel>
      </ContentGrid>
    </TrackerContainer>
  );
};

export default ProgressTracker;
