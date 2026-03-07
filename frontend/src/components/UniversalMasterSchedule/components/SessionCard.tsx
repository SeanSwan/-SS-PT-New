/**
 * SessionCard — Individual session display for ClientTimeline and BookingDrawer.
 * Galaxy-Swan Cosmic theme with glassmorphism.
 * Per Gemini 3.1 Pro design authority.
 */

import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { Clock, MapPin, User, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const TOKENS = {
  surfaceGlass: 'rgba(10, 10, 26, 0.6)',
  elevatedGlass: 'rgba(30, 30, 50, 0.7)',
  swanCyan: '#00FFFF',
  cosmicPurple: '#7851A9',
  deepSpace: '#0A0A1A',
  stellarWhite: '#f0f0ff',
  mutedText: '#8892b0',
  successGreen: '#10b981',
  dangerRed: '#ef4444',
  warningAmber: '#f59e0b',
  glassStroke: 'rgba(0, 255, 255, 0.1)',
  purpleStroke: 'rgba(120, 81, 169, 0.3)',
};

const STATUS_COLORS: Record<string, string> = {
  available: TOKENS.swanCyan,
  scheduled: TOKENS.cosmicPurple,
  confirmed: TOKENS.successGreen,
  completed: '#6b7280',
  cancelled: TOKENS.dangerRed,
  blocked: TOKENS.warningAmber,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  available: <Clock size={14} />,
  scheduled: <Calendar size={14} />,
  confirmed: <CheckCircle size={14} />,
  cancelled: <XCircle size={14} />,
  blocked: <AlertTriangle size={14} />,
};

export interface SessionCardSession {
  id: number | string;
  sessionDate: string;
  endDate?: string;
  duration?: number;
  status: string;
  location?: string;
  notes?: string;
  trainer?: { firstName?: string; lastName?: string } | null;
  trainerId?: number | string;
  client?: { firstName?: string; lastName?: string } | null;
  userId?: number | string;
  trainerName?: string;
  clientName?: string;
}

interface SessionCardProps {
  session: SessionCardSession;
  variant?: 'timeline' | 'compact' | 'booking';
  onBook?: (session: SessionCardSession) => void;
  onSelect?: (session: SessionCardSession) => void;
  showTrainer?: boolean;
  showClient?: boolean;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  variant = 'timeline',
  onBook,
  onSelect,
  showTrainer = true,
  showClient = false,
}) => {
  const statusColor = STATUS_COLORS[session.status] || TOKENS.mutedText;
  const startDate = new Date(session.sessionDate);
  const isToday = new Date().toDateString() === startDate.toDateString();
  const isSoon = startDate.getTime() - Date.now() < 60 * 60 * 1000 && startDate.getTime() > Date.now();

  const trainerName = session.trainerName
    || (session.trainer ? `${session.trainer.firstName || ''} ${session.trainer.lastName || ''}`.trim() : null);
  const clientName = session.clientName
    || (session.client ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim() : null);

  const timeStr = startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = startDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <CardWrapper
      $statusColor={statusColor}
      $variant={variant}
      $isSoon={isSoon}
      onClick={() => onSelect?.(session)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      layout
    >
      <StatusBar $color={statusColor} />

      <CardContent>
        <TopRow>
          <TimeBlock>
            <TimeText>{timeStr}</TimeText>
            {variant !== 'compact' && <DateText $isToday={isToday}>{isToday ? 'Today' : dateStr}</DateText>}
          </TimeBlock>

          <StatusBadge $color={statusColor}>
            {STATUS_ICONS[session.status]}
            {session.status}
          </StatusBadge>
        </TopRow>

        {(session.duration || session.location) && (
          <MetaRow>
            {session.duration && (
              <MetaItem>
                <Clock size={12} />
                {session.duration} min
              </MetaItem>
            )}
            {session.location && (
              <MetaItem>
                <MapPin size={12} />
                {session.location}
              </MetaItem>
            )}
          </MetaRow>
        )}

        {showTrainer && trainerName && (
          <PersonRow>
            <User size={12} />
            <span>with <strong>{trainerName}</strong></span>
          </PersonRow>
        )}

        {showClient && clientName && (
          <PersonRow>
            <User size={12} />
            <span>Client: <strong>{clientName}</strong></span>
          </PersonRow>
        )}

        {session.status === 'available' && onBook && (
          <BookButton
            onClick={(e) => { e.stopPropagation(); onBook(session); }}
            whileHover={{ boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)' }}
            whileTap={{ scale: 0.97 }}
          >
            Book Session
          </BookButton>
        )}

        {isSoon && session.status === 'confirmed' && (
          <JoinButton
            onClick={(e) => e.stopPropagation()}
            whileHover={{ boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)' }}
            whileTap={{ scale: 0.97 }}
          >
            Join Virtual Studio
          </JoinButton>
        )}
      </CardContent>
    </CardWrapper>
  );
};

export default SessionCard;

// ---- Styled Components ----

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 255, 0.3); }
  50% { box-shadow: 0 0 12px 4px rgba(0, 255, 255, 0.15); }
`;

const CardWrapper = styled(motion.div)<{ $statusColor: string; $variant: string; $isSoon: boolean }>`
  position: relative;
  background: ${TOKENS.elevatedGlass};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${TOKENS.purpleStroke};
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);

  ${p => p.$isSoon && css`
    animation: ${pulseGlow} 2s ease-in-out infinite;
    border-color: ${TOKENS.swanCyan};
  `}

  &:hover {
    border-color: ${p => p.$statusColor}60;
  }

  ${p => p.$variant === 'compact' && css`
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  `}
`;

const StatusBar = styled.div<{ $color: string }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: ${p => p.$color};
  opacity: 0.8;
`;

const CardContent = styled.div`
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const TimeBlock = styled.div`
  display: flex;
  flex-direction: column;
`;

const TimeText = styled.span`
  font-size: 20px;
  font-weight: 700;
  color: ${TOKENS.stellarWhite};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.5px;
`;

const DateText = styled.span<{ $isToday: boolean }>`
  font-size: 13px;
  font-weight: 500;
  color: ${p => p.$isToday ? TOKENS.swanCyan : TOKENS.mutedText};
`;

const StatusBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${p => p.$color};
  background: ${p => p.$color}15;
  border: 1px solid ${p => p.$color}30;
`;

const MetaRow = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

const MetaItem = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${TOKENS.mutedText};
`;

const PersonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${TOKENS.mutedText};

  strong {
    color: ${TOKENS.stellarWhite};
    font-weight: 600;
  }
`;

const BookButton = styled(motion.button)`
  margin-top: 4px;
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #00FFFF 0%, #0088FF 100%);
  color: ${TOKENS.deepSpace};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  min-height: 44px;
  letter-spacing: 0.5px;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);
`;

const JoinButton = styled(motion.button)`
  margin-top: 4px;
  padding: 12px 24px;
  border: 2px solid ${TOKENS.swanCyan};
  border-radius: 8px;
  background: rgba(0, 255, 255, 0.1);
  color: ${TOKENS.swanCyan};
  font-weight: 700;
  font-size: 15px;
  cursor: pointer;
  min-height: 48px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: all 0.2s;
`;
