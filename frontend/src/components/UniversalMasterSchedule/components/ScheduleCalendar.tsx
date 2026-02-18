import React, { useMemo, memo } from 'react';
import styled from 'styled-components';
import MonthView from '../Views/MonthView';
import WeekView from '../Views/WeekView';
import DayView from '../Views/DayView';
import DayViewStacked from '../Views/DayViewStacked';
import AgendaView from '../Views/AgendaView';
import DragDropManager from '../DragDrop/DragDropManager';
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
        <WeekView
          date={currentDate}
          sessions={limitedSessions}
          trainers={trainers}
          canQuickBook={canQuickBook}
          isAdmin={isAdmin}
          onSelectSession={onSelectSession}
          onSelectSlot={onSelectSlot}
          onDrillDown={onDrillDown}
          onBookingDialog={onBookingDialog}
        />
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
  /* Horizontal scroll for wide DayView grids on narrow viewports;
     vertical scroll delegated to ScheduleContainer parent.
     NOTE: overflow-y MUST be 'hidden' (not 'visible') because CSS spec
     promotes 'visible' to 'auto' when the other axis is auto/scroll,
     which creates a nested scroll trap that blocks parent scrolling. */
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  margin: 0 2rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  }

  /* Large-screen scaling */
  @media (min-width: 2560px) {
    margin: 0 2.5rem 2.5rem;
    padding: 2rem;
    border-radius: 16px;
  }

  @media (min-width: 3840px) {
    margin: 0 3rem 3rem;
    padding: 2.5rem;
  }
`;








