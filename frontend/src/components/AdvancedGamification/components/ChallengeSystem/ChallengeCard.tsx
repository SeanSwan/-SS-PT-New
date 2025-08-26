/**
 * 🎯 CHALLENGE CARD - USER CHALLENGE DISPLAY
 * =========================================
 * Individual challenge display component with progress tracking,
 * participation controls, and visual appeal
 */

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  Users,
  Target,
  Trophy,
  Star,
  TrendingUp,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Gift,
  Zap,
  Fire
} from 'lucide-react';
import type { Challenge, ParticipationRecord } from '../../types/challenge.types';
import { GamificationCard } from '../../shared/GamificationCard';
import { AnimatedButton } from '../../shared/AnimatedButton';
import { 
  formatDuration, 
  formatNumber, 
  formatPercentage,
  formatRelativeTime,
  getDifficultyColors,
  getCategoryColors,
  getTierColors
} from '../../utils/gamificationHelpers';

// ================================================================
// TYPES AND INTERFACES
// ================================================================

export interface ChallengeCardProps {
  challenge: Challenge;
  userProgress?: ParticipationRecord | null;
  isParticipating?: boolean;
  canJoin?: boolean;
  joinRestrictions?: string[];
  onJoin?: (challengeId: string) => Promise<void>;
  onLeave?: (challengeId: string) => Promise<void>;
  onViewDetails?: (challengeId: string) => void;
  onShare?: (challengeId: string) => void;
  showActions?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'card' | 'compact' | 'detailed';
  className?: string;
}

// ================================================================
// STYLED COMPONENTS
// ================================================================

const ChallengeCardContainer = styled.div<{
  size: 'small' | 'medium' | 'large';
  variant: 'card' | 'compact' | 'detailed';
}>`
  width: 100%;
  
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`max-width: 320px;`;
      case 'large':
        return css`max-width: 480px;`;
      default:
        return css`max-width: 400px;`;
    }
  }}
  
  ${({ variant }) => variant === 'compact' && css`
    max-width: none;
  `}
`;

const ChallengeHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const ChallengeImage = styled.div<{ $category: string }>`
  width: 60px;
  height: 60px;
  border-radius: 16px;
  background: ${({ $category }) => {
    const colors = getCategoryColors($category as any);
    return `linear-gradient(135deg, ${colors.primary}40, ${colors.primary}20)`;
  }};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
  border: 2px solid ${({ $category }) => getCategoryColors($category as any).primary}60;
`;

const ChallengeInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChallengeTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const ChallengeMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const MetaBadge = styled.div<{ $color: string; $variant?: 'outline' | 'filled' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${({ $color, $variant = 'filled' }) => $variant === 'outline' ? css`
    background: transparent;
    border: 1px solid ${$color}60;
    color: ${$color};
  ` : css`
    background: ${$color}20;
    color: ${$color};
  `}
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const ChallengeDescription = styled.p`
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
`;

const ProgressSection = styled.div<{ $show: boolean }>`
  margin: 1.5rem 0;
  opacity: ${({ $show }) => $show ? 1 : 0};
  transform: ${({ $show }) => $show ? 'translateY(0)' : 'translateY(-10px)'};
  transition: all 0.3s ease;
  pointer-events: ${({ $show }) => $show ? 'auto' : 'none'};
`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
`;

const ProgressLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
`;

const ProgressValue = styled.span`
  font-size: 0.875rem;
  color: #00ffff;
  font-weight: 600;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  position: relative;
`;

const ProgressFill = styled(motion.div)<{ $percentage: number }>`
  height: 100%;
  background: linear-gradient(90deg, #00ffff 0%, #00ff88 100%);
  border-radius: 4px;
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
    animation: shimmer 2s infinite;
  }
  
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.1rem;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 0.25rem;
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const RewardsSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 215, 0, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 12px;
  margin: 1rem 0;
`;

const RewardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd700, #ff8f00);
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: 20px;
    height: 20px;
    color: #000;
  }
`;

const RewardInfo = styled.div`
  flex: 1;
`;

const RewardTitle = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: #ffd700;
  margin-bottom: 0.25rem;
`;

const RewardDescription = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
`;

const StatusIndicator = styled(motion.div)<{ $status: string }>`
  position: absolute;
  top: 1rem;
  right: 1rem;
  padding: 0.5rem 0.75rem;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  ${({ $status }) => {
    switch ($status) {
      case 'joined':
        return css`
          background: rgba(0, 255, 136, 0.2);
          color: #00ff88;
          border: 1px solid #00ff88;
        `;
      case 'completed':
        return css`
          background: rgba(255, 215, 0, 0.2);
          color: #ffd700;
          border: 1px solid #ffd700;
        `;
      case 'expired':
        return css`
          background: rgba(255, 71, 87, 0.2);
          color: #ff4757;
          border: 1px solid #ff4757;
        `;
      default:
        return css`
          background: rgba(0, 255, 255, 0.2);
          color: #00ffff;
          border: 1px solid #00ffff;
        `;
    }
  }}
  
  svg {
    width: 12px;
    height: 12px;
  }
