import React, { useMemo, memo } from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { SessionCardData } from '../Cards/SessionCard';
import BufferZone from '../Cards/BufferZone';
import DraggableSession from '../DragDrop/DraggableSession';
import DroppableSlot from '../DragDrop/DroppableSlot';
import { schedulePerf, trackRender } from '../../../utils/schedulePerformance';

export interface DayViewTrainer {
  id: number | string;
  name: string;
}

export interface DayViewSession extends SessionCardData {
  trainerId?: number | string | null;
  reminderSentDate?: string | null;
  rating?: number | null;
  bufferBefore?: number;
  bufferAfter?: number;
}

export interface DayViewProps {
  date: Date;
  sessions: DayViewSession[];
  trainers: DayViewTrainer[];
  enableDrag?: boolean;
  isAdmin?: boolean; // Allow admin to schedule in past slots
  onSelectSession?: (session: DayViewSession) => void;
  onSelectSlot?: (payload: { date: Date; hour: number; trainerId?: number | string }) => void;
}

const HOURS = Array.from({ length: 18 }, (_, index) => 5 + index); // 5am to 10pm
const PIXELS_PER_HOUR = 80;

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const isPastTime = (date: Date, hour: number) => {
  const now = new Date();
  const slotDate = new Date(date);
  slotDate.setHours(hour, 0, 0, 0);
  return slotDate < now;
};

/**
 * Filter sessions for the given day, excluding cancelled sessions
 * Cancelled sessions should not appear on the schedule - they go to the cancellation log
 */
const toDaySessions = (sessions: DayViewSession[], date: Date) =>
  sessions.filter((session) =>
    isSameDay(new Date(session.sessionDate), date) &&
    session.status !== 'cancelled'
  );

const deriveTrainerList = (sessions: DayViewSession[]) => {
  const trainerMap = new Map<string, DayViewTrainer>();

  sessions.forEach((session) => {
    if (!session.trainerId && !session.trainerName) {
      return;
    }

    const id = session.trainerId ?? session.trainerName ?? 'trainer';
    const key = String(id);
    if (!trainerMap.has(key)) {
      trainerMap.set(key, {
        id,
        name: session.trainerName || `Trainer ${key}`
      });
    }
  });

  return Array.from(trainerMap.values());
};

/**
 * Check if a session is "scheduled" (not available) - meaning the slot is taken
 * Scheduled sessions: booked, scheduled, confirmed, completed
 * Available sessions: available status
 */
const isScheduledSession = (session: DayViewSession) => {
  return session.status !== 'available' && session.status !== 'cancelled';
};

