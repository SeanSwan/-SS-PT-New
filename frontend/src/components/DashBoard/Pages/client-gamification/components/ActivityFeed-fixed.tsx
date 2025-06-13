import React, { useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Award,
  Gift,
  Star,
  Calendar,
  Clock,
  Zap,
  CheckCircle,
  TrendingUp,
  Activity,
  Dumbbell
} from 'lucide-react';

import { useGamificationData, PointTransaction } from '../../../../../hooks/gamification/useGamificationData';

// Animation definitions
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

// Styled Components
const Container = styled.div`
  background: ${({ theme }) => theme.colors.background.paper};
  border-radius: 12px;
  padding: ${props => props.className?.includes('compact') ? '1rem' : '1.5rem'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Title = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.colors.text.primary};
`;

const FilterChips = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const FilterChip = styled.button<{ active?: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  border: none;
  background: ${props => props.active ? props.theme.colors.primary.main : props.theme.colors.background.default};
  color: ${props => props.active ? 'white' : props.theme.colors.text.secondary};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? props.theme.colors.primary.dark : props.theme.colors.background.hover};
    color: ${props => props.active ? 'white' : props.theme.colors.text.primary};
  }
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`;

const ActivityItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const IconContainer = styled.div`
  min-width: 42px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
`;

const IconWrapper = styled.div`
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ActivityContent = styled.div`
  flex: 1;
  margin-left: 0.5rem;
`;

const ActivityDescription = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const ActivityTime = styled.div`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PointsSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 1rem;
`;

const PointsValue = styled.div<{ type: 'earn' | 'spend' | 'bonus' | 'adjustment' | 'expire' }>`
  font-size: 0.875rem;
  font-weight: bold;
  color: ${props => {
    if (props.type === 'earn' || props.type === 'bonus') return props.theme.colors.success.main;
    if (props.type === 'spend' || props.type === 'expire') return props.theme.colors.error.main;
    return props.theme.colors.text.primary;
  }};
`;

const BalanceInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
`;

const BalanceValue = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SkeletonItem = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SkeletonIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  margin-right: 1rem;
`;

const SkeletonText = styled.div<{ width?: string }>`
  height: 16px;
  width: ${props => props.width || '60%'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: 4px;
  margin-bottom: 0.5rem;
`;

const SkeletonRect = styled.div<{ width?: string; height?: string }>`
  height: ${props => props.height || '16px'};
  width: ${props => props.width || '60px'};
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  border-radius: 4px;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
`;

const ErrorText = styled.p`
  color: ${({ theme }) => theme.colors.error.main};
  margin-bottom: 1rem;
`;

const RetryButton = styled.button`
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.main};
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary.main};
    color: white;
  }
`;

const EmptyContainer = styled.div`
  text-align: center;
  padding: 3rem 1rem;
`;

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const ViewAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.colors.primary.main};
  color: ${({ theme }) => theme.colors.primary.main};
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  margin: 1rem auto 0;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.primary.main};
    color: white;
  }