`;

const TimeRemaining = styled.div<{ $urgent: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: ${({ $urgent }) => $urgent ? '#ff4757' : 'rgba(255, 255, 255, 0.7)'};
  margin-top: 0.5rem;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  ${({ $urgent }) => $urgent && css`
    animation: pulse 2s infinite;
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `}
`;

// ================================================================
// ANIMATION VARIANTS
// ================================================================

const progressVariants = {
  initial: { width: 0 },
  animate: (percentage: number) => ({
    width: `${percentage}%`,
    transition: { duration: 1.5, ease: "easeOut" }
  })
};

const statusVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { duration: 0.3, ease: "backOut" }
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  userProgress,
  isParticipating = false,
  canJoin = true,
  joinRestrictions = [],
  onJoin,
  onLeave,
  onViewDetails,
  onShare,
  showActions = true,
  size = 'medium',
  variant = 'card',
  className
}) => {
  
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  
  // Calculate challenge status and time remaining
  const now = new Date();
  const startDate = new Date(challenge.duration.startDate);
  const endDate = new Date(challenge.duration.endDate);
  const isActive = now >= startDate && now <= endDate;
  const isExpired = now > endDate;
  const isUpcoming = now < startDate;
  
  // Time calculations
  const timeRemaining = isExpired ? 0 : Math.max(0, endDate.getTime() - now.getTime());
  const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isUrgent = daysRemaining < 1 && hoursRemaining <= 6;
  
  // Progress calculations
  const progressPercentage = userProgress?.progress.percentage || 0;
  const currentValue = userProgress?.progress.currentValue || 0;
  const targetValue = challenge.targets[0]?.value || 1;
  
  // Challenge status
  const getStatus = () => {
    if (userProgress?.status === 'completed') return 'completed';
    if (isExpired) return 'expired';
    if (isParticipating) return 'joined';
    if (isUpcoming) return 'upcoming';
    return 'available';
  };
  
  const status = getStatus();
  
  // Get visual elements
  const difficultyColors = getDifficultyColors(challenge.difficulty);
  const categoryInfo = getCategoryColors(challenge.category);
  
  // Format time remaining
  const formatTimeRemaining = () => {
    if (isExpired) return 'Expired';
    if (isUpcoming) return `Starts ${formatRelativeTime(challenge.duration.startDate)}`;
    if (daysRemaining > 0) return `${daysRemaining}d ${hoursRemaining}h left`;
    if (hoursRemaining > 0) return `${hoursRemaining}h left`;
    return 'Ending soon';
  };
  
  // Handle actions
  const handleJoin = async () => {
    if (!onJoin || !canJoin) return;
    
    setIsJoining(true);
    try {
      await onJoin(challenge.id);
    } catch (error) {
      console.error('Failed to join challenge:', error);
    } finally {
      setIsJoining(false);
    }
  };
  
  const handleLeave = async () => {
    if (!onLeave) return;
    
    setIsLeaving(true);
    try {
      await onLeave(challenge.id);
    } catch (error) {
      console.error('Failed to leave challenge:', error);
    } finally {
      setIsLeaving(false);
    }
  };
  
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(challenge.id);
    }
  };
  
  const handleShare = () => {
    if (onShare) {
      onShare(challenge.id);
    }
  };
  
  // Render action buttons
  const renderActionButtons = () => {
    if (!showActions) return null;
    
    const buttons = [];
    
    // Primary action button
    if (isParticipating) {
      if (status === 'completed') {
        buttons.push(
          <AnimatedButton
            key="completed"
            variant="success"
            size="small"
            disabled
            leftIcon={<Trophy size={16} />}
          >
            Completed
          </AnimatedButton>
        );
      } else if (isActive) {
        buttons.push(
          <AnimatedButton
            key="leave"
            variant="danger"
            size="small"
            isLoading={isLeaving}
            onClick={handleLeave}
            leftIcon={<Pause size={16} />}
          >
            Leave
          </AnimatedButton>
        );
      }
    } else if (canJoin && !isExpired) {
      buttons.push(
        <AnimatedButton
          key="join"
          variant="primary"
          size="small"
          isLoading={isJoining}
          onClick={handleJoin}
          leftIcon={<Play size={16} />}
          showRipple
        >
          Join Challenge
        </AnimatedButton>
      );
    } else if (joinRestrictions.length > 0) {
      buttons.push(
        <AnimatedButton
          key="restricted"
          variant="secondary"
          size="small"
          disabled
          leftIcon={<AlertCircle size={16} />}
        >
          Restricted
        </AnimatedButton>
      );
    }
    
    // View details button
    buttons.push(
      <AnimatedButton
        key="details"
        variant="ghost"
        size="small"
        onClick={handleViewDetails}
      >
        Details
      </AnimatedButton>
    );
    
    return buttons;
  };
  
  return (
    <ChallengeCardContainer
      size={size}
      variant={variant}
      className={className}
    >
      <GamificationCard
        variant={status === 'completed' ? 'gradient' : 'elevated'}
        size={size}
        isClickable={Boolean(onViewDetails)}
        onCardClick={handleViewDetails}
        showGlow={status === 'joined'}
        customColors={{
          border: difficultyColors.primary + '40'
        }}
      >
        {/* Status indicator */}
        <AnimatePresence>
          {status !== 'available' && (
            <StatusIndicator
              $status={status}
              variants={statusVariants}
              initial="initial"
              animate="animate"
              exit="initial"
            >
              {status === 'joined' && <Play size={12} />}
              {status === 'completed' && <CheckCircle size={12} />}
              {status === 'expired' && <AlertCircle size={12} />}
              {status === 'upcoming' && <Clock size={12} />}
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </StatusIndicator>
          )}
        </AnimatePresence>
        
        {/* Header */}
        <ChallengeHeader>
          <ChallengeImage $category={challenge.category}>
            {categoryInfo.icon}
          </ChallengeImage>
          
          <ChallengeInfo>
            <ChallengeTitle>{challenge.title}</ChallengeTitle>
            
            <ChallengeMeta>
              <MetaBadge $color={difficultyColors.primary}>
                <Target size={12} />
                {challenge.difficulty}
              </MetaBadge>
              
              <MetaBadge $color={categoryInfo.primary}>
                <Star size={12} />
                {challenge.category}
              </MetaBadge>
              
              <MetaBadge $color="#00ffff" $variant="outline">
                <Users size={12} />
                {formatNumber(challenge.progressData.totalParticipants)}
              </MetaBadge>
            </ChallengeMeta>
            
            <TimeRemaining $urgent={isUrgent}>
              <Clock />
              {formatTimeRemaining()}
            </TimeRemaining>
          </ChallengeInfo>
        </ChallengeHeader>
        
        {/* Description */}
        {variant !== 'compact' && (
          <ChallengeDescription>
            {challenge.shortDescription || challenge.description}
          </ChallengeDescription>
        )}
        
        {/* Progress section */}
        <ProgressSection $show={isParticipating && userProgress}>
          <ProgressHeader>
            <ProgressLabel>Your Progress</ProgressLabel>
            <ProgressValue>
              {formatNumber(currentValue)} / {formatNumber(targetValue)}
            </ProgressValue>
          </ProgressHeader>
          
          <ProgressBar>
            <ProgressFill
              $percentage={progressPercentage}
              variants={progressVariants}
              initial="initial"
              animate="animate"
              custom={progressPercentage}
            />
          </ProgressBar>
        </ProgressSection>
        
        {/* Stats */}
        {variant === 'detailed' && (
          <StatsGrid>
            <StatItem>
              <StatValue>{formatPercentage(challenge.progressData.completionRate)}</StatValue>
              <StatLabel>Completion</StatLabel>
            </StatItem>
            
            <StatItem>
              <StatValue>{formatNumber(challenge.rewards.xpPoints)}</StatValue>
              <StatLabel>XP Reward</StatLabel>
            </StatItem>
            
            <StatItem>
              <StatValue>{daysRemaining + 1}</StatValue>
              <StatLabel>Days Left</StatLabel>
            </StatItem>
            
            <StatItem>
              <StatValue>#{Math.floor(challenge.engagementMetrics.views / 10) + 1}</StatValue>
              <StatLabel>Popularity</StatLabel>
            </StatItem>
          </StatsGrid>
        )}
        
        {/* Rewards */}
        {challenge.rewards.badgeId && variant !== 'compact' && (
          <RewardsSection>
            <RewardIcon>
              <Gift />
            </RewardIcon>
            
            <RewardInfo>
              <RewardTitle>
                {challenge.rewards.xpPoints} XP + {challenge.rewards.badgeName}
              </RewardTitle>
              <RewardDescription>
                Earn exclusive rewards for completing this challenge
              </RewardDescription>
            </RewardInfo>
            
            <Zap size={20} color="#ffd700" />
          </RewardsSection>
        )}
        
        {/* Action buttons */}
        <ActionButtons>
          {renderActionButtons()}
        </ActionButtons>
      </GamificationCard>
    </ChallengeCardContainer>
  );
};

export default ChallengeCard;
