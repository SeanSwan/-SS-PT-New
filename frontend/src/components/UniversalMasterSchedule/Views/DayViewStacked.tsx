/**
 * DayViewStacked - MindBody-Style Stacked Multi-Trainer Day View
 * ===============================================================
 * Renders each trainer's day schedule as a collapsible vertical section,
 * stacked one below another. Eliminates horizontal scrolling for mobile.
 *
 * Industry pattern: MindBody, Glofox, Vagaro mobile views
 * Key: No horizontal scroll. Single-column width. Compact density support.
 */

import React, { useMemo, memo, useCallback, useState } from 'react';
import DraggableSession from '../DragDrop/DraggableSession';
import DroppableSlot from '../DragDrop/DroppableSlot';
import { schedulePerf, trackRender } from '../../../utils/schedulePerformance';
import { DENSITY_SPECS } from '../types';
import type { DayViewSession, DayViewTrainer } from './DayView.types';
import type { DayViewStackedProps } from './DayViewStacked.types';
import { getScheduleSlotMinuteFromOffset } from '../utils/scheduleTimeSlots';
import {
  MAX_INITIAL_TRAINERS,
  STACKED_DAY_VIEW_HOURS,
  deriveStackedTrainerList,
  formatStackedHour,
  getTrainerInitials,
  isPastScheduleTime,
  isSameScheduleDay,
  isScheduledDayViewSession,
} from './DayViewStacked.helpers';
import {
  AvailableText,
  ClickableSlot,
  CollapseIcon,
  EmptyState,
  EmptyText,
  PastSlot,
  ShowMoreButton,
  SlotContent,
  StackedContainer,
  TimeGrid,
  TimeLabel,
  TimeSlotRow,
  TrainerAvatar,
  TrainerHeaderBar,
  TrainerInfo,
  TrainerName,
  TrainerSection,
  TrainerStats,
} from './DayViewStacked.styles';

export type { DayViewStackedProps } from './DayViewStacked.types';

