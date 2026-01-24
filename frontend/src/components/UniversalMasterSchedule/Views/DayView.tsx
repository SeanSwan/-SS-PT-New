import React, { useMemo } from 'react';
import styled from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { SessionCardData } from '../Cards/SessionCard';
import DraggableSession from '../DragDrop/DraggableSession';
import DroppableSlot from '../DragDrop/DroppableSlot';
import { useAvailableSlots } from '../../../hooks/useTrainerAvailability';

export interface DayViewTrainer {
  id: number | string;
  name: string;
}

export interface DayViewSession extends SessionCardData {
  trainerId?: number | string | null;
}

export interface DayViewProps {
  date: Date;
  sessions: DayViewSession[];
  trainers: DayViewTrainer[];
  enableDrag?: boolean;
  onSelectSession?: (session: DayViewSession) => void;
  onSelectSlot?: (payload: { date: Date; hour: number; trainerId?: number | string }) => void;
}

const HOURS = Array.from({ length: 18 }, (_, index) => 5 + index); // 5am to 10pm

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

const toDaySessions = (sessions: DayViewSession[], date: Date) =>
  sessions.filter((session) => isSameDay(new Date(session.sessionDate), date));

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

// TODO: Optimize - fetch availability once per trainer at DayView level instead of per-cell
const TrainerColumnSlots: React.FC<{
  trainerId: number | string;
  date: Date;
  hour: number;
  children: React.ReactNode;
}> = ({ trainerId, date, hour, children }) => {
  const shouldFetch = trainerId !== 'unassigned';
  const { slots, isLoading } = useAvailableSlots(
    shouldFetch ? trainerId : null,
    date,
    60
  );

  const isAvailable = !shouldFetch || slots.some(slot => {
    const slotDate = new Date(slot.startTime);
    return slotDate.getHours() === hour;
  });

  return (
    <>
      {!isAvailable && !isLoading && <UnavailableOverlay />}
      {children}
    </>
  );
};

const DayView: React.FC<DayViewProps> = ({
  date,
  sessions,
  trainers,
  enableDrag = false,
  onSelectSession,
  onSelectSlot
}) => {
  const sessionsForDay = useMemo(() => toDaySessions(sessions, date), [sessions, date]);
  const trainerList = useMemo(() => {
    if (trainers.length > 0) {
      return trainers;
    }
    return deriveTrainerList(sessionsForDay);
  }, [trainers, sessionsForDay]);

  const columns = trainerList.length > 0
    ? trainerList
    : [{ id: 'unassigned', name: 'All Trainers' }];

  return (
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
          const trainerSessions = sessionsForDay.filter((session) => {
            const sessionHour = new Date(session.sessionDate).getHours();
            const trainerMatch = trainer.id === 'unassigned'
              ? true
              : String(session.trainerId ?? '') === String(trainer.id);
            return sessionHour === hour && trainerMatch;
          });

          if (trainerSessions.length > 0) {
            return (
              <SlotCell key={`${trainer.id}-${hour}`} $hasSession>
                {trainerSessions.map((session) => (
                  <DraggableSession
                    key={String(session.id)}
                    session={session}
                    onClick={() => onSelectSession?.(session)}
                    disabled={
                      !enableDrag
                      || Boolean(session.isBlocked)
                      || session.status === 'blocked'
                      || session.status === 'available'
                      || session.status === 'completed'
                      || session.status === 'cancelled'
                    }
                  />
                ))}
              </SlotCell>
            );
          }

          if (enableDrag) {
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
                <TrainerColumnSlots trainerId={trainer.id} date={date} hour={hour}>
                  <AvailableSlot>
                    <span>Available</span>
                  </AvailableSlot>
                </TrainerColumnSlots>
              </DroppableSlot>
            );
          }

          return (
            <SlotCell
              key={`${trainer.id}-${hour}`}
              onClick={() =>
                onSelectSlot?.({
                  date,
                  hour,
                  trainerId: trainer.id === 'unassigned' ? undefined : trainer.id
                })
              }
            >
              <TrainerColumnSlots trainerId={trainer.id} date={date} hour={hour}>
                <AvailableSlot>
                  <span>Available</span>
                </AvailableSlot>
              </TrainerColumnSlots>
            </SlotCell>
          );
        })}
      </HourRow>
    ))}
  </DayViewContainer>
);
};

export default DayView;

const formatHour = (hour: number) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const DayViewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

const HeaderRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
`;

const TimeHeader = styled.div`
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: ${galaxySwanTheme.text.secondary};
  padding: 0.5rem;
`;

const TrainerHeader = styled.div`
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: ${galaxySwanTheme.background.surface};
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  color: ${galaxySwanTheme.text.primary};
  font-weight: 600;
  text-align: center;
`;

const HourRow = styled.div`
  display: grid;
  grid-template-columns: 90px repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.6rem;
  align-items: stretch;
`;

const TimeCell = styled.div`
  padding: 0.75rem 0.5rem;
  font-size: 0.85rem;
  color: ${galaxySwanTheme.text.secondary};
  text-align: center;
  background: rgba(10, 10, 26, 0.4);
  border-radius: 10px;
  border: 1px solid ${galaxySwanTheme.borders.subtle};
`;

const SlotCell = styled.div<{ $hasSession?: boolean }>`
  position: relative;
  min-height: 80px;
  padding: 0.5rem;
  border-radius: 12px;
  border: 1px dashed ${galaxySwanTheme.primary.main};
  background: ${({ $hasSession }) =>
    $hasSession ? 'transparent' : 'rgba(0, 255, 255, 0.05)'};
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  cursor: ${({ $hasSession }) => ($hasSession ? 'default' : 'pointer')};
  transition: all 150ms ease-out;

  ${({ $hasSession }) =>
    $hasSession &&
    `
      border-style: solid;
      border-color: rgba(255, 255, 255, 0.12);
    `}

  &:hover {
    border-color: ${galaxySwanTheme.primary.main};
    box-shadow: ${galaxySwanTheme.shadows.primaryGlow};
  }
`;

const UnavailableOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    45deg,
    rgba(0, 0, 0, 0.3),
    rgba(0, 0, 0, 0.3) 4px,
    transparent 4px,
    transparent 8px
  );
  pointer-events: none;
  border-radius: 10px;
  z-index: 1;
`;

const AvailableSlot = styled.div`
  border-radius: 10px;
  border: 1px dashed ${galaxySwanTheme.primary.main};
  padding: 0.5rem;
  text-align: center;
  color: ${galaxySwanTheme.primary.main};
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;
