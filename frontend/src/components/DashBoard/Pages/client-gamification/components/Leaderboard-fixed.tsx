import React, { useMemo, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import {
  Star,
  Trophy,
  ChevronUp,
  ChevronDown,
  Minus,
  Crown,
  Users
} from 'lucide-react';

import { useGamificationData, LeaderboardEntry } from '../../../../../hooks/gamification/useGamificationData';
import { useAuth } from '../../../../../context/AuthContext';

// Animation definitions
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
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
  overflow: hidden;
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

const UserCountChip = styled.span`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: ${({ theme }) => theme.colors.primary.light};
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SkeletonItem = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SkeletonCircle = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 400% 100%;
  animation: ${shimmer} 1.5s ease-in-out infinite;
  margin-right: 1rem;
`;

const SkeletonAvatar = styled.div`
  width: 40px;
  height: 40px;
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
  height: ${props => props.height || '24px'};
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
  padding: 2rem;
`;

const EmptyText = styled.p`
  color: ${({ theme }) => theme.colors.text.secondary};
  margin: 0;
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
`;

const LeaderboardItem = styled(motion.div)<{ isCurrentUser?: boolean }>`
  display: flex;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${props => props.isCurrentUser ? 'rgba(25, 118, 210, 0.08)' : 'transparent'};
  position: relative;
  overflow: hidden;
  
  &:last-child {
    border-bottom: none;
  }
  
  ${props => props.isCurrentUser && `
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background: ${props.theme.colors.primary.main};
    }
  `}
`;

const PositionSection = styled.div`
  display: flex;
  align-items: center;
  min-width: 48px;
`;

const PositionBadge = styled.div<{ position: number }>`
  min-width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => {
    if (props.position === 1) return '#FFD700';
    if (props.position === 2) return '#C0C0C0';
    if (props.position === 3) return '#CD7F32';
    return 'rgba(0, 0, 0, 0.08)';
  }};
  color: ${props => props.position <= 3 ? '#000' : props.theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 1rem;
  position: relative;
`;

const CrownIcon = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
`;

const PositionIndicator = styled.div<{ change: 'up' | 'down' | 'same'; diff: number }>`
  display: flex;
  align-items: center;
  color: ${props => {
    if (props.change === 'up') return props.theme.colors.success.main;
    if (props.change === 'down') return props.theme.colors.error.main;
    return props.theme.colors.text.disabled;
  }};
`;

const IndicatorText = styled.span`
  font-size: 0.75rem;
  margin-left: 0.25rem;
`;

const Avatar = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 1rem;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 1rem;
  background: ${({ theme }) => theme.colors.primary.main};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.875rem;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div<{ isCurrentUser?: boolean }>`
  font-size: 1rem;
  font-weight: ${props => props.isCurrentUser ? 'bold' : 'normal'};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 0.25rem;
`;

const UserLevel = styled.div`
  font-size: 0.875rem;
  color: ${({ theme }) => theme.colors.text.secondary};
`;

const PointsSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 0.5rem;
`;

