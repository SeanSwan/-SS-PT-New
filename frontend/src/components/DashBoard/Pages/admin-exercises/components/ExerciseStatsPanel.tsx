/**
 * ExerciseStatsPanel.tsx
 * ======================
 * 
 * Real-time exercise statistics and analytics panel
 * Ultra-mobile responsive with beautiful data visualizations
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time exercise performance metrics
 * - User engagement analytics
 * - Trending exercise identification
 * - Activity feed with priority sorting
 * - Mobile-optimized data visualization
 * - Accessibility-first design (WCAG AA compliant)
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styled from 'styled-components';
import { 
  TrendingUp, TrendingDown, Minus, Eye, Play, Users, 
  Star, Activity, Clock, BarChart3, PieChart, 
  Download, RefreshCw, Filter, ArrowUpRight, 
  ArrowDownRight, Award, Flame, Zap, Target,
  Calendar, ThumbsUp, MessageSquare, Share2
} from 'lucide-react';

import { exerciseCommandTheme, mediaQueries } from '../styles/exerciseCommandTheme';
import { 
  motionVariants,
  cardHover,
  progressBarFill,
  streakFlame,
  accessibleAnimation,
  animationPerformance
} from '../styles/gamificationAnimations';

// === STYLED COMPONENTS ===

const StatsContainer = styled(motion.div)`
  background: ${exerciseCommandTheme.gradients.exerciseCard};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: ${exerciseCommandTheme.borderRadius.xl};
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${exerciseCommandTheme.gradients.commandCenter};
    opacity: 0.8;
  }
  
  ${animationPerformance}
  ${accessibleAnimation}
`;

const StatsHeader = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const HeaderTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
    align-items: flex-start;
  }
`;

const StatsTitle = styled.h3`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.md};
  
  .title-icon {
    color: ${exerciseCommandTheme.colors.stellarBlue};
  }
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    width: 100%;
    justify-content: flex-end;
  }
`;

const ActionButton = styled(motion.button)`
  width: 36px;
  height: 36px;
  border-radius: ${exerciseCommandTheme.borderRadius.md};
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: ${exerciseCommandTheme.colors.stellarBlue};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  ${mediaQueries.mobile} {
    width: 32px;
    height: 32px;
  }
`;

const QuickStats = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    grid-template-columns: repeat(2, 1fr);
    gap: ${exerciseCommandTheme.spacing.xs};
  }
`;

const QuickStatItem = styled(motion.div)`
  text-align: center;
  padding: ${exerciseCommandTheme.spacing.sm};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.xs};
  }
`;

const StatValue = styled.div<{ trend?: 'up' | 'down' | 'stable' }>`
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${props => {
    switch (props.trend) {
      case 'up': return exerciseCommandTheme.colors.exerciseGreen;
      case 'down': return exerciseCommandTheme.colors.criticalRed;
      default: return exerciseCommandTheme.colors.primaryText;
    }
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  }
`;

const StatLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-top: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: 0.625rem;
  }
`;

const StatsContent = styled.div`
  padding: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.lg};
  }
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  margin-bottom: ${exerciseCommandTheme.spacing.xl};
  
  ${mediaQueries.mobile} {
    margin-bottom: ${exerciseCommandTheme.spacing.lg};
  }
`;

const Tab = styled(motion.button)<{ isActive: boolean }>`
  flex: 1;
  padding: ${exerciseCommandTheme.spacing.md} ${exerciseCommandTheme.spacing.lg};
  border: none;
  background: none;
  color: ${props => 
    props.isActive 
      ? exerciseCommandTheme.colors.stellarBlue 
      : exerciseCommandTheme.colors.secondaryText
  };
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  cursor: pointer;
  position: relative;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    color: ${exerciseCommandTheme.colors.primaryText};
  }
  
  ${props => props.isActive && `
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: ${exerciseCommandTheme.gradients.commandCenter};
    }
  `}
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.sm} ${exerciseCommandTheme.spacing.md};
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const TabContent = styled(motion.div)`
  min-height: 300px;
  
  ${mediaQueries.mobile} {
    min-height: 250px;
  }
`;

// Top Exercises List
const ExerciseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${exerciseCommandTheme.spacing.md};
`;

const ExerciseCard = styled(motion.div)`
  background: rgba(30, 58, 138, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  padding: ${exerciseCommandTheme.spacing.lg};
  cursor: pointer;
  transition: all ${exerciseCommandTheme.transitions.base};
  
  &:hover {
    background: rgba(30, 58, 138, 0.1);
    border-color: rgba(59, 130, 246, 0.3);
    transform: translateY(-2px);
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
  }
`;

const ExerciseCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${exerciseCommandTheme.spacing.md};
  
  ${mediaQueries.mobile} {
    flex-direction: column;
    gap: ${exerciseCommandTheme.spacing.sm};
    align-items: flex-start;
  }
`;

const ExerciseName = styled.h4`
  font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  }
`;

const TrendBadge = styled.div<{ trend: 'up' | 'down' | 'stable' }>`
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
  padding: ${exerciseCommandTheme.spacing.xs} ${exerciseCommandTheme.spacing.sm};
  border-radius: ${exerciseCommandTheme.borderRadius.badge};
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  
  background: ${props => {
    switch (props.trend) {
      case 'up': return 'rgba(16, 185, 129, 0.1)';
      case 'down': return 'rgba(239, 68, 68, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
  
  color: ${props => {
    switch (props.trend) {
      case 'up': return exerciseCommandTheme.colors.exerciseGreen;
      case 'down': return exerciseCommandTheme.colors.criticalRed;
      default: return exerciseCommandTheme.colors.secondaryText;
    }
  }};
  
  border: 1px solid ${props => {
    switch (props.trend) {
      case 'up': return 'rgba(16, 185, 129, 0.3)';
      case 'down': return 'rgba(239, 68, 68, 0.3)';
      default: return 'rgba(107, 114, 128, 0.3)';
    }
  }};
`;

const ExerciseMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${exerciseCommandTheme.spacing.lg};
  
  ${mediaQueries.mobile} {
    grid-template-columns: 1fr;
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const MetricItem = styled.div`
  text-align: center;
`;

const MetricValue = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.bold};
  color: ${exerciseCommandTheme.colors.primaryText};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  }
`;

const MetricLabel = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
  margin-top: ${exerciseCommandTheme.spacing.xs};
`;

// Activity Feed
const ActivityFeed = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${exerciseCommandTheme.spacing.md};
  max-height: 400px;
  overflow-y: auto;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(30, 58, 138, 0.1);
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${exerciseCommandTheme.gradients.commandCenter};
    border-radius: 2px;
  }
  
  ${mediaQueries.mobile} {
    max-height: 300px;
  }
`;

const ActivityItem = styled(motion.div)<{ priority: 'high' | 'medium' | 'low' }>`
  display: flex;
  align-items: flex-start;
  gap: ${exerciseCommandTheme.spacing.md};
  padding: ${exerciseCommandTheme.spacing.lg};
  background: rgba(30, 58, 138, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: ${exerciseCommandTheme.borderRadius.lg};
  transition: all ${exerciseCommandTheme.transitions.base};
  
  /* Priority indicator */
  border-left: 4px solid ${props => {
    switch (props.priority) {
      case 'high': return exerciseCommandTheme.colors.criticalRed;
      case 'medium': return exerciseCommandTheme.colors.warningAmber;
      default: return exerciseCommandTheme.colors.stellarBlue;
    }
  }};
  
  &:hover {
    background: rgba(30, 58, 138, 0.1);
    transform: translateX(4px);
  }
  
  ${mediaQueries.mobile} {
    padding: ${exerciseCommandTheme.spacing.md};
    gap: ${exerciseCommandTheme.spacing.sm};
  }