const DayViewComponent: React.FC<DayViewProps> = ({
  date,
  sessions,
  trainers,
  enableDrag = false,
  isAdmin = false,
  onSelectSession,
  onSelectSlot
}) => {
  // DEV: Track render counts
  if (schedulePerf.IS_DEV) {
    trackRender('DayView');
  }

  // Apply session limiting for performance testing
  const limitedSessions = useMemo(() => {
    const limit = schedulePerf.LIMIT_SESSIONS;
    if (limit > 0) {
      return sessions.slice(0, limit);
    }
    return sessions;
  }, [sessions]);

  const sessionsForDay = useMemo(() => toDaySessions(limitedSessions, date), [limitedSessions, date]);
  const trainerList = useMemo(() => {
    if (trainers.length > 0) {
      return trainers;
    }
    return deriveTrainerList(sessionsForDay);
  }, [trainers, sessionsForDay]);

  // O(1) lookup: Pre-index sessions by trainerId+hour for faster rendering
  const sessionsBySlot = useMemo(() => {
    const map = new Map<string, DayViewSession[]>();

    sessionsForDay.forEach((session) => {
      const sessionHour = new Date(session.sessionDate).getHours();
      const trainerId = String(session.trainerId ?? 'unassigned');
      const key = `${trainerId}-${sessionHour}`;

      const existing = map.get(key) || [];
      existing.push(session);
      map.set(key, existing);

      // Also add to 'unassigned' key for "All Trainers" column
      const unassignedKey = `unassigned-${sessionHour}`;
      const unassignedExisting = map.get(unassignedKey) || [];
      unassignedExisting.push(session);
      map.set(unassignedKey, unassignedExisting);
    });

    return map;
  }, [sessionsForDay]);

  const columns = trainerList.length > 0
    ? trainerList
    : [{ id: 'unassigned', name: 'All Trainers' }];

  // Mobile lite mode: disable drag-drop for better scroll performance
  const effectiveEnableDrag = enableDrag && !schedulePerf.DISABLE_DRAG_DROP;

  return (
    <DayViewWrapper>
      <DayViewContainer>
        <HeaderRow>
          <TimeHeader>Time</TimeHeader>
          {columns.map((trainer) => (
            <TrainerHeader key={String(trainer.id)}>
              {trainer.name}
            </TrainerHeader>
          ))}
        </HeaderRow>

        {HOURS.map((hour) => (
          <HourRow key={hour}>
            <TimeCell>{formatHour(hour)}</TimeCell>
            {columns.map((trainer) => {
          // O(1) lookup using pre-indexed Map instead of O(n) filter
          const slotKey = `${String(trainer.id)}-${hour}`;
          const trainerSessions = sessionsBySlot.get(slotKey) || [];

          // Check if any session in this slot is scheduled (not available)
          const hasScheduledSession = trainerSessions.some(isScheduledSession);
          const isPast = isPastTime(date, hour);

          if (trainerSessions.length > 0) {
            return (
              <SlotCell
                key={`${trainer.id}-${hour}`}
                $hasSession
                $isPast={isPast}
                $isScheduled={hasScheduledSession}
              >
                {/* Show overlay only for scheduled (booked/confirmed) sessions */}
                {hasScheduledSession && <ScheduledOverlay />}
                {trainerSessions.map((session) => {
                  const bufferBefore = Number(session.bufferBefore || 0);
                  const bufferAfter = Number(session.bufferAfter || 0);
                  const sessionStart = new Date(session.sessionDate);

                  return (
                    <React.Fragment key={String(session.id)}>
                      {bufferBefore > 0 && (
                        <BufferZone
                          startTime={sessionStart}
                          durationMinutes={bufferBefore}
                          type="before"
                          pixelsPerHour={PIXELS_PER_HOUR}
                        />
                      )}
                      <DraggableSession
                        session={session}
                        onSelectSession={onSelectSession}
                        disabled={
                          !effectiveEnableDrag
                          || Boolean(session.isBlocked)
                          || session.status === 'blocked'
                          || session.status === 'available'
                          || session.status === 'completed'
                          || session.status === 'cancelled'
                        }
                      />
                      {bufferAfter > 0 && (
                        <BufferZone
                          startTime={sessionStart}
                          durationMinutes={bufferAfter}
                          type="after"
                          pixelsPerHour={PIXELS_PER_HOUR}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </SlotCell>
            );
          }

          // Empty slot - no sessions
          // Admin can access past slots, regular users cannot
          const canAccessSlot = !isPast || isAdmin;

          if (effectiveEnableDrag && canAccessSlot) {
            return (
              <DroppableSlot
                key={`${trainer.id}-${hour}`}
                id={`slot-${trainer.id}-${hour}`}
                date={date}
                hour={hour}
                trainerId={trainer.id === 'unassigned' ? undefined : trainer.id}
                onClick={() =>
                  onSelectSlot?.({
                    date,
                    hour,
                    trainerId: trainer.id === 'unassigned' ? undefined : trainer.id
                  })
                }
              >
                <AvailableSlot $isPast={isPast} $isAdminPast={isPast && isAdmin}>
                  <span>{isPast ? 'Past (Admin)' : 'Available'}</span>
                </AvailableSlot>
              </DroppableSlot>
            );
          }

          return (
            <SlotCell
              key={`${trainer.id}-${hour}`}
              $isPast={isPast}
              $isAdminAccessible={isPast && isAdmin}
              onClick={() => {
                if (!canAccessSlot) return;
                onSelectSlot?.({
                  date,
                  hour,
                  trainerId: trainer.id === 'unassigned' ? undefined : trainer.id
                })
              }}
            >
              <AvailableSlot $isPast={isPast} $isAdminPast={isPast && isAdmin}>
                <span>{isPast ? (isAdmin ? 'Past (Admin)' : 'Past') : 'Available'}</span>
              </AvailableSlot>
            </SlotCell>
          );
            })} 
          </HourRow>
        ))}
      </DayViewContainer>
    </DayViewWrapper>
  );
};

// Memoize DayView to prevent unnecessary re-renders during parent state changes
const DayView = memo(DayViewComponent, (prevProps, nextProps) => {
  // Only re-render if meaningful props change
  // Include callback references to prevent stale closure bugs
  return (
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.sessions === nextProps.sessions &&
    prevProps.trainers === nextProps.trainers &&
    prevProps.enableDrag === nextProps.enableDrag &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.onSelectSession === nextProps.onSelectSession &&
    prevProps.onSelectSlot === nextProps.onSelectSlot
  );
});

export default DayView;

const formatHour = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const DayViewWrapper = styled.div`
  width: 100%;

  @media (max-width: 768px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.75rem;
  }
`;

const DayViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;

  @media (max-width: 768px) {
    gap: 0.5rem;
    min-width: max-content;
  }

  @media (max-width: 480px) {
    gap: 0.4rem;
  }
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;

  /* Tablet */
  @media (max-width: 1024px) {
    grid-template-columns: 70px repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    grid-template-columns: 60px repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.4rem;
    min-width: max-content;
  }

  @media (max-width: 480px) {
    grid-template-columns: 50px repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.35rem;
  }
`;

const TimeHeader = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${galaxySwanTheme.text.secondary};
  padding: 0.5rem;

  @media (max-width: 768px) {
    font-size: 0.7rem;
    padding: 0.375rem;
  }

  @media (max-width: 480px) {
    font-size: 0.65rem;
    padding: 0.25rem;
    letter-spacing: 0.08em;
  }
`;

const TrainerHeader = styled.div`
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: ${galaxySwanTheme.background.surface};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  color: ${galaxySwanTheme.text.primary};
  font-weight: 600;
  text-align: center;

  @media (max-width: 768px) {
    padding: 0.5rem 0.5rem;
    font-size: 0.85rem;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    padding: 0.4rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 6px;
  }
`;

const HourRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
  align-items: stretch;

  /* Tablet */
  @media (max-width: 1024px) {
    grid-template-columns: 70px repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.5rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    grid-template-columns: 60px repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.4rem;
    min-width: max-content;
  }

  @media (max-width: 480px) {
    grid-template-columns: 50px repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.35rem;
  }
`;

const TimeCell = styled.div`
  padding: 0.75rem 0.5rem;
  font-size: 0.85rem;
  color: ${galaxySwanTheme.text.secondary};
  text-align: center;
  background: rgba(10, 10, 26, 0.4);
  border-radius: 10px;
  border: 1px solid ${galaxySwanTheme.borders.subtle};

  @media (max-width: 768px) {
    padding: 0.5rem 0.375rem;
    font-size: 0.75rem;
    border-radius: 8px;
  }

  @media (max-width: 480px) {
    padding: 0.375rem 0.25rem;
    font-size: 0.7rem;
    border-radius: 6px;
  }
`;

const SlotCell = styled.div<{ $hasSession?: boolean; $isPast?: boolean; $isScheduled?: boolean; $isAdminAccessible?: boolean }>`
  position: relative;
  min-height: 80px;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px dashed ${({ $isPast, $isScheduled, $isAdminAccessible }) => {
    if ($isScheduled) return galaxySwanTheme.primary.main;
    if ($isAdminAccessible) return '#f59e0b'; // Orange for admin-accessible past slots
    if ($isPast) return 'rgba(255, 255, 255, 0.1)';
    return galaxySwanTheme.primary.main;
  }};
  background: ${({ $hasSession, $isPast, $isScheduled, $isAdminAccessible }) => {
    if ($isScheduled) return 'rgba(0, 128, 128, 0.15)'; // Teal background for scheduled
    if ($hasSession) return 'transparent';
    if ($isAdminAccessible) return 'rgba(245, 158, 11, 0.1)'; // Light orange for admin past slots
    if ($isPast) return 'rgba(255, 255, 255, 0.02)';
    return 'rgba(0, 255, 255, 0.05)';
  }};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: ${({ $hasSession, $isPast, $isAdminAccessible }) => ($hasSession || ($isPast && !$isAdminAccessible) ? 'default' : 'pointer')};
  transition: all 150ms ease-out;
  opacity: ${({ $isPast, $isAdminAccessible }) => ($isPast && !$isAdminAccessible) ? 0.6 : ($isPast ? 0.8 : 1)};
  pointer-events: ${({ $isPast, $hasSession, $isAdminAccessible }) => (($isPast && !$isAdminAccessible) && !$hasSession ? 'none' : 'auto')};

  ${({ $hasSession, $isScheduled }) =>
    $hasSession &&
    `
      border-style: solid;
      border-color: ${$isScheduled ? 'rgba(0, 128, 128, 0.5)' : 'rgba(255, 255, 255, 0.12)'};
    `}

  &:hover {
    ${({ $isPast, $hasSession }) => !$isPast && !($hasSession) && `
      border-color: ${galaxySwanTheme.primary.main};
      box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
    `}
  }

  &:active {
    transform: scale(0.99);
  }

  @media (max-width: 768px) {
    min-height: 70px;
    padding: 0.4rem;
    border-radius: 10px;
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    min-height: 60px;
    padding: 0.3rem;
    border-radius: 8px;
    gap: 0.3rem;
  }
`;

/**
 * Overlay shown ONLY for scheduled sessions (booked/confirmed/completed)
 * This indicates the time slot is taken
 */
const ScheduledOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(0, 128, 128, 0.2) 0%,
    rgba(0, 128, 128, 0.1) 100%
  );
  pointer-events: none;
  border-radius: 10px;
  z-index: 1;
`;

const AvailableSlot = styled.div<{ $isPast?: boolean; $isAdminPast?: boolean }>`
  border-radius: 10px;
  border: 1px dashed ${({ $isPast, $isAdminPast }) => {
    if ($isAdminPast) return '#f59e0b'; // Orange for admin past slots
    if ($isPast) return 'rgba(255, 255, 255, 0.1)';
    return galaxySwanTheme.primary.main;
  }};
  padding: 0.5rem;
  text-align: center;
  color: ${({ $isPast, $isAdminPast }) => {
    if ($isAdminPast) return '#f59e0b'; // Orange for admin past slots
    if ($isPast) return 'rgba(255, 255, 255, 0.3)';
    return galaxySwanTheme.primary.main;
  }};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

