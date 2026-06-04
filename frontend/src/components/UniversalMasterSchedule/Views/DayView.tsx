import React, { useMemo, memo } from 'react';
import BufferZone from '../Cards/BufferZone';
import DraggableSession from '../DragDrop/DraggableSession';
import DroppableSlot from '../DragDrop/DroppableSlot';
import { schedulePerf, trackRender } from '../../../utils/schedulePerformance';
import type { DayViewProps, DayViewSession, DayViewTrainer } from './DayView.types';
import {
  formatScheduleSlotTime,
  getScheduleSlotMinuteFromOffset,
} from '../utils/scheduleTimeSlots';
import {
  AvailableSlot,
  DayViewContainer,
  DayViewWrapper,
  HeaderRow,
  HourRow,
  ScheduledOverlay,
  SlotCell,
  TimeCell,
  TimeHeader,
  TrainerHeader,
} from './DayView.styles';

export type { DayViewProps, DayViewSession, DayViewTrainer } from './DayView.types';

const HOURS = Array.from({ length: 18 }, (_, index) => 5 + index); // 5am to 10pm
const PIXELS_PER_HOUR = 80;

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const isPastTime = (date: Date, hour: number, minute = 0) => {
  const now = new Date();
  const slotDate = new Date(date);
  slotDate.setHours(hour, minute, 0, 0);
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
                onClick={(event) =>
                  onSelectSlot?.({
                    date,
                    hour,
                    minute: getScheduleSlotMinuteFromOffset(event.nativeEvent.offsetY, event.currentTarget.clientHeight),
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
                  minute: 0,
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

const formatHour = (hour: number) => formatScheduleSlotTime(hour, 0);
