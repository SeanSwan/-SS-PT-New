import React, { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  Star,
  Trophy,
  ChevronUp,
  ChevronDown,
  Minus,
  Crown,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useGamificationData, LeaderboardEntry } from '../../../../../hooks/gamification/useGamificationData';
import { useAuth } from '../../../../../context/AuthContext';

const shimmer = keyframes`
  0% { background-position: -100% 0; }
  100% { background-position: 200% 0; }
`;

const PanelContainer = styled.div<{ $compact?: boolean }>`
  padding: ${props => props.$compact ? '16px' : '24px'};
  border-radius: 12px;
  background: rgba(29, 31, 43, 0.8);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
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

const UsersChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
`;

const LeaderboardRow = styled(motion.div)<{ $isCurrentUser: boolean; $isLast: boolean }>`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: ${props => props.$isCurrentUser ? 'rgba(0, 255, 255, 0.06)' : 'transparent'};
  border-bottom: ${props => props.$isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.06)'};
  position: relative;

  ${props => props.$isCurrentUser && `
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background-color: #00ffff;
    }
  `}
`;

const PositionBadge = styled.div<{ $color: string; $textColor: string }>`
  min-width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: ${props => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  color: ${props => props.$textColor};
  margin-right: 8px;
  position: relative;
`;

const CrownWrapper = styled.span`
  position: absolute;
  top: -8px;
  right: -4px;
`;

const PositionCol = styled.div`
  display: flex;
  align-items: center;
  min-width: 56px;
`;

const ChangeIndicator = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  color: ${props => props.$color};
  font-size: 0.75rem;
  margin-left: 4px;
`;

const UserAvatar = styled.div<{ $src?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${props => props.$src ? `url(${props.$src}) center/cover` : 'rgba(0, 255, 255, 0.2)'};
  color: #00ffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  flex-shrink: 0;
  margin-right: 12px;
`;

const UserInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const UserNameText = styled.span<{ $bold?: boolean }>`
  font-size: 1rem;
  font-weight: ${props => props.$bold ? '700' : '400'};
  color: white;
  display: block;
`;

const LevelText = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.5);
`;

const PointsCol = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-right: 8px;
`;

const PointsValue = styled.span`
  font-size: 0.875rem;
  font-weight: 700;
  color: white;
`;

const ErrorText = styled.p`
  text-align: center;
  color: #ef5350;
  font-size: 0.875rem;
  margin: 0 0 16px;
`;

const EmptyText = styled.p`
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.875rem;
  margin: 0;
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

const ViewAllBtn = styled.button`
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

interface LeaderboardProps {
  compact?: boolean;
  highlightUserId?: string;
  limit?: number;
  showHeader?: boolean;
}

/**
 * Enhanced Leaderboard Component
 * Displays the top users in the gamification system
 */
