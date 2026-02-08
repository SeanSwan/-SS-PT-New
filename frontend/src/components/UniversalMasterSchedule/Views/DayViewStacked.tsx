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
import styled, { css } from 'styled-components';
import { galaxySwanTheme } from '../../../styles/galaxy-swan-theme';
import { SessionCardData } from '../Cards/SessionCard';
import DraggableSession from '../DragDrop/DraggableSession';
import DroppableSlot from '../DragDrop/DroppableSlot';
import { schedulePerf, trackRender } from '../../../utils/schedulePerformance';
import { DENSITY_SPECS } from '../types';
import type { DensityMode } from '../types';
import type { DayViewSession, DayViewTrainer } from './DayView';

// ==================== PROPS ====================

export interface DayViewStackedProps {
  date: Date;
  sessions: DayViewSession[];
  trainers: DayViewTrainer[];
  enableDrag?: boolean;
  isAdmin?: boolean;
  density: DensityMode;
  expandedTrainerIds: (string | number)[];
  onToggleTrainerExpand: (trainerId: string | number) => void;
  onSelectSession?: (session: DayViewSession) => void;
  onSelectSlot?: (payload: { date: Date; hour: number; trainerId?: number | string }) => void;
}

// ==================== CONSTANTS ====================

const HOURS = Array.from({ length: 18 }, (_, i) => 5 + i); // 5am - 10pm
const MAX_INITIAL_TRAINERS = 6;

// ==================== HELPERS ====================

const isSameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isPastTime = (date: Date, hour: number) => {
  const now = new Date();
  const slotDate = new Date(date);
  slotDate.setHours(hour, 0, 0, 0);
  return slotDate < now;
};

const isScheduledSession = (session: DayViewSession) =>
  session.status !== 'available' && session.status !== 'cancelled';

const formatHour = (hour: number) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