`;

const ActivityIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${exerciseCommandTheme.borderRadius.full};
  background: ${exerciseCommandTheme.gradients.buttonPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${exerciseCommandTheme.typography.fontSizes.lg};
  flex-shrink: 0;
  
  ${mediaQueries.mobile} {
    width: 32px;
    height: 32px;
    font-size: ${exerciseCommandTheme.typography.fontSizes.base};
  }
`;

const ActivityContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ActivityTitle = styled.h5`
  font-size: ${exerciseCommandTheme.typography.fontSizes.sm};
  font-weight: ${exerciseCommandTheme.typography.fontWeights.semibold};
  color: ${exerciseCommandTheme.colors.primaryText};
  margin-bottom: ${exerciseCommandTheme.spacing.xs};
  
  ${mediaQueries.mobile} {
    font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  }
`;

const ActivityDescription = styled.p`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.secondaryText};
  line-height: ${exerciseCommandTheme.typography.lineHeights.normal};
  margin-bottom: ${exerciseCommandTheme.spacing.xs};
`;

const ActivityTime = styled.div`
  font-size: ${exerciseCommandTheme.typography.fontSizes.xs};
  color: ${exerciseCommandTheme.colors.tertiaryText};
  display: flex;
  align-items: center;
  gap: ${exerciseCommandTheme.spacing.xs};
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing['2xl']};
  color: ${exerciseCommandTheme.colors.secondaryText};
  
  .loading-icon {
    animation: ${streakFlame} 2s ease-in-out infinite;
    margin-bottom: ${exerciseCommandTheme.spacing.md};
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${exerciseCommandTheme.spacing['2xl']};
  color: ${exerciseCommandTheme.colors.secondaryText};
  text-align: center;
  
  .empty-icon {
    margin-bottom: ${exerciseCommandTheme.spacing.md};
    opacity: 0.5;
  }
`;