const Leaderboard: React.FC<LeaderboardProps> = ({
  compact = false,
  highlightUserId,
  limit = 5,
  showHeader = true
}) => {
  const { user } = useAuth();
  const { leaderboard, isLoading, error } = useGamificationData();

  const processedLeaderboard = useMemo(() => {
    if (!leaderboard.data) return [];

    const previousData = localStorage.getItem('previousLeaderboard');
    let previousLeaderboard: LeaderboardEntry[] = [];

    if (previousData) {
      try {
        previousLeaderboard = JSON.parse(previousData);
      } catch (e) {
        console.error('Error parsing previous leaderboard data:', e);
      }
    }

    return leaderboard.data.slice(0, limit).map((entry, index) => {
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

  React.useEffect(() => {
    if (leaderboard.data) {
      localStorage.setItem('previousLeaderboard', JSON.stringify(leaderboard.data));
    }
  }, [leaderboard.data]);

  const PositionIndicator = ({ change, diff }: { change: 'up' | 'down' | 'same', diff: number }) => {
    if (change === 'same' || diff === 0) {
      return <Minus size={16} color="rgba(255,255,255,0.3)" />;
    }
    if (change === 'up') {
      return (
        <ChangeIndicator $color="#66bb6a">
          <ChevronUp size={16} />
          {diff > 0 && <span style={{ marginLeft: 2 }}>{diff}</span>}
        </ChangeIndicator>
      );
    }
    return (
      <ChangeIndicator $color="#ef5350">
        <ChevronDown size={16} />
        {diff > 0 && <span style={{ marginLeft: 2 }}>{diff}</span>}
      </ChangeIndicator>
    );
  };

  if (isLoading) {
    return (
      <PanelContainer $compact={compact}>
        {showHeader && (
          <HeaderRow>
            <HeaderLeft>
              <Trophy size={20} color="rgba(255,255,255,0.7)" />
              <HeaderTitle>Leaderboard</HeaderTitle>
            </HeaderLeft>
          </HeaderRow>
        )}
        {Array(limit).fill(0).map((_, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: index < limit - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
            <SkeletonBlock $width="36px" $height="36px" $borderRadius="50%" />
            <div style={{ marginLeft: 8, marginRight: 12 }}>
              <SkeletonBlock $width="40px" $height="40px" $borderRadius="50%" />
            </div>
            <div style={{ flex: 1 }}>
              <SkeletonBlock $width="60%" $height="16px" />
              <SkeletonBlock $width="40%" $height="14px" style={{ marginTop: 4 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <SkeletonBlock $width="60px" $height="16px" />
              <SkeletonBlock $width="60px" $height="24px" $borderRadius="6px" style={{ marginTop: 4 }} />
            </div>
          </div>
        ))}
      </PanelContainer>
    );
  }

  if (error) {
    return (
      <PanelContainer $compact={compact} style={{ textAlign: 'center' }}>
        <ErrorText>Error loading leaderboard data</ErrorText>
        <RetryButton onClick={() => leaderboard.refetch()}>Retry</RetryButton>
      </PanelContainer>
    );
  }

  if (!processedLeaderboard.length) {
    return (
      <PanelContainer $compact={compact} style={{ textAlign: 'center' }}>
        <EmptyText>No leaderboard data available</EmptyText>
      </PanelContainer>
    );
  }

  return (
    <PanelContainer $compact={compact}>
      {showHeader && (
        <HeaderRow>
          <HeaderLeft>
            <Trophy size={20} color="#FFD700" />
            <HeaderTitle>Fitness Leaderboard</HeaderTitle>
          </HeaderLeft>
          <UsersChip>
            <Users size={14} />
            {leaderboard.data?.length || 0} Users
          </UsersChip>
        </HeaderRow>
      )}

      {processedLeaderboard.map((entry, index) => {
        const isCurrentUser = entry.userId === (highlightUserId || user?.id);
        const isTopThree = index < 3;
        const positionColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'rgba(255, 255, 255, 0.08)';
        const positionTextColor = index <= 2 ? '#000' : 'rgba(255, 255, 255, 0.5)';

        return (
          <LeaderboardRow
            key={entry.userId}
            $isCurrentUser={isCurrentUser}
            $isLast={index === processedLeaderboard.length - 1}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <PositionCol>
              <PositionBadge $color={positionColor} $textColor={positionTextColor}>
                {index === 0 && (
                  <CrownWrapper>
                    <Crown size={16} color="#FFD700" />
                  </CrownWrapper>
                )}
                {entry.position}
              </PositionBadge>
              <PositionIndicator change={entry.positionChange} diff={entry.positionDiff} />
            </PositionCol>

            <UserAvatar $src={entry.client.photo || undefined}>
              {!entry.client.photo && `${entry.client.firstName[0]}${entry.client.lastName[0]}`}
            </UserAvatar>

            <UserInfo>
              <UserNameText $bold={isCurrentUser}>
                {entry.client.firstName} {entry.client.lastName} {isCurrentUser && '(You)'}
              </UserNameText>
              <LevelText>Level {entry.overallLevel}</LevelText>
            </UserInfo>

            {!compact && (
              <PointsCol>
                <Star size={16} color="#FFC107" />
                <PointsValue>{entry.client.points?.toLocaleString() || '0'}</PointsValue>
              </PointsCol>
            )}
          </LeaderboardRow>
        );
      })}

      {!compact && (
        <FooterRow>
          <ViewAllBtn onClick={() => {/* View full leaderboard */}}>
            <Users size={16} /> View Full Leaderboard
          </ViewAllBtn>
        </FooterRow>
      )}
    </PanelContainer>
  );
};

export default React.memo(Leaderboard);