const DayViewStackedComponent: React.FC<DayViewStackedProps> = ({
  date,
  sessions,
  trainers,
  enableDrag = false,
  isAdmin = false,
  density,
  expandedTrainerIds,
  onToggleTrainerExpand,
  onSelectSession,
  onSelectSlot,
}) => {
  if (schedulePerf.IS_DEV) {
    trackRender('DayViewStacked');
  }

  const [visibleCount, setVisibleCount] = useState(MAX_INITIAL_TRAINERS);

  // Filter sessions for the given day, excluding cancelled
  const sessionsForDay = useMemo(
    () =>
      sessions.filter(
        (s) => isSameScheduleDay(new Date(s.sessionDate), date) && s.status !== 'cancelled'
      ),
    [sessions, date]
  );

  // Derive trainer list if none provided
  const trainerList = useMemo(() => {
    if (trainers.length > 0) return trainers;
    return deriveStackedTrainerList(sessionsForDay);
  }, [trainers, sessionsForDay]);

  // O(1) pre-index sessions by trainerId+hour
  const sessionsBySlot = useMemo(() => {
    const map = new Map<string, DayViewSession[]>();
    sessionsForDay.forEach((s) => {
      const hour = new Date(s.sessionDate).getHours();
      const tid = String(s.trainerId ?? 'unassigned');
      const key = `${tid}-${hour}`;
      const existing = map.get(key) || [];
      existing.push(s);
      map.set(key, existing);
    });
    return map;
  }, [sessionsForDay]);

  // Session counts per trainer
  const trainerStats = useMemo(() => {
    const stats = new Map<string, { booked: number; available: number }>();
    sessionsForDay.forEach((s) => {
      const tid = String(s.trainerId ?? 'unassigned');
      const existing = stats.get(tid) || { booked: 0, available: 0 };
      if (isScheduledDayViewSession(s)) {
        existing.booked++;
      } else {
        existing.available++;
      }
      stats.set(tid, existing);
    });
    return stats;
  }, [sessionsForDay]);

  const specs = DENSITY_SPECS[density];
  const effectiveEnableDrag = enableDrag && !schedulePerf.DISABLE_DRAG_DROP;

  // Pagination: only show first N trainers
  const visibleTrainers = trainerList.slice(0, visibleCount);
  const hasMore = trainerList.length > visibleCount;

  // Which hours to show labels for (compact = every 2 hours)
  const shouldShowLabel = useCallback(
    (hour: number) => {
      if (specs.timeLabelInterval === 1) return true;
      return (hour - 5) % specs.timeLabelInterval === 0;
    },
    [specs.timeLabelInterval]
  );

  if (trainerList.length === 0) {
    return (
      <EmptyState>
        <EmptyText>No trainers with sessions for this day.</EmptyText>
      </EmptyState>
    );
  }

  return (
    <StackedContainer>
      {visibleTrainers.map((trainer) => {
        const tid = String(trainer.id);
        const isExpanded = expandedTrainerIds.includes(trainer.id);
        const stats = trainerStats.get(tid) || { booked: 0, available: 0 };

        return (
          <TrainerSection key={tid} $density={density}>
            <TrainerHeaderBar
              onClick={() => onToggleTrainerExpand(trainer.id)}
              $density={density}
              role="button"
              aria-expanded={isExpanded}
              aria-label={`${trainer.name || 'Unknown'} schedule - ${stats.booked} booked, ${stats.available} open`}
            >
              <TrainerAvatar $density={density}>
                {getTrainerInitials(trainer.name)}
              </TrainerAvatar>
              <TrainerInfo>
                <TrainerName $density={density}>{trainer.name || 'Unknown Trainer'}</TrainerName>
                <TrainerStats $density={density}>
                  {stats.booked} booked &middot; {stats.available} open
                </TrainerStats>
              </TrainerInfo>
              <CollapseIcon $expanded={isExpanded}>
                &#9662;
              </CollapseIcon>
            </TrainerHeaderBar>

            {isExpanded && (
              <TimeGrid role="grid" aria-label={`${trainer.name} day schedule`}>
                {STACKED_DAY_VIEW_HOURS.map((hour) => {
                  const slotKey = `${tid}-${hour}`;
                  const slotSessions = sessionsBySlot.get(slotKey) || [];
                  const past = isPastScheduleTime(date, hour);
                  const hasScheduled = slotSessions.some(isScheduledDayViewSession);
                  const canAccess = !past || isAdmin;
                  const showLabel = shouldShowLabel(hour);

                  return (
                    <TimeSlotRow
                      key={hour}
                      $density={density}
                      $isPast={past}
                      role="row"
                    >
                      <TimeLabel $density={density} $dimmed={!showLabel}>
                        {showLabel ? formatStackedHour(hour) : ''}
                      </TimeLabel>

                      <SlotContent
                        $density={density}
                        $isPast={past}
                        $hasSession={slotSessions.length > 0}
                        $isScheduled={hasScheduled}
                        role="gridcell"
                        aria-label={`${formatStackedHour(hour)} - ${
                          slotSessions.length > 0
                            ? `${slotSessions.length} session(s)`
                            : past
                            ? 'Past'
                            : 'Available'
                        }`}
                      >
                        {slotSessions.length > 0 ? (
                          slotSessions.map((session) => (
                            <DraggableSession
                              key={String(session.id)}
                              session={session}
                              onSelectSession={onSelectSession}
                              disabled={
                                !effectiveEnableDrag ||
                                Boolean(session.isBlocked) ||
                                session.status === 'blocked' ||
                                session.status === 'available' ||
                                session.status === 'completed' ||
                                session.status === 'cancelled'
                              }
                            />
                          ))
                        ) : effectiveEnableDrag && canAccess ? (
                          <DroppableSlot
                            id={`stacked-slot-${tid}-${hour}`}
                            date={date}
                            hour={hour}
                            trainerId={trainer.id === 'unassigned' ? undefined : trainer.id}
                            onClick={(event) =>
                              onSelectSlot?.({
                                date,
                                hour,
                                minute: getScheduleSlotMinuteFromOffset(event.nativeEvent.offsetY, event.currentTarget.clientHeight),
                                trainerId:
                                  trainer.id === 'unassigned' ? undefined : trainer.id,
                              })
                            }
                          >
                            <AvailableText $isPast={past} $isAdmin={isAdmin} $density={density}>
                              {past ? (isAdmin ? 'Past' : '') : 'Open'}
                            </AvailableText>
                          </DroppableSlot>
                        ) : canAccess ? (
                          <ClickableSlot
                            onClick={() =>
                              onSelectSlot?.({
                                date,
                                hour,
                                minute: 0,
                                trainerId:
                                  trainer.id === 'unassigned' ? undefined : trainer.id,
                              })
                            }
                            $density={density}
                          >
                            <AvailableText $isPast={past} $isAdmin={isAdmin} $density={density}>
                              {past ? (isAdmin ? 'Past' : '') : 'Open'}
                            </AvailableText>
                          </ClickableSlot>
                        ) : (
                          <PastSlot $density={density} />
                        )}
                      </SlotContent>
                    </TimeSlotRow>
                  );
                })}
              </TimeGrid>
            )}
          </TrainerSection>
        );
      })}

      {hasMore && (
        <ShowMoreButton onClick={() => setVisibleCount((c) => c + MAX_INITIAL_TRAINERS)}>
          Show {Math.min(MAX_INITIAL_TRAINERS, trainerList.length - visibleCount)} more trainers
        </ShowMoreButton>
      )}
    </StackedContainer>
  );
};

// ==================== MEMO ====================

const DayViewStacked = memo(DayViewStackedComponent, (prev, next) => {
  return (
    prev.date.getTime() === next.date.getTime() &&
    prev.sessions === next.sessions &&
    prev.trainers === next.trainers &&
    prev.enableDrag === next.enableDrag &&
    prev.isAdmin === next.isAdmin &&
    prev.density === next.density &&
    prev.expandedTrainerIds === next.expandedTrainerIds &&
    prev.onSelectSession === next.onSelectSession &&
    prev.onSelectSlot === next.onSelectSlot &&
    prev.onToggleTrainerExpand === next.onToggleTrainerExpand
  );
});

export default DayViewStacked;
