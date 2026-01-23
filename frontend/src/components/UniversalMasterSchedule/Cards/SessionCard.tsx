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
}

export interface SessionCardProps {
  session: SessionCardData;
  onClick?: (session: SessionCardData) => void;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, onClick }) => {
  const sessionDate = new Date(session.sessionDate);
  const time = sessionDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });
  const status = session.isBlocked || session.status === 'blocked'
    ? 'blocked'
    : session.status || 'scheduled';

  return (
    <CardContainer
      $status={status}
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

const CardContainer = styled.div<{ $status: string }>`
  background: rgba(30, 30, 60, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 255, 0.2);
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  cursor: pointer;
  transition: all 150ms ease-out;
  position: relative;
  overflow: hidden;

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
    transform: scale(1.02);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }

  &:focus-visible {
    outline: 2px solid ${galaxySwanTheme.primary.main};
    outline-offset: 2px;
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
`;

const DurationLabel = styled.span`
  margin-left: auto;
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
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
`;

const MetaText = styled.span`
  font-size: 0.75rem;
  color: ${galaxySwanTheme.text.secondary};
`;
