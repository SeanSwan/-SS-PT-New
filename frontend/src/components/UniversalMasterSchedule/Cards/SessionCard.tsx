import React from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';

export interface SessionCardData {
  id: number | string;
  sessionDate: string | Date;
  duration?: number;
  status?: string;
  location?: string;
  clientName?: string;
  trainerName?: string;
  isBlocked?: boolean;
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

const SessionCard: React.FC<SessionCardProps> = ({ session, onClick }) => {
  const sessionDate = new Date(session.sessionDate);
  const isPast = sessionDate < new Date();
  const time = sessionDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  const status = session.isBlocked || session.status === 'blocked'
    ? 'blocked'
    : session.status || 'scheduled';

  // Derive boolean indicators
  const hasReminderSent = session.reminderSent || Boolean(session.reminderSentDate);
  const hasFeedback = session.feedbackProvided || (session.rating != null && session.rating > 0);

  return (
    <CardContainer
      $status={status}
      $isPast={isPast}
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
        {/* Session indicators */}
        <IndicatorContainer>
          {hasReminderSent && (
            <Indicator title="Reminder sent" $type="reminder">📬</Indicator>
          )}
          {hasFeedback && (
            <Indicator title="Feedback provided" $type="feedback">⭐</Indicator>
          )}
        </IndicatorContainer>
      </CardHeader>
      <CardBody>
        <NameText>
          {session.clientName || (status === 'available' ? 'Available Slot' : 'Session')}
        </NameText>
        <MetaText>{session.trainerName || 'Trainer TBD'}</MetaText>
        <MetaText>{session.location || 'Main Studio'}</MetaText>
      </CardBody>
    </CardContainer>
  );
};

export default SessionCard;

const CardContainer = styled.div<{ $status: string; $isPast?: boolean }>`
  background: ${({ $isPast }) => $isPast ? 'rgba(20, 20, 40, 0.3)' : 'rgba(30, 30, 60, 0.4)'};
  border-radius: 12px;
  border: 1px solid ${({ $isPast }) => $isPast ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 255, 255, 0.2)'};
  opacity: ${({ $isPast }) => $isPast ? 0.7 : 1};
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  position: relative;
  overflow: hidden;
  min-height: 44px; /* Touch target */

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
    ${({ $isPast }) => !$isPast && `
      transform: scale(1.02);
      box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
    `}
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
  }

  /* Mobile */
  @media (max-width: 768px) {
    padding: 0.6rem 0.7rem;
    border-radius: 10px;
    gap: 0.35rem;
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

  @media (max-width: 480px) {
    font-size: 0.8rem;
  }
`;

const DurationLabel = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
`;

const IndicatorContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.25rem;
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

  @media (max-width: 480px) {
    font-size: 0.85rem;
  }
`;

const MetaText = styled.span`
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
`;