const getInitials = (name: string | undefined | null) => {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// ==================== COMPONENT ====================

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
        (s) => isSameDay(new Date(s.sessionDate), date) && s.status !== 'cancelled'
      ),
    [sessions, date]
  );

  // Derive trainer list if none provided
  const trainerList = useMemo(() => {
    if (trainers.length > 0) return trainers;
    const map = new Map<string, DayViewTrainer>();
    sessionsForDay.forEach((s) => {
      if (!s.trainerId && !s.trainerName) return;
      const id = s.trainerId ?? s.trainerName ?? 'trainer';
      const key = String(id);
      if (!map.has(key)) {
        map.set(key, { id, name: s.trainerName || `Trainer ${key}` });
      }
    });
    return Array.from(map.values());
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
      if (isScheduledSession(s)) {
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
                {getInitials(trainer.name)}
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
                {HOURS.map((hour) => {
                  const slotKey = `${tid}-${hour}`;
                  const slotSessions = sessionsBySlot.get(slotKey) || [];
                  const past = isPastTime(date, hour);
                  const hasScheduled = slotSessions.some(isScheduledSession);
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
                        {showLabel ? formatHour(hour) : ''}
                      </TimeLabel>

                      <SlotContent
                        $density={density}
                        $isPast={past}
                        $hasSession={slotSessions.length > 0}
                        $isScheduled={hasScheduled}
                        role="gridcell"
                        aria-label={`${formatHour(hour)} - ${
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
                            onClick={() =>
                              onSelectSlot?.({
                                date,
                                hour,
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

// ==================== STYLED COMPONENTS ====================

const StackedContainer = styled.div`
  width: 100%;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const TrainerSection = styled.div<{ $density: DensityMode }>`
  border-radius: 12px;
  border: 1px solid ${galaxySwanTheme.borders.elegant};
  background: rgba(10, 10, 26, 0.3);
  overflow: hidden;

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      border-radius: 8px;
    `}
`;

const TrainerHeaderBar = styled.div<{ $density: DensityMode }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: ${galaxySwanTheme.background.surface};
  border-bottom: 1px solid ${galaxySwanTheme.borders.subtle};
  cursor: pointer;
  user-select: none;
  min-height: 44px;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 255, 255, 0.05);
  }

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      padding: 0.5rem 0.75rem;
      gap: 0.5rem;
    `}
`;

const TrainerAvatar = styled.div<{ $density: DensityMode }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${galaxySwanTheme.primary.main}, #7851A9);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      width: 28px;
      height: 28px;
      font-size: 0.65rem;
    `}
`;

const TrainerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const TrainerName = styled.div<{ $density: DensityMode }>`
  font-weight: 600;
  color: ${galaxySwanTheme.text.primary};
  font-size: ${({ $density }) => ($density === 'compact' ? '0.85rem' : '0.95rem')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TrainerStats = styled.div<{ $density: DensityMode }>`
  font-size: ${({ $density }) => ($density === 'compact' ? '0.7rem' : '0.75rem')};
  color: ${galaxySwanTheme.text.secondary};
`;

const CollapseIcon = styled.div<{ $expanded: boolean }>`
  font-size: 1rem;
  color: ${galaxySwanTheme.text.secondary};
  transition: transform 200ms ease;
  transform: rotate(${({ $expanded }) => ($expanded ? '0deg' : '-90deg')});
  flex-shrink: 0;
`;

const TimeGrid = styled.div`
  display: flex;
  flex-direction: column;
`;

const TimeSlotRow = styled.div<{ $density: DensityMode; $isPast?: boolean }>`
  display: grid;
  grid-template-columns: 60px 1fr;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight}px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  opacity: ${({ $isPast }) => ($isPast ? 0.6 : 1)};

  ${({ $density }) =>
    $density === 'compact' &&
    css`
      grid-template-columns: 48px 1fr;
    `}
`;

const TimeLabel = styled.div<{ $density: DensityMode; $dimmed?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ $density }) => ($density === 'compact' ? '0.7rem' : '0.8rem')};
  color: ${({ $dimmed }) =>
    $dimmed ? 'rgba(255,255,255,0.15)' : galaxySwanTheme.text.secondary};
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0.25rem;
`;

const SlotContent = styled.div<{
  $density: DensityMode;
  $isPast?: boolean;
  $hasSession?: boolean;
  $isScheduled?: boolean;
}>`
  padding: ${({ $density }) => ($density === 'compact' ? '2px 4px' : '4px 8px')};
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight}px;
  background: ${({ $isScheduled, $isPast }) =>
    $isScheduled
      ? 'rgba(0, 128, 128, 0.1)'
      : $isPast
      ? 'rgba(255, 255, 255, 0.01)'
      : 'transparent'};
`;

const AvailableText = styled.span<{
  $isPast?: boolean;
  $isAdmin?: boolean;
  $density: DensityMode;
}>`
  font-size: ${({ $density }) => ($density === 'compact' ? '0.65rem' : '0.75rem')};
  color: ${({ $isPast, $isAdmin }) =>
    $isPast
      ? $isAdmin
        ? '#f59e0b'
        : 'rgba(255,255,255,0.2)'
      : galaxySwanTheme.primary.main};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  padding: 0.25rem;
`;

const ClickableSlot = styled.div<{ $density: DensityMode }>`
  cursor: pointer;
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight - 8}px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  transition: background 150ms ease;

  &:hover {
    background: rgba(0, 255, 255, 0.05);
  }
`;

const PastSlot = styled.div<{ $density: DensityMode }>`
  min-height: ${({ $density }) => DENSITY_SPECS[$density].rowHeight - 8}px;
`;

const ShowMoreButton = styled.button`
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 255, 255, 0.08);
  border: 1px dashed ${galaxySwanTheme.primary.main};
  border-radius: 10px;
  color: ${galaxySwanTheme.primary.main};
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  min-height: 44px;

  &:hover {
    background: rgba(0, 255, 255, 0.15);
  }
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
`;

const EmptyText = styled.p`
  color: ${galaxySwanTheme.text.secondary};
  font-size: 0.9rem;
`;
