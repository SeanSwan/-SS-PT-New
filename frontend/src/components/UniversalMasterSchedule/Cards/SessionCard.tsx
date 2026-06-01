import React, { memo } from 'react';
import { schedulePerf } from '../../../utils/schedulePerformance';
import { isNonDeductingClientSource } from '../../DashBoard/workspaces/clients-team/clientSessionSignal';
import {
  CardBody,
  CardContainer,
  CardHeader,
  DurationLabel,
  Indicator,
  IndicatorContainer,
  LiteCardContainer,
  MetaText,
  NameText,
  PackageInfo,
  SessionsBadge,
  StatusDot,
  TimeLabel,
} from './SessionCard.styles';

export interface SessionCardData {
  id: number | string;
  sessionDate: string | Date;
  duration?: number;
  status?: string;
  location?: string;
  clientName?: string;
  trainerName?: string;
  clientSource?: string | null;
  isBlocked?: boolean;
  clientAvailableSessions?: number;
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
  const isFreeTrackingClient = isNonDeductingClientSource(session.clientSource);

  // Lite mode: render minimal card
  if (schedulePerf.DISABLE_SESSION_RENDER) {
    return (
      <LiteCardContainer $status={status} onClick={() => onClick?.(session)}>
        <TimeLabel>{time}</TimeLabel>
        <NameText>{session.clientName || 'Session'}</NameText>
      </LiteCardContainer>
    );
  }

  const sessionsLeft = isFreeTrackingClient
    ? null
    : session.packageInfo?.sessionsRemaining ?? session.clientAvailableSessions;

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
      {/* Sessions remaining badge - top right corner */}
      {sessionsLeft != null && !schedulePerf.DISABLE_SESSION_BADGES && (
        <SessionsBadge
          $low={sessionsLeft <= 3}
          title={`${sessionsLeft} session${sessionsLeft !== 1 ? 's' : ''} remaining`}
        >
          {sessionsLeft}
        </SessionsBadge>
      )}
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
        {!schedulePerf.DISABLE_SESSION_BADGES && !isFreeTrackingClient && session.packageInfo && (
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
// Comparator covers ALL rendered fields to prevent stale data bugs
// (e.g., packageInfo.sessionsRemaining can change independently of status)
const SessionCard = memo(SessionCardComponent, (prevProps, nextProps) => {
  const prevS = prevProps.session;
  const nextS = nextProps.session;
  return (
    // Core identity
    prevS.id === nextS.id &&
    prevS.status === nextS.status &&
    prevS.sessionDate === nextS.sessionDate &&
    prevS.isBlocked === nextS.isBlocked &&
    // Rendered text fields
    prevS.clientName === nextS.clientName &&
    prevS.trainerName === nextS.trainerName &&
    prevS.duration === nextS.duration &&
    prevS.location === nextS.location &&
    // Package info & session balance (can change independently when user buys sessions)
    prevS.clientAvailableSessions === nextS.clientAvailableSessions &&
    prevS.packageInfo?.name === nextS.packageInfo?.name &&
    prevS.packageInfo?.sessionsRemaining === nextS.packageInfo?.sessionsRemaining &&
    prevS.packageInfo?.sessionsTotal === nextS.packageInfo?.sessionsTotal &&
    // Indicator fields (shown on desktop)
    prevS.reminderSent === nextS.reminderSent &&
    prevS.reminderSentDate === nextS.reminderSentDate &&
    prevS.feedbackProvided === nextS.feedbackProvided &&
    prevS.rating === nextS.rating &&
    // Handler reference
    prevProps.onClick === nextProps.onClick
  );
});

export default SessionCard;