`;

// Types
interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  categoryFilter?: 'all' | 'achievements' | 'rewards' | 'points';
}

/**
 * Optimized Activity Feed Component
 * 
 * Key improvements:
 * - Fixed animation loading using styled-components
 * - Resolved import duplicates
 * - Improved performance with proper memoization
 * - Added proper TypeScript types
 * - Enhanced loading and error states
 * - Better accessibility and responsive design
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 5,
  showHeader = true,
  compact = false,
  categoryFilter = 'all'
}) => {
  const { profile, isLoading, error } = useGamificationData();
  
  // Memoized transaction filtering and processing
  const transactions = useMemo(() => {
    if (!profile.data?.recentTransactions) return [];
    
    let filtered = [...profile.data.recentTransactions];
    
    // Apply category filter
    switch (categoryFilter) {
      case 'achievements':
        filtered = filtered.filter(t => t.source === 'achievement_earned');
        break;
      case 'rewards':
        filtered = filtered.filter(t => t.source === 'reward_redemption');
        break;
      case 'points':
        filtered = filtered.filter(t => 
          t.source !== 'achievement_earned' && 
          t.source !== 'reward_redemption'
        );
        break;
      default:
        // 'all' - no filter
        break;
    }
    
    return filtered.slice(0, limit);
  }, [profile.data?.recentTransactions, categoryFilter, limit]);
  
  // Memoized date formatter
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, []);
  
  // Memoized icon renderer
  const getTransactionIcon = useCallback((transaction: PointTransaction) => {
    const iconMap = {
      workout_completion: <Dumbbell size={20} color="#4caf50" />,
      streak_bonus: <Zap size={20} color="#2196f3" />,
      achievement_earned: <Award size={20} color="#ff9800" />,
      reward_redemption: <Gift size={20} color="#f44336" />,
      daily_login: <Calendar size={20} color="#9c27b0" />,
      challenge_completed: <CheckCircle size={20} color="#4caf50" />,
      level_up: <TrendingUp size={20} color="#2196f3" />,
    };
    
    return iconMap[transaction.source as keyof typeof iconMap] || <Activity size={20} color="#757575" />;
  }, []);
  
  // Optimized retry handler
  const handleRetry = useCallback(() => {
    profile.refetch();
  }, [profile]);
  
  // Render loading state
  if (isLoading) {
    return (
      <Container className={compact ? 'compact' : ''}>
        {showHeader && (
          <Header>
            <HeaderLeft>
              <Clock size={20} />
              <Title>Activity Feed</Title>
            </HeaderLeft>
          </Header>
        )}
        
        <LoadingContainer>
          {Array(limit).fill(0).map((_, index) => (
            <SkeletonItem key={index}>
              <SkeletonIcon />
              <div style={{ flex: 1 }}>
                <SkeletonText width="60%" />
                <SkeletonText width="40%" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <SkeletonRect width="60px" />
                <SkeletonRect width="40px" />
              </div>
            </SkeletonItem>
          ))}
        </LoadingContainer>
      </Container>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Container className={compact ? 'compact' : ''}>
        <ErrorContainer>
          <ErrorText>Error loading activity data</ErrorText>
          <RetryButton onClick={handleRetry}>Retry</RetryButton>
        </ErrorContainer>
      </Container>
    );
  }
  
  // Render empty state
  if (!transactions.length) {
    return (
      <Container className={compact ? 'compact' : ''}>
        {showHeader && (
          <Header>
            <HeaderLeft>
              <Clock size={20} />
              <Title>Activity Feed</Title>
            </HeaderLeft>
          </Header>
        )}
        
        <EmptyContainer>
          <EmptyText>No recent activity found</EmptyText>
        </EmptyContainer>
      </Container>
    );
  }
  
  return (
    <Container className={compact ? 'compact' : ''}>
      {showHeader && (
        <Header>
          <HeaderLeft>
            <Activity size={20} color="#1976d2" />
            <Title>Recent Activity</Title>
          </HeaderLeft>
          
          {!compact && (
            <FilterChips>
              <FilterChip active={categoryFilter === 'all'}>All</FilterChip>
              <FilterChip active={categoryFilter === 'points'}>Points</FilterChip>
              <FilterChip active={categoryFilter === 'achievements'}>Achievements</FilterChip>
              <FilterChip active={categoryFilter === 'rewards'}>Rewards</FilterChip>
            </FilterChips>
          )}
        </Header>
      )}
      
      <ActivityList>
        {transactions.map((transaction, index) => (
          <ActivityItem
            key={transaction.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            data-testid={`activity-item-${index}`}
          >
            <IconContainer>
              <IconWrapper>
                {getTransactionIcon(transaction)}
              </IconWrapper>
            </IconContainer>
            
            <ActivityContent>
              <ActivityDescription>{transaction.description}</ActivityDescription>
              <ActivityTime>{formatDate(transaction.createdAt)}</ActivityTime>
            </ActivityContent>
            
            <PointsSection>
              <PointsValue type={transaction.transactionType}>
                {transaction.transactionType === 'earn' || transaction.transactionType === 'bonus'
                  ? `+${transaction.points}`
                  : `-${transaction.points}`}
              </PointsValue>
              <BalanceInfo>
                <Star size={12} color="#FFC107" />
                <BalanceValue>{transaction.balance.toLocaleString()}</BalanceValue>
              </BalanceInfo>
            </PointsSection>
          </ActivityItem>
        ))}
      </ActivityList>
      
      {!compact && transactions.length > 0 && (
        <ViewAllButton onClick={() => {/* View all activity */}}>
          <Clock size={16} />
          View All Activity
        </ViewAllButton>
      )}
    </Container>
  );
};

export default React.memo(ActivityFeed);
