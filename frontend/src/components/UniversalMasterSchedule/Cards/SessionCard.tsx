import React, { memo } from 'react';
import styled, { css } from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { schedulePerf } from '../../../utils/schedulePerformance';

export interface SessionCardData {
  id: number | string;
  sessionDate: string | Date;
  duration?: number;
  status?: string;
  location?: string;
  clientName?: string;
  trainerName?: string;
  isBlocked?: boolean;
  packageInfo?: {
    name: string;
    sessionsRemaining?: number;
    sessionsTotal?: number | null;
    purchasedAt?: string | Date | null;
  };
  // Reminder and feedback indicators
  reminderSent?: boolean;
  reminderSentDate?: string | null; // API returns date, we derive boolean
  feedbackProvided?: boolean;
  rating?: number | null;
}

export interface SessionCardProps {
  session: SessionCardData;
  onClick?: (session: SessionCardData) => void;
}

const SessionCardComponent: React.FC<SessionCardProps> = ({ session, onClick }) => {
  const sessionDate = new Date(session.sessionDate);
  const isPast = sessionDate < new Date();
  const time = sessionDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  const status = session.isBlocked || session.status === 'blocked'
    ? 'blocked'
    : session.status || 'scheduled';

  // Derive boolean indicators - skip on mobile lite mode for perf
  const hasReminderSent = !schedulePerf.MOBILE_LITE_MODE && (session.reminderSent || Boolean(session.reminderSentDate));
  const hasFeedback = !schedulePerf.MOBILE_LITE_MODE && (session.feedbackProvided || (session.rating != null && session.rating > 0));

  // Lite mode: render minimal card
  if (schedulePerf.DISABLE_SESSION_RENDER) {
    return (
      <LiteCardContainer $status={status} onClick={() => onClick?.(session)}>
        <TimeLabel>{time}</TimeLabel>
        <NameText>{session.clientName || 'Session'}</NameText>
      </LiteCardContainer>
    );
  }

  return (
    <CardContainer
      $status={status}
      $isPast={isPast}
      $liteMode={schedulePerf.MOBILE_LITE_MODE}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(session)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.(session);
        }
      }}
      aria-label={`Session ${status} at ${time}`}
    >
      <CardHeader>
        <StatusDot $status={status} />
        <TimeLabel>{time}</TimeLabel>
        <DurationLabel>{session.duration ? `${session.duration} min` : ''}</DurationLabel>
        {/* Session indicators - hidden in lite mode */}
        {!schedulePerf.DISABLE_SESSION_BADGES && (
          <IndicatorContainer>
            {hasReminderSent && (
              <Indicator title="Reminder sent" $type="reminder">📬</Indicator>
            )}
            {hasFeedback && (
              <Indicator title="Feedback provided" $type="feedback">⭐</Indicator>
            )}
          </IndicatorContainer>
        )}
      </CardHeader>
      <CardBody>
        <NameText>
          {session.clientName || (status === 'available' ? 'Available Slot' : 'Session')}
        </NameText>
        <MetaText>{session.trainerName || 'Trainer TBD'}</MetaText>
        <MetaText>{session.location || 'Main Studio'}</MetaText>
        {!schedulePerf.DISABLE_SESSION_BADGES && session.packageInfo && (
          <PackageInfo>
            {session.packageInfo.name}
            {session.packageInfo.sessionsTotal != null
              ? ` (${Math.max(0, session.packageInfo.sessionsRemaining ?? 0)} left)`
              : ' (Unlimited)'}
          </PackageInfo>
        )}
      </CardBody>
    </CardContainer>
  );
};

// Memoize to prevent unnecessary re-renders during scroll
const SessionCard = memo(SessionCardComponent, (prevProps, nextProps) => {
  // Only re-render if session data actually changed
  // Include onClick reference to prevent stale closure bugs
  return (
    prevProps.session.id === nextProps.session.id &&
    prevProps.session.status === nextProps.session.status &&
    prevProps.session.clientName === nextProps.session.clientName &&
    prevProps.session.sessionDate === nextProps.session.sessionDate &&
    prevProps.onClick === nextProps.onClick
  );
});

export default SessionCard;

// Lite mode card for performance testing
const LiteCardContainer = styled.div<{ $status: string }>`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 8px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  cursor: pointer;
  min-height: 44px;
`;

// Mobile lite mode optimizations
const mobileOptimizations = css`
  /* Disable expensive transforms and shadows on mobile */
  @media (max-width: 768px) {
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }
`;

const CardContainer = styled.div<{ $status: string; $isPast?: boolean; $liteMode?: boolean }>`
  background: ${({ $isPast }) => $isPast ? 'rgba(20, 20, 40, 0.3)' : 'rgba(30, 30, 60, 0.4)'};
  border-radius: 12px;
  border: 1px solid ${({ $isPast }) => $isPast ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 255, 255, 0.2)'};
  opacity: ${({ $isPast }) => $isPast ? 0.7 : 1};
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: ${({ $liteMode }) => $liteMode ? 'none' : 'all 150ms ease-out'};
  position: relative;
  overflow: hidden;
  min-height: 44px; /* Touch target */
  min-width: 0;
  /* NOTE: GPU layer promotion removed - should only be on scroll containers, not individual cards */

  ${({ $status }) =>
    $status === 'blocked' &&
    `
      border-color: rgba(120, 81, 169, 0.5);
      background: rgba(30, 30, 60, 0.25);
      background-image: repeating-linear-gradient(
        45deg,
        rgba(120, 81, 169, 0.25),
        rgba(120, 81, 169, 0.25) 6px,
        rgba(10, 10, 26, 0.2) 6px,
        rgba(10, 10, 26, 0.2) 12px
      );
    `}

  &:hover {
    ${({ $isPast, $liteMode }) => !$isPast && !$liteMode && `
      transform: scale(1.02);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    `}
  }

  &:active {
    ${({ $liteMode }) => !$liteMode && `transform: scale(0.98);`}
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    gap: 0.35rem;
    /* Disable transforms on mobile for better scroll */
    transition: none;

    &:hover {
      transform: none;
      box-shadow: none;
    }

    &:active {
      transform: none;
    }
  }

  @media (max-width: 480px) {
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    gap: 0.3rem;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;

  @media (max-width: 480px) {
    flex-wrap: wrap;
    row-gap: 0.25rem;
  }
`;

const StatusDot = styled.span<{ $status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $status }) => {
    switch ($status) {
      case 'confirmed':
        return '#00FF88';
      case 'completed':
        return 'rgba(255, 255, 255, 0.5)';
      case 'cancelled':
        return '#FF4757';
      case 'blocked':
        return galaxySwanTheme.secondary.main;
      default:
        return galaxySwanTheme.primary.main;
    }
  }};
  box-shadow: 0 0 8px currentColor;
`;

const TimeLabel = styled.span`
  font-size: 0.85rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const DurationLabel = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
  word-break: break-word;
`;

const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
  flex-shrink: 0;
`;

const Indicator = styled.span<{ $type: 'reminder' | 'feedback' }>`
  font-size: 0.7rem;
  opacity: 0.9;
  cursor: help;
  transition: transform 0.15s ease;

  &:hover {
    transform: scale(1.2);
  }
`;

const CardBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

const NameText = styled.span`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const MetaText = styled.span`
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
  word-break: break-word;
`;

const PackageInfo = styled.span`
  font-size: 0.625rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