// === INTERFACES ===

interface ExerciseStats {
  totalExercises: number;
  totalVideos: number;
  activeUsers: number;
  avgQualityScore: number;
  totalViews: number;
  totalCompletions: number;
  engagementRate: number;
  popularityTrend: 'up' | 'down' | 'stable';
}

interface ExerciseUsage {
  exerciseId: string;
  exerciseName: string;
  views: number;
  completions: number;
  avgRating: number;
  lastUsed: string;
  trend: 'up' | 'down' | 'stable';
  completionRate: number;
}

interface ActivityItem {
  id: string;
  type: 'exercise_created' | 'video_uploaded' | 'user_completed' | 'achievement_earned' | 'milestone_reached';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
  icon: string;
  priority: 'low' | 'medium' | 'high';
}

interface ExerciseStatsPanelProps {
  stats: ExerciseStats | null;
  recentActivity: ActivityItem[];
  isLoading: boolean;
  className?: string;
}

// === UTILITY FUNCTIONS ===

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up': return <ArrowUpRight size={12} />;
    case 'down': return <ArrowDownRight size={12} />;
    default: return <Minus size={12} />;
  }
};

const getActivityIcon = (type: string): React.ReactNode => {
  switch (type) {
    case 'exercise_created': return '🏃‍♂️';
    case 'video_uploaded': return '🎬';
    case 'user_completed': return '⭐';
    case 'achievement_earned': return '🏆';
    case 'milestone_reached': return '🎯';
    default: return '📝';
  }
};

// === MAIN COMPONENT ===