const Points = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const PointsValue = styled.span`
  font-size: 0.875rem;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.text.primary};
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

// Enhanced types
interface ProcessedLeaderboardEntry extends LeaderboardEntry {
  position: number;
  positionChange: 'up' | 'down' | 'same';
  positionDiff: number;
}

interface LeaderboardProps {
  compact?: boolean;
  highlightUserId?: string;
  limit?: number;
  showHeader?: boolean;
}

/**
 * Optimized Leaderboard Component
 * 
 * Key improvements:
 * - Fixed animation loading using styled-components
 * - Resolved import duplicates
 * - Improved performance with proper memoization
 * - Added proper TypeScript types
 * - Enhanced loading and error states
 * - Better accessibility
 */
const Leaderboard: React.FC<LeaderboardProps> = ({
  compact = false,
  highlightUserId,
  limit = 5,
  showHeader = true
}) => {
  const { user } = useAuth();
  const { leaderboard, isLoading, error } = useGamificationData();
  
  // Memoized position change calculation
  const processedLeaderboard = useMemo(() => {
    if (!leaderboard.data) return [];
    
    // Get previous leaderboard data from localStorage
    const previousData = localStorage.getItem('previousLeaderboard');
    let previousLeaderboard: LeaderboardEntry[] = [];
    
    if (previousData) {
      try {
        previousLeaderboard = JSON.parse(previousData);
      } catch (e) {
        console.error('Error parsing previous leaderboard data:', e);
      }
    }
    
    // Calculate position changes and add position info
    return leaderboard.data.slice(0, limit).map((entry, index): ProcessedLeaderboardEntry => {
      const previousIndex = previousLeaderboard.findIndex(prev => prev.userId === entry.userId);
      
      let positionChange: 'up' | 'down' | 'same' = 'same';
      let positionDiff = 0;
      
      if (previousIndex !== -1) {
        if (previousIndex > index) {
          positionChange = 'up';
          positionDiff = previousIndex - index;
        } else if (previousIndex < index) {
          positionChange = 'down';
          positionDiff = index - previousIndex;
        }
      }
      
      return {
        ...entry,
        position: index + 1,
        positionChange,
        positionDiff
      };
    });
  }, [leaderboard.data, limit]);
  
  // Save current leaderboard for next comparison
  React.useEffect(() => {
    if (leaderboard.data) {
      localStorage.setItem('previousLeaderboard', JSON.stringify(leaderboard.data));
    }
  }, [leaderboard.data]);
  
  // Optimized retry handler
  const handleRetry = useCallback(() => {
    leaderboard.refetch();
  }, [leaderboard]);
  
  // Position indicator component
  const PositionChangeIndicator: React.FC<{ change: 'up' | 'down' | 'same'; diff: number }> = React.memo(({ change, diff }) => {
    if (change === 'same' || diff === 0) {
      return (
        <PositionIndicator change={change} diff={diff}>
          <Minus size={16} />
        </PositionIndicator>
      );
    }
    
    if (change === 'up') {
      return (
        <PositionIndicator change={change} diff={diff}>
          <ChevronUp size={16} />
          {diff > 0 && <IndicatorText>{diff}</IndicatorText>}
        </PositionIndicator>
      );
    }
    
    return (
      <PositionIndicator change={change} diff={diff}>
        <ChevronDown size={16} />
        {diff > 0 && <IndicatorText>{diff}</IndicatorText>}
      </PositionIndicator>
    );
  });
  
  // Render loading state
  if (isLoading) {
    return (
      <Container className={compact ? 'compact' : ''}>
        {showHeader && (
          <Header>
            <HeaderLeft>
              <Trophy size={20} />
              <Title>Leaderboard</Title>
            </HeaderLeft>
          </Header>
        )}
        
        <LoadingContainer>
          {Array(limit).fill(0).map((_, index) => (
            <SkeletonItem key={index}>
              <SkeletonCircle />
              <SkeletonAvatar />
              <div style={{ flex: 1 }}>
                <SkeletonText width="60%" />
                <SkeletonText width="40%" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <SkeletonRect width="60px" height="16px" />
                <SkeletonRect width="60px" height="24px" style={{ marginTop: '0.5rem' }} />
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
          <ErrorText>Error loading leaderboard data</ErrorText>
          <RetryButton onClick={handleRetry}>Retry</RetryButton>
        </ErrorContainer>
      </Container>
    );
  }
  
  // Render empty state
  if (!processedLeaderboard.length) {
    return (
      <Container className={compact ? 'compact' : ''}>
        <EmptyContainer>
          <EmptyText>No leaderboard data available</EmptyText>
        </EmptyContainer>
      </Container>
    );
  }
  
  return (
    <Container className={compact ? 'compact' : ''}>
      {showHeader && (
        <Header>
          <HeaderLeft>
            <Trophy size={20} color="#FFD700" />
            <Title>Fitness Leaderboard</Title>
          </HeaderLeft>
          
          <UserCountChip>
            <Users size={14} />
            {leaderboard.data?.length || 0} Users
          </UserCountChip>
        </Header>
      )}
      
      <LeaderboardList>
        {processedLeaderboard.map((entry, index) => {
          const isCurrentUser = entry.userId === (highlightUserId || user?.id);
          
          return (
            <LeaderboardItem
              key={entry.userId}
              isCurrentUser={isCurrentUser}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <PositionSection>
                <PositionBadge position={entry.position}>
                  {entry.position === 1 && (
                    <CrownIcon>
                      <Crown size={16} color="#FFD700" />
                    </CrownIcon>
                  )}
                  {entry.position}
                </PositionBadge>
                
                <PositionChangeIndicator 
                  change={entry.positionChange} 
                  diff={entry.positionDiff} 
                />
              </PositionSection>
              
              {entry.client.photo ? (
                <Avatar 
                  src={entry.client.photo} 
                  alt={`${entry.client.firstName} ${entry.client.lastName}`}
                />
              ) : (
                <AvatarPlaceholder>
                  {entry.client.firstName[0]}{entry.client.lastName[0]}
                </AvatarPlaceholder>
              )}
              
              <UserInfo>
                <UserName isCurrentUser={isCurrentUser}>
                  {entry.client.firstName} {entry.client.lastName} 
                  {isCurrentUser && ' (You)'}
                </UserName>
                <UserLevel>Level {entry.overallLevel}</UserLevel>
              </UserInfo>
              
              {!compact && (
                <PointsSection>
                  <Points>
                    <Star size={16} color="#FFC107" />
                    <PointsValue>
                      {entry.client.points?.toLocaleString() || '0'}
                    </PointsValue>
                  </Points>
                </PointsSection>
              )}
            </LeaderboardItem>
          );
        })}
      </LeaderboardList>
      
      {!compact && (
        <ViewAllButton onClick={() => {/* View full leaderboard */}}>
          <Users size={16} />
          View Full Leaderboard
        </ViewAllButton>
      )}
    </Container>
  );
};

export default React.memo(Leaderboard);
