import React, { useMemo, memo } from 'react';
import styled from 'styled-components';
import MonthView from '../Views/MonthView';
import DayView from '../Views/DayView';
import DayViewStacked from '../Views/DayViewStacked';
import AgendaView from '../Views/AgendaView';
import SessionCard from '../Cards/SessionCard';
import DragDropManager from '../DragDrop/DragDropManager';
import {
  PrimaryHeading,
  Caption,
  Card
} from '../ui';
import { CalendarView } from '../types';
import type { LayoutMode, DensityMode } from '../types';
import { schedulePerf, trackRender } from '../../../utils/schedulePerformance';

interface ScheduleCalendarProps {
  activeView: CalendarView;
  currentDate: Date;
  sessions: any[];
  trainers: any[];
  canReschedule: boolean;
  canQuickBook: boolean;
  isAdmin?: boolean; // Allow admin to schedule in past slots
  onDrillDown: (day: Date) => void;
  onSelectSession: (session: any) => void;
  onSelectSlot: (slot: any) => void;
  onBookingDialog: (session: any) => void;
  checkConflicts: (sessionId: any, newDate: Date, newHour: number, trainerId?: any) => Promise<any>;
  handleReschedule: (drop: any, options?: any) => Promise<void>;
  openConflictPanel: (conflicts: any[], alternatives: any[], drop: any) => void;
  // Stacked view props
  layoutMode?: LayoutMode;
  density?: DensityMode;
  expandedTrainerIds?: (string | number)[];
  onToggleTrainerExpand?: (trainerId: string | number) => void;
}

