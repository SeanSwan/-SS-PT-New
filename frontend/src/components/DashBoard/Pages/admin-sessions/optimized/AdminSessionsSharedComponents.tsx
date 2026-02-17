/**
 * AdminSessionsSharedComponents.tsx
 * ==================================
 *
 * Shared UI components and utilities for Admin Sessions optimization
 * Following proven Trainer Dashboard methodology - DRY principle implementation
 *
 * Features:
 * - Reusable UI components for consistency
 * - Common styling utilities with cosmic theme
 * - Performance-optimized with memoization
 * - Accessibility compliance (WCAG AA)
 * - Mobile-first responsive design
 *
 * Migrated from MUI to styled-components + lucide-react (Galaxy-Swan theme)
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { Calendar, Clock, User, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Client, Trainer, SessionStatus, StatsCardData } from './AdminSessionsTypes';

// ===== STYLED COMPONENTS =====

const StellarCard = styled(motion.div)<{ $variant?: string }>`
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 58, 138, 0.1) 100%)';
      case 'success': return 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)';
      case 'info': return 'linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(8, 145, 178, 0.1) 100%)';
      case 'warning': return 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.1) 100%)';
      default: return 'linear-gradient(135deg, rgba(30, 58, 138, 0.1) 0%, rgba(14, 165, 233, 0.05) 100%)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.$variant) {
      case 'primary': return 'rgba(59, 130, 246, 0.3)';
      case 'success': return 'rgba(16, 185, 129, 0.3)';
      case 'info': return 'rgba(14, 165, 233, 0.3)';
      case 'warning': return 'rgba(245, 158, 11, 0.3)';
      default: return 'rgba(59, 130, 246, 0.2)';
    }
  }};
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => {
      switch (props.$variant) {
        case 'primary': return 'linear-gradient(90deg, #3b82f6, #0ea5e9)';
        case 'success': return 'linear-gradient(90deg, #10b981, #34d399)';
        case 'info': return 'linear-gradient(90deg, #0ea5e9, #0891b2)';
        case 'warning': return 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        default: return 'linear-gradient(90deg, #3b82f6, #0ea5e9)';
      }
    }};
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
  }

  transition: all 0.3s ease;
`;

const StellarIconContainer = styled.div<{ $variant?: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => {
    switch (props.$variant) {
      case 'primary': return 'linear-gradient(135deg, #3b82f6, #0ea5e9)';
      case 'success': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'info': return 'linear-gradient(135deg, #0ea5e9, #0891b2)';
      case 'warning': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'linear-gradient(135deg, #3b82f6, #0ea5e9)';
    }
  }};
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const StellarChipStyled = styled.span<{ $chipStatus?: SessionStatus; $size?: 'small' | 'medium' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${props => props.$size === 'medium' ? '6px 14px' : '4px 10px'};
  border-radius: 16px;
  font-size: ${props => props.$size === 'medium' ? '0.8rem' : '0.75rem'};
  font-weight: 500;
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
  min-height: ${props => props.$size === 'medium' ? '32px' : '24px'};
  background: ${props => {
    switch (props.$chipStatus) {
      case 'available': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'scheduled': return 'linear-gradient(135deg, #3b82f6, #60a5fa)';
      case 'confirmed': return 'linear-gradient(135deg, #0ea5e9, #0891b2)';
      case 'completed': return 'linear-gradient(135deg, #8b5cf6, #a78bfa)';
      case 'cancelled': return 'linear-gradient(135deg, #ef4444, #f87171)';
      case 'requested': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    }
  }};
`;

const SessionCountChip = styled.span<{ $hasAvailable: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 500;
  white-space: nowrap;
  height: 20px;
  margin-top: 4px;
  border: 1px solid ${props => props.$hasAvailable
    ? 'rgba(46, 125, 50, 0.5)'
    : 'rgba(211, 47, 47, 0.5)'};
  color: ${props => props.$hasAvailable
    ? 'rgba(46, 125, 50, 1)'
    : 'rgba(211, 47, 47, 1)'};
  background: ${props => props.$hasAvailable
    ? 'rgba(46, 125, 50, 0.1)'
    : 'rgba(211, 47, 47, 0.1)'};
`;

const StatsCardRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

const StatsCardTextBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatsCardValue = styled.div`
  font-weight: 600;
  color: white;
  font-size: 1.75rem;
  line-height: 1.2;
`;

const StatsCardLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  font-weight: 500;
`;

const LoadingSpinner = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(59, 130, 246, 0.2);
    border-left: 3px solid #3b82f6;
    border-radius: 50%;
    margin-bottom: 1rem;
  }
`;

const LoadingMessage = styled.h6`
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 4px 0;
  font-size: 1.1rem;
  font-weight: 500;
`;

const LoadingSubMessage = styled.p`
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 0.875rem;
`;

const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);

  .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .description {
    font-size: 0.9rem;
    line-height: 1.5;
    max-width: 400px;
  }
`;

const ActionButtonWrapper = styled.div`
  margin-top: 16px;
`;

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const ClientTrainerDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const AvatarStyled = styled.div<{ $size: number; $borderColor: string }>`
  width: ${props => props.$size}px;
  height: ${props => props.$size}px;
  min-width: ${props => props.$size}px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${props => props.$size <= 32 ? '0.8rem' : '1rem'};
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.4), rgba(59, 130, 246, 0.4));
  border: 2px solid ${props => props.$borderColor};
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PersonName = styled.span<{ $compact?: boolean }>`
  font-weight: 500;
  color: white;
  font-size: ${props => props.$compact ? '0.875rem' : '1rem'};
`;

const PersonInfoBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const UnassignedText = styled.span`
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  font-size: 0.875rem;
`;

const RetryButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 10px 24px;
  min-height: 44px;
  min-width: 44px;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: linear-gradient(135deg, #ef4444, #f87171);
  transition: all 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, #dc2626, #ef4444);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

// ===== ANIMATION VARIANTS =====

export const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export const staggeredVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.6,
      ease: "easeOut"
    }
  })
};

export const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
};

// ===== REUSABLE COMPONENTS =====

interface StatsCardProps {
  data: StatsCardData;
  index?: number;
  loading?: boolean;
}

export const StatsCard = memo<StatsCardProps>(({ data, index = 0, loading = false }) => {
  const IconComponent = data.icon;

  return (
    <StellarCard
      $variant={data.variant}
      variants={staggeredVariants}
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.02 }}
    >
      <StatsCardRow>
        <StellarIconContainer $variant={data.variant}>
          <IconComponent size={24} />
        </StellarIconContainer>
        <StatsCardTextBlock>
          <StatsCardValue>
            {loading ? '-' : data.value}
          </StatsCardValue>
          <StatsCardLabel>
            {data.label}
          </StatsCardLabel>
        </StatsCardTextBlock>
      </StatsCardRow>
    </StellarCard>
  );
});

StatsCard.displayName = 'StatsCard';

// Status Chip Component
interface StatusChipProps {
  status: SessionStatus;
  size?: 'small' | 'medium';
}

export const StatusChip = memo<StatusChipProps>(({ status, size = 'small' }) => {
  const getStatusLabel = (status: SessionStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <StellarChipStyled
      $chipStatus={status}
      $size={size}
    >
      {getStatusLabel(status)}
    </StellarChipStyled>
  );
});

StatusChip.displayName = 'StatusChip';

// Client Display Component
interface ClientDisplayProps {
  client: Client | null;
  showSessionCount?: boolean;
  compact?: boolean;
}

export const ClientDisplay = memo<ClientDisplayProps>(({
  client,
  showSessionCount = true,
  compact = false
}) => {
  if (!client) {
    return (
      <UnassignedText>
        No Client Assigned
      </UnassignedText>
    );
  }

  const fullName = `${client.firstName} ${client.lastName}`;
  const avatarSize = compact ? 32 : 40;
  const hasAvailable = (client.availableSessions ?? 0) > 0;

  return (
    <ClientTrainerDisplay>
      <AvatarStyled
        $size={avatarSize}
        $borderColor="rgba(59, 130, 246, 0.3)"
        title={fullName}
      >
        {client.photo
          ? <img src={client.photo} alt={fullName} />
          : <>{client.firstName?.[0]}{client.lastName?.[0]}</>
        }
      </AvatarStyled>
      <PersonInfoBlock>
        <PersonName $compact={compact}>
          {fullName}
        </PersonName>
        {showSessionCount && (
          <SessionCountChip $hasAvailable={hasAvailable}>
            {client.availableSessions ?? 0} sessions
          </SessionCountChip>
        )}
      </PersonInfoBlock>
    </ClientTrainerDisplay>
  );
});

ClientDisplay.displayName = 'ClientDisplay';

// Trainer Display Component
interface TrainerDisplayProps {
  trainer: Trainer | null;
  compact?: boolean;
}

export const TrainerDisplay = memo<TrainerDisplayProps>(({ trainer, compact = false }) => {
  if (!trainer) {
    return (
      <UnassignedText>
        Unassigned
      </UnassignedText>
    );
  }

  const fullName = `${trainer.firstName} ${trainer.lastName}`;
  const avatarSize = compact ? 32 : 40;

  return (
    <ClientTrainerDisplay>
      <AvatarStyled
        $size={avatarSize}
        $borderColor="rgba(14, 165, 233, 0.3)"
        title={fullName}
      >
        {trainer.photo
          ? <img src={trainer.photo} alt={fullName} />
          : <>{trainer.firstName?.[0]}{trainer.lastName?.[0]}</>
        }
      </AvatarStyled>
      <PersonName $compact={compact}>
        {fullName}
      </PersonName>
    </ClientTrainerDisplay>
  );
});

TrainerDisplay.displayName = 'TrainerDisplay';

// Loading State Component
interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export const LoadingState = memo<LoadingStateProps>(({
  message = "Loading...",
  subMessage
}) => (
  <LoadingSpinner>
    <motion.div
      className="spinner"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
    <LoadingMessage>
      {message}
    </LoadingMessage>
    {subMessage && (
      <LoadingSubMessage>
        {subMessage}
      </LoadingSubMessage>
    )}
  </LoadingSpinner>
));

LoadingState.displayName = 'LoadingState';

// Empty State Component
interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export const EmptyState = memo<EmptyStateProps>(({
  icon = "📅",
  title,
  description,
  actionButton
}) => (
  <EmptyStateContainer>
    <div className="icon">{icon}</div>
    <div className="title">{title}</div>
    <div className="description">{description}</div>
    {actionButton && (
      <ActionButtonWrapper>
        {actionButton}
      </ActionButtonWrapper>
    )}
  </EmptyStateContainer>
));

EmptyState.displayName = 'EmptyState';

// Error State Component
interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorState = memo<ErrorStateProps>(({
  error,
  onRetry,
  retryLabel = "Retry"
}) => (
  <EmptyStateContainer>
    <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
    <div className="title" style={{ color: '#ef4444' }}>Error</div>
    <div className="description">{error}</div>
    {onRetry && (
      <RetryButton onClick={onRetry}>
        <RefreshCw size={16} />
        {retryLabel}
      </RetryButton>
    )}
  </EmptyStateContainer>
));

ErrorState.displayName = 'ErrorState';

// Search Container Component
interface SearchContainerProps {
  children: React.ReactNode;
}

export const StellarSearchContainer = memo<SearchContainerProps>(({ children }) => (
  <SearchContainer>
    {children}
  </SearchContainer>
));

StellarSearchContainer.displayName = 'StellarSearchContainer';

// ===== UTILITY FUNCTIONS =====

export const getStatsCardsData = (
  todaySessions: number,
  completedHours: number,
  activeTrainers: number,
  completionRate: number
): StatsCardData[] => [
  {
    value: todaySessions,
    label: 'Sessions Today',
    icon: Calendar,
    variant: 'primary'
  },
  {
    value: completedHours,
    label: 'Hours Completed',
    icon: Clock,
    variant: 'success'
  },
  {
    value: activeTrainers,
    label: 'Active Trainers',
    icon: User,
    variant: 'info'
  },
  {
    value: `${completionRate}%`,
    label: 'Completion Rate',
    icon: CheckCircle,
    variant: 'warning'
  }
];

export const formatSessionTime = (sessionDate: string): { date: string; time: string } => {
  try {
    const date = new Date(sessionDate);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  } catch (error) {
    return { date: 'Invalid Date', time: 'Invalid Time' };
  }
};

// ===== PERFORMANCE OPTIMIZATIONS =====

// Memoized session status colors for consistent theming
export const getStatusColor = memo((status: SessionStatus): string => {
  const colors = {
    available: '#10b981',
    requested: '#f59e0b',
    scheduled: '#3b82f6',
    confirmed: '#0ea5e9',
    completed: '#8b5cf6',
    cancelled: '#ef4444'
  };
  return colors[status] || '#6b7280';
});

getStatusColor.displayName = 'getStatusColor';
