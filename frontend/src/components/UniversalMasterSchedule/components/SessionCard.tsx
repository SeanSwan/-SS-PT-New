/**
 * SessionCard — Individual session display for ClientTimeline and BookingDrawer.
 * Crystalline Swan Cosmic theme with glassmorphism.
 * Per Gemini 3.1 Pro design authority.
 */

import React from 'react';
import { Clock, MapPin, User, Calendar, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import {
  BookButton,
  CardContent,
  CardWrapper,
  DateText,
  JoinButton,
  MetaItem,
  MetaRow,
  PersonRow,
  SESSION_CARD_TOKENS,
  StatusBadge,
  StatusBar,
  TimeBlock,
  TimeText,
  TopRow,
} from './SessionCard.styles';

const STATUS_COLORS: Record<string, string> = {
  available: SESSION_CARD_TOKENS.swanCyan,
  scheduled: SESSION_CARD_TOKENS.cosmicPurple,
  confirmed: SESSION_CARD_TOKENS.successGreen,
  completed: 'var(--text-subtle, #6b7280)',
  cancelled: SESSION_CARD_TOKENS.dangerRed,
  blocked: SESSION_CARD_TOKENS.warningAmber,
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
  const statusColor = STATUS_COLORS[session.status] || SESSION_CARD_TOKENS.mutedText;
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
      $interactive={Boolean(onSelect)}
      type="button"
      disabled={!onSelect}
      aria-label={`Select ${session.status} session on ${dateStr} at ${timeStr}`}
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
            whileTap={{ scale: 0.97 }}
          >
            Book Session
          </BookButton>
        )}

        {isSoon && session.status === 'confirmed' && (
          <JoinButton
            onClick={(e) => e.stopPropagation()}
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