const ScheduleCalendarComponent: React.FC<ScheduleCalendarProps> = ({
  activeView,
  currentDate,
  sessions,
  trainers,
  canReschedule,
  canQuickBook,
  isAdmin = false,
  onDrillDown,
  onSelectSession,
  onSelectSlot,
  onBookingDialog,
  checkConflicts,
  handleReschedule,
  openConflictPanel,
  layoutMode = 'columns',
  density = 'comfortable',
  expandedTrainerIds = [],
  onToggleTrainerExpand
}) => {
  // DEV: Track render counts
  if (schedulePerf.IS_DEV) {
    trackRender('ScheduleCalendar');
  }

  // Apply session limiting for performance testing
  const limitedSessions = useMemo(() => {
    const limit = schedulePerf.LIMIT_SESSIONS;
    if (limit > 0) {
      return sessions.slice(0, limit);
    }
    return sessions;
  }, [sessions]);

  // Disable drag on mobile lite mode
  const effectiveCanReschedule = canReschedule && !schedulePerf.DISABLE_DRAG_DROP;

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#3b82f6';
      case 'scheduled': return '#10b981';
      case 'confirmed': return '#059669';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      case 'blocked': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Get week start date
  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start;
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(getWeekStart(currentDate));
    day.setDate(day.getDate() + i);
    return day;
  });

  return (
    <CalendarContainer>
      {activeView === 'month' && (
        <MonthView
          date={currentDate}
          sessions={limitedSessions}
          onSelectDate={onDrillDown}
        />
      )}

      {activeView === 'week' && (
        <>
          <CalendarHeaderRow>
            <PrimaryHeading style={{ fontSize: '1.5rem' }}>
              Week View
            </PrimaryHeading>
            <Legend>
              <LegendItem>
                <LegendSwatch $color={getStatusColor('available')} />
                <Caption secondary>Available</Caption>
              </LegendItem>
              <LegendItem>
                <LegendSwatch $color={getStatusColor('scheduled')} />
                <Caption secondary>Booked/Scheduled</Caption>
              </LegendItem>
              <LegendItem>
                <LegendSwatch $color={getStatusColor('blocked')} $striped />
                <Caption secondary>Blocked</Caption>
              </LegendItem>
              <LegendItem>
                <SessionBadge tone="recurring">Recurring</SessionBadge>
              </LegendItem>
            </Legend>
          </CalendarHeaderRow>

          <WeekGridContainer>
            {weekDays.map((day, index) => {
              const daySessions = limitedSessions.filter(session => {
                const sessionDate = new Date(session.sessionDate);
                return sessionDate.toDateString() === day.toDateString();
              });

              return (
                <DayCard key={index}>
                  <DayCardHeader
                    onClick={() => onDrillDown(day)}
                    role="button"
                    tabIndex={0}
                  >
                    <Caption secondary>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Caption>
                    <DayNumber>
                      {day.getDate()}
                    </DayNumber>
                    <Caption secondary>{daySessions.length} sessions</Caption>
                  </DayCardHeader>

                  {daySessions.map(session => {
                    const isBookable = canQuickBook && session.status === 'available' && !session.isBlocked;

                    return (
                      <WeekSessionItem key={session.id}>
                        {(session.isBlocked || session.isRecurring) && (
                          <SessionMetaRow>
                            {session.isBlocked && (
                              <SessionBadge tone="blocked">Blocked</SessionBadge>
                            )}
                            {session.isRecurring && (
                              <SessionBadge tone="recurring">Recurring</SessionBadge>
                            )}
                          </SessionMetaRow>
                        )}
                        <SessionCard
                          session={session}
                          onClick={() => {
                            if (isBookable) {
                              onBookingDialog(session);
                              return;
                            }
                            onSelectSession(session);
                          }}
                        />
                        {isBookable && (
                          <QuickBookButton
                            onClick={(event) => {
                              event.stopPropagation();
                              onBookingDialog(session);
                            }}
                          >
                            Quick Book
                          </QuickBookButton>
                        )}
                      </WeekSessionItem>
                    );
                  })}
                </DayCard>
              );
            })}
          </WeekGridContainer>
        </>
      )}

      {activeView === 'day' && (
        layoutMode === 'stacked' && onToggleTrainerExpand ? (
          effectiveCanReschedule ? (
            <DragDropManager
              checkConflicts={schedulePerf.DISABLE_CONFLICT_CHECK ? async () => ({ hasConflicts: false }) : checkConflicts}
              onDragEnd={(drop) => handleReschedule(drop)}
              onConflict={({ conflicts: nextConflicts, alternatives: nextAlternatives, drop }) => {
                openConflictPanel(nextConflicts, nextAlternatives, drop);
              }}
            >
              <DayViewStacked
                date={currentDate}
                sessions={limitedSessions}
                trainers={trainers}
                enableDrag
                isAdmin={isAdmin}
                density={density}
                expandedTrainerIds={expandedTrainerIds}
                onToggleTrainerExpand={onToggleTrainerExpand}
                onSelectSession={onSelectSession}
                onSelectSlot={onSelectSlot}
              />
            </DragDropManager>
          ) : (
            <DayViewStacked
              date={currentDate}
              sessions={limitedSessions}
              trainers={trainers}
              isAdmin={isAdmin}
              density={density}
              expandedTrainerIds={expandedTrainerIds}
              onToggleTrainerExpand={onToggleTrainerExpand}
              onSelectSession={onSelectSession}
              onSelectSlot={onSelectSlot}
            />
          )
        ) : (
          effectiveCanReschedule ? (
            <DragDropManager
              checkConflicts={schedulePerf.DISABLE_CONFLICT_CHECK ? async () => ({ hasConflicts: false }) : checkConflicts}
              onDragEnd={(drop) => handleReschedule(drop)}
              onConflict={({ conflicts: nextConflicts, alternatives: nextAlternatives, drop }) => {
                openConflictPanel(nextConflicts, nextAlternatives, drop);
              }}
            >
              <DayView
                date={currentDate}
                sessions={limitedSessions}
                trainers={trainers}
                enableDrag
                isAdmin={isAdmin}
                onSelectSession={onSelectSession}
                onSelectSlot={onSelectSlot}
              />
            </DragDropManager>
          ) : (
            <DayView
              date={currentDate}
              sessions={limitedSessions}
              trainers={trainers}
              isAdmin={isAdmin}
              onSelectSession={onSelectSession}
              onSelectSlot={onSelectSlot}
            />
          )
        )
      )}

      {activeView === 'agenda' && (
        <AgendaView
          date={currentDate}
          sessions={limitedSessions}
          isAdmin={isAdmin}
          onSelectSession={onSelectSession}
          onEdit={onSelectSession}
          onCancel={onSelectSession}
        />
      )}
    </CalendarContainer>
  );
};