const ExerciseStatsPanel: React.FC<ExerciseStatsPanelProps> = ({
  stats,
  recentActivity,
  isLoading,
  className
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'top' | 'activity'>('overview');
  
  // Mock top exercises data (replace with real data from props)
  const topExercises: ExerciseUsage[] = useMemo(() => [
    {
      exerciseId: 'ex_001',
      exerciseName: 'Push-up Progression',
      views: 1247,
      completions: 892,
      avgRating: 4.8,
      lastUsed: '2025-02-01T14:30:00Z',
      trend: 'up',
      completionRate: 71.5
    },
    {
      exerciseId: 'ex_002',
      exerciseName: 'Deadlift Form Check',
      views: 1089,
      completions: 743,
      avgRating: 4.9,
      lastUsed: '2025-02-01T13:45:00Z',
      trend: 'up',
      completionRate: 68.2
    },
    {
      exerciseId: 'ex_003',
      exerciseName: 'Core Stability Sequence',
      views: 987,
      completions: 654,
      avgRating: 4.7,
      lastUsed: '2025-02-01T12:15:00Z',
      trend: 'stable',
      completionRate: 66.3
    }
  ], []);
  
  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    console.log('Exporting stats...');
  }, []);
  
  const handleRefresh = useCallback(() => {
    // TODO: Implement refresh functionality
    console.log('Refreshing stats...');
  }, []);
  
  const renderTabContent = useCallback(() => {
    switch (activeTab) {
      case 'overview':
        return (
          <TabContent
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {stats && (
              <div>
                <h4 style={{ marginBottom: exerciseCommandTheme.spacing.lg, color: exerciseCommandTheme.colors.primaryText }}>
                  Performance Overview
                </h4>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: exerciseCommandTheme.spacing.lg,
                  marginBottom: exerciseCommandTheme.spacing.xl
                }}>
                  <div style={{ 
                    background: 'rgba(16, 185, 129, 0.1)', 
                    padding: exerciseCommandTheme.spacing.lg, 
                    borderRadius: exerciseCommandTheme.borderRadius.lg,
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.xl, 
                      fontWeight: exerciseCommandTheme.typography.fontWeights.bold,
                      color: exerciseCommandTheme.colors.exerciseGreen
                    }}>
                      {formatNumber(stats.totalViews)}
                    </div>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.sm,
                      color: exerciseCommandTheme.colors.secondaryText,
                      marginTop: exerciseCommandTheme.spacing.xs
                    }}>
                      Total Views
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(59, 130, 246, 0.1)', 
                    padding: exerciseCommandTheme.spacing.lg, 
                    borderRadius: exerciseCommandTheme.borderRadius.lg,
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.xl, 
                      fontWeight: exerciseCommandTheme.typography.fontWeights.bold,
                      color: exerciseCommandTheme.colors.stellarBlue
                    }}>
                      {formatNumber(stats.totalCompletions)}
                    </div>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.sm,
                      color: exerciseCommandTheme.colors.secondaryText,
                      marginTop: exerciseCommandTheme.spacing.xs
                    }}>
                      Total Completions
                    </div>
                  </div>
                  
                  <div style={{ 
                    background: 'rgba(251, 191, 36, 0.1)', 
                    padding: exerciseCommandTheme.spacing.lg, 
                    borderRadius: exerciseCommandTheme.borderRadius.lg,
                    border: '1px solid rgba(251, 191, 36, 0.2)'
                  }}>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.xl, 
                      fontWeight: exerciseCommandTheme.typography.fontWeights.bold,
                      color: exerciseCommandTheme.colors.warningAmber
                    }}>
                      {stats.engagementRate.toFixed(1)}%
                    </div>
                    <div style={{ 
                      fontSize: exerciseCommandTheme.typography.fontSizes.sm,
                      color: exerciseCommandTheme.colors.secondaryText,
                      marginTop: exerciseCommandTheme.spacing.xs
                    }}>
                      Engagement Rate
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabContent>
        );
        
      case 'top':
        return (
          <TabContent
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 style={{ marginBottom: exerciseCommandTheme.spacing.lg, color: exerciseCommandTheme.colors.primaryText }}>
              Top Performing Exercises
            </h4>
            
            <ExerciseList>
              {topExercises.map((exercise, index) => (
                <ExerciseCard
                  key={exercise.exerciseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ y: -2 }}
                >
                  <ExerciseCardHeader>
                    <ExerciseName>{exercise.exerciseName}</ExerciseName>
                    <TrendBadge trend={exercise.trend}>
                      {getTrendIcon(exercise.trend)}
                      {exercise.trend.toUpperCase()}
                    </TrendBadge>
                  </ExerciseCardHeader>
                  
                  <ExerciseMetrics>
                    <MetricItem>
                      <MetricValue>{formatNumber(exercise.views)}</MetricValue>
                      <MetricLabel>Views</MetricLabel>
                    </MetricItem>
                    
                    <MetricItem>
                      <MetricValue>{formatNumber(exercise.completions)}</MetricValue>
                      <MetricLabel>Completions</MetricLabel>
                    </MetricItem>
                    
                    <MetricItem>
                      <MetricValue>{exercise.completionRate.toFixed(1)}%</MetricValue>
                      <MetricLabel>Completion Rate</MetricLabel>
                    </MetricItem>
                  </ExerciseMetrics>
                </ExerciseCard>
              ))}
            </ExerciseList>
          </TabContent>
        );
        
      case 'activity':
        return (
          <TabContent
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h4 style={{ marginBottom: exerciseCommandTheme.spacing.lg, color: exerciseCommandTheme.colors.primaryText }}>
              Recent Activity
            </h4>
            
            <ActivityFeed>
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <ActivityItem
                    key={activity.id}
                    priority={activity.priority}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <ActivityIcon>
                      {getActivityIcon(activity.type)}
                    </ActivityIcon>
                    
                    <ActivityContent>
                      <ActivityTitle>{activity.title}</ActivityTitle>
                      <ActivityDescription>{activity.description}</ActivityDescription>
                      <ActivityTime>
                        <Clock size={12} />
                        {formatRelativeTime(activity.timestamp)}
                      </ActivityTime>
                    </ActivityContent>
                  </ActivityItem>
                ))
              ) : (
                <EmptyState>
                  <Activity size={48} className="empty-icon" />
                  <div>No recent activity</div>
                </EmptyState>
              )}
            </ActivityFeed>
          </TabContent>
        );
        
      default:
        return null;
    }
  }, [activeTab, stats, topExercises, recentActivity]);
  
  if (isLoading) {
    return (
      <StatsContainer className={className}>
        <LoadingState>
          <Zap size={48} className="loading-icon" />
          <div>Loading exercise statistics...</div>
        </LoadingState>
      </StatsContainer>
    );
  }
  
  return (
    <StatsContainer
      className={className}
      initial="hidden"
      animate="visible"
      variants={motionVariants.cardEnter}
    >
      <StatsHeader>
        <HeaderTop>
          <StatsTitle>
            <BarChart3 size={20} className="title-icon" />
            Exercise Analytics
          </StatsTitle>
          
          <HeaderActions>
            <ActionButton
              onClick={handleRefresh}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Refresh data"
            >
              <RefreshCw size={16} />
            </ActionButton>
            
            <ActionButton
              onClick={handleExport}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title="Export data"
            >
              <Download size={16} />
            </ActionButton>
          </HeaderActions>
        </HeaderTop>
        
        {stats && (
          <QuickStats>
            <QuickStatItem>
              <StatValue>{formatNumber(stats.totalExercises)}</StatValue>
              <StatLabel>Exercises</StatLabel>
            </QuickStatItem>
            
            <QuickStatItem>
              <StatValue>{formatNumber(stats.totalVideos)}</StatValue>
              <StatLabel>Videos</StatLabel>
            </QuickStatItem>
            
            <QuickStatItem>
              <StatValue trend={stats.popularityTrend}>
                {formatNumber(stats.activeUsers)}
                {getTrendIcon(stats.popularityTrend)}
              </StatValue>
              <StatLabel>Active Users</StatLabel>
            </QuickStatItem>
            
            <QuickStatItem>
              <StatValue>{stats.avgQualityScore.toFixed(1)}%</StatValue>
              <StatLabel>Quality Score</StatLabel>
            </QuickStatItem>
          </QuickStats>
        )}
      </StatsHeader>
      
      <StatsContent>
        <TabContainer>
          <Tab
            isActive={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </Tab>
          <Tab
            isActive={activeTab === 'top'}
            onClick={() => setActiveTab('top')}
          >
            Top Exercises
          </Tab>
          <Tab
            isActive={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
          >
            Activity Feed
          </Tab>
        </TabContainer>
        
        <AnimatePresence mode="wait">
          {renderTabContent()}
        </AnimatePresence>
      </StatsContent>
    </StatsContainer>
  );
};

export default ExerciseStatsPanel;
