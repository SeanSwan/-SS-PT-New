import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
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
import { motion } from 'framer-motion';
import { useGamificationData, PointTransaction } from '../../../../../hooks/gamification/useGamificationData';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const PanelContainer = styled.div<{ $compact?: boolean }>`
  padding: ${props => props.$compact ? '16px' : '24px'};
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HeaderTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const FilterGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const FilterChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  min-height: 32px;
  border-radius: 16px;
  border: 1px solid ${props => props.$active ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.15)'};
  background: ${props => props.$active ? 'rgba(0, 255, 255, 0.15)' : 'transparent'};
  color: ${props => props.$active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const FeedList = styled.div`
  width: 100%;
`;

const FeedItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
`;

const ItemIcon = styled.div`
  width: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 2px;
`;

const ItemContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ItemPrimary = styled.span`
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  display: block;
`;

const ItemSecondary = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-top: 2px;
`;

const ItemPoints = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  margin-left: 12px;
`;

const PointsValue = styled.span<{ $positive: boolean }>`
  font-size: 0.875rem;
  font-weight: 700;
  color: ${props => props.$positive ? '#66bb6a' : '#ef5350'};
`;

const BalanceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
`;

const BalanceText = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  margin: 0;
`;

const EmptyText = styled.p`
  text-align: center;
  padding: 24px 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
`;

const ErrorText = styled.p`
  text-align: center;
  color: #ef5350;
  font-size: 0.875rem;
  margin: 0 0 16px;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 6px 16px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.1); }
`;

const ViewAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(0, 255, 255, 0.4);
  background: transparent;
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.1); }
`;

const FooterRow = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
`;

const SkeletonBlock = styled.div<{ $width?: string; $height?: string; $borderRadius?: string }>`
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.1) 50%,
    rgba(255, 255, 255, 0.05) 100%);
  background-size: 200% 100%;
  animation: ${shimmer} 2s infinite linear;
  width: ${props => props.$width || '100%'};
  height: ${props => props.$height || '20px'};
  border-radius: ${props => props.$borderRadius || '4px'};
`;

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  categoryFilter?: 'all' | 'achievements' | 'rewards' | 'points';
}

/**
 * Activity Feed Component
 * Displays recent gamification activities like points earned, achievements, rewards, etc.
 * Optimized for performance with animations and loading states
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  limit = 5,
  showHeader = true,
  compact = false,
  categoryFilter = 'all'
}) => {
  const { profile, isLoading, error } = useGamificationData();

  // Process transactions and filter based on category
  const transactions = useMemo(() => {
    if (!profile.data?.recentTransactions) return [];

    let filtered = [...profile.data.recentTransactions];

    // Apply category filter
    if (categoryFilter === 'achievements') {
      filtered = filtered.filter(t => t.source === 'achievement_earned');
    } else if (categoryFilter === 'rewards') {
      filtered = filtered.filter(t => t.source === 'reward_redemption');
    } else if (categoryFilter === 'points') {
      filtered = filtered.filter(t =>
        t.source !== 'achievement_earned' &&
        t.source !== 'reward_redemption'
      );
    }

    return filtered.slice(0, limit);
  }, [profile.data?.recentTransactions, categoryFilter, limit]);

  // Format date for display
  const formatDate = (dateString: string) => {
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
  };

  // Get icon for transaction
  const getTransactionIcon = (transaction: PointTransaction) => {
    switch (transaction.source) {
      case 'workout_completion':
        return <Dumbbell size={20} color="#4caf50" />;
      case 'streak_bonus':
        return <Zap size={20} color="#2196f3" />;
      case 'achievement_earned':
        return <Award size={20} color="#ff9800" />;
      case 'reward_redemption':
        return <Gift size={20} color="#f44336" />;
      case 'daily_login':
        return <Calendar size={20} color="#9c27b0" />;
      case 'challenge_completed':
        return <CheckCircle size={20} color="#4caf50" />;
      case 'level_up':
        return <TrendingUp size={20} color="#2196f3" />;
      default:
        return <Activity size={20} color="#757575" />;
    }
  };

  const renderHeader = () => {
    if (!showHeader) return null;
    return (
      <HeaderRow>
        <HeaderLeft>
          <Activity size={20} color="#00ffff" />
          <HeaderTitle>{isLoading || !transactions.length ? 'Activity Feed' : 'Recent Activity'}</HeaderTitle>
        </HeaderLeft>
        {!compact && !isLoading && transactions.length > 0 && (
          <FilterGroup>
            {(['all', 'points', 'achievements', 'rewards'] as const).map(cat => (
              <FilterChip
                key={cat}
                $active={categoryFilter === cat}
                onClick={() => {/* Filter by category */}}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </FilterChip>
            ))}
          </FilterGroup>
        )}
      </HeaderRow>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <PanelContainer $compact={compact}>
        {renderHeader()}
        <FeedList>
          {Array(limit).fill(0).map((_, index) => (
            <React.Fragment key={index}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
                <div style={{ width: 42, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  <SkeletonBlock $width="24px" $height="24px" $borderRadius="50%" />
                </div>
                <div style={{ flex: 1, marginLeft: 4 }}>
                  <SkeletonBlock $width="60%" $height="16px" />
                  <SkeletonBlock $width="40%" $height="14px" style={{ marginTop: 4 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginLeft: 12 }}>
                  <SkeletonBlock $width="60px" $height="16px" />
                  <SkeletonBlock $width="40px" $height="14px" style={{ marginTop: 4 }} />
                </div>
              </div>
              {index < limit - 1 && <Divider />}
            </React.Fragment>
          ))}
        </FeedList>
      </PanelContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <PanelContainer $compact={compact} style={{ textAlign: 'center' }}>
        <ErrorText>Error loading activity data</ErrorText>
        <RetryButton onClick={() => profile.refetch()}>Retry</RetryButton>
      </PanelContainer>
    );
  }

  // Render empty state
  if (!transactions.length) {
    return (
      <PanelContainer $compact={compact}>
        {renderHeader()}
        <EmptyText>No recent activity found</EmptyText>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer $compact={compact}>
      {renderHeader()}

      <FeedList>
        {transactions.map((transaction, index) => (
          <React.Fragment key={transaction.id}>
            <FeedItem
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              data-testid={`activity-item-${index}`}
            >
              <ItemIcon>
                {getTransactionIcon(transaction)}
              </ItemIcon>
              <ItemContent>
                <ItemPrimary>{transaction.description}</ItemPrimary>
                <ItemSecondary>{formatDate(transaction.createdAt)}</ItemSecondary>
              </ItemContent>
              <ItemPoints>
                <PointsValue $positive={transaction.transactionType === 'earn' || transaction.transactionType === 'bonus'}>
                  {transaction.transactionType === 'earn' || transaction.transactionType === 'bonus'
                    ? `+${transaction.points}`
                    : `-${transaction.points}`}
                </PointsValue>
                <BalanceRow>
                  <Star size={12} color="#FFC107" />
                  <BalanceText>{transaction.balance}</BalanceText>
                </BalanceRow>
              </ItemPoints>
            </FeedItem>
            {index < transactions.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </FeedList>

      {!compact && transactions.length > 0 && (
        <FooterRow>
          <ViewAllButton onClick={() => {/* View all activity */}}>
            <Clock size={16} /> View All Activity
          </ViewAllButton>
        </FooterRow>
      )}
    </PanelContainer>
  );
};

export default React.memo(ActivityFeed);