// Memoize ScheduleCalendar to prevent unnecessary re-renders
const ScheduleCalendar = memo(ScheduleCalendarComponent, (prevProps, nextProps) => {
  return (
    prevProps.activeView === nextProps.activeView &&
    prevProps.currentDate.getTime() === nextProps.currentDate.getTime() &&
    prevProps.sessions === nextProps.sessions &&
    prevProps.trainers === nextProps.trainers &&
    prevProps.canReschedule === nextProps.canReschedule &&
    prevProps.canQuickBook === nextProps.canQuickBook &&
    prevProps.isAdmin === nextProps.isAdmin &&
    prevProps.layoutMode === nextProps.layoutMode &&
    prevProps.density === nextProps.density &&
    prevProps.expandedTrainerIds === nextProps.expandedTrainerIds
  );
});

export default ScheduleCalendar;

const CalendarContainer = styled.div`
  flex: 1 0 auto;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  margin: 0 2rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  /* Style containment only - layout containment prevents content from sizing container */
  contain: style;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }

  @media (max-width: 1024px) {
    margin: 0 1.5rem 1.5rem;
    padding: 1.25rem;
  }

  @media (max-width: 768px) {
    margin: 0 1rem 1rem;
    padding: 1rem;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    margin: 0 0.5rem 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    overflow: auto;
  }
`;

const WeekGridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const CalendarHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
  justify-content: flex-end;

  @media (max-width: 768px) {
    justify-content: flex-start;
    gap: 0.5rem 0.75rem;
  }

  @media (max-width: 480px) {
    gap: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendSwatch = styled.span<{ $color: string; $striped?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background-color: ${props => props.$color};
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
  ${props => props.$striped && `
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.15) 4px,
      rgba(0, 0, 0, 0.2) 4px,
      rgba(0, 0, 0, 0.2) 8px
    );
  `}

  @media (max-width: 480px) {
    width: 12px;
    height: 12px;
  }
`;

const DayCard = styled(Card)`
  padding: 1rem;
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible;

  @media (max-width: 1024px) {
    min-height: 180px;
    padding: 0.875rem;
  }

  @media (max-width: 768px) {
    min-height: 150px;
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    min-height: 120px;
    padding: 0.5rem;
  }
`;

const DayCardHeader = styled.div`
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 150ms ease-out;
  width: 100%;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }

  &:active {
    background: rgba(0, 255, 255, 0.15);
    transform: scale(0.98);
  }

  @media (max-width: 480px) {
    padding: 0.375rem;
  }
`;

const DayNumber = styled.span`
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #3b82f6;
  line-height: 1.2;
  margin: 0.5rem 0;
`;

const WeekSessionItem = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
`;

const QuickBookButton = styled.button`
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.3rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #ffffff;
  background: rgba(59, 130, 246, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.9);
  border-radius: 6px;
  cursor: pointer;
  min-height: 36px;
  transition: all 150ms ease;

  &:hover {
    background: rgba(37, 99, 235, 0.85);
  }

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.97);
    background: rgba(37, 99, 235, 0.95);
  }

  @media (max-width: 480px) {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
  }
`;

const SessionMetaRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
`;

const SessionBadge = styled.span<{ tone: 'blocked' | 'recurring' }>`
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${props => props.tone === 'blocked'
    ? 'rgba(15, 23, 42, 0.55)'
    : 'rgba(59, 130, 246, 0.2)'};
  color: ${props => props.tone === 'blocked'
    ? '#e2e8f0'
    : '#bfdbfe'};
  border: 1px solid ${props => props.tone === 'blocked'
    ? 'rgba(148, 163, 184, 0.6)'
    : 'rgba(59, 130, 246, 0.5)'};
`;








