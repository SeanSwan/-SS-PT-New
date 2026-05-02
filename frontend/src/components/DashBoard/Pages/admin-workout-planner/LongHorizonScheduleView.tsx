/**
 * LongHorizonScheduleView
 * =========================
 *
 * L2.C (2026-05-02) — drill-down nav for the populated long-horizon plan.
 *
 * The L1 backend now emits `weeks[].days[].exercises[]` covering the full
 * horizon (e.g. 96 sessions for a 24w × 4×/wk plan). This view surfaces
 * that schedule in the planner page via three nested tabs:
 *
 *   Month tabs (1, 2, 3, …, ⌈weeks.length / 4⌉)
 *      └── Week tabs (1-4 per month, last month may be short)
 *            └── Day list (sessionsPerWeek per week)
 *                  └── Exercises for the selected day
 *
 * Defaults to Month 1 / Week 1 / Day 1. If `weeks` is missing or has
 * fewer than 4 entries (single-mesocycle plans), the parent should not
 * render this view — the existing weekly summary already shows them.
 *
 * NO DB ACCESS. Pure read-side rendering of the data from `generatedPlan`.
 * Crystalline Swan styling: var(--accent-primary, #60C0F0) for active
 * Month/Week, var(--accent-secondary, #8B5CF6) for the active Day.
 */

import React, { memo, useMemo, useState } from 'react';
import styled from 'styled-components';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { GeneratedPlanWeek, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';

interface LongHorizonScheduleViewProps {
  weeks: GeneratedPlanWeek[];
}

// ─── Helpers ────────────────────────────────────────────────────

const getDaysOfWeek = (week: GeneratedPlanWeek): GeneratedPlanWeekDay[] => {
  // L1 REV 2 alignment: prefer non-empty `days[]`, fall through to non-empty
  // `sessions[]`. Same pickFirstNonEmptyArray semantics as the backend's
  // shape service so the empty-array-truthy bug doesn't reappear here.
  if (Array.isArray(week.days) && week.days.length > 0) return week.days;
  if (Array.isArray(week.sessions) && week.sessions.length > 0) return week.sessions;
  return [];
};

const groupWeeksByMonth = (weeks: GeneratedPlanWeek[]): GeneratedPlanWeek[][] => {
  const months: GeneratedPlanWeek[][] = [];
  for (let i = 0; i < weeks.length; i += 4) {
    months.push(weeks.slice(i, i + 4));
  }
  return months;
};

const formatExerciseLine = (ex: GeneratedPlanWeekDay['exercises'][number]): string => {
  const name = ex.exerciseName || ex.name || 'Unknown Exercise';
  const setCount = Array.isArray(ex.sets) ? ex.sets.length : (typeof ex.sets === 'number' ? ex.sets : 3);
  const reps = ex.targetReps ?? ex.reps ?? '10';
  return `${name} — ${setCount} × ${reps}`;
};

// ─── Component ────────────────────────────────────────────────

const LongHorizonScheduleViewBase: React.FC<LongHorizonScheduleViewProps> = ({ weeks }) => {
  const months = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  // Resolve the selected entities. Indices are 1-based for UX clarity but
  // arrays are 0-based, so subtract 1 at lookup time. Clamp to valid ranges
  // so an invalid stored selection (e.g. user picks Month 3 Week 4 Day 5
  // then switches to Month 6 which has fewer weeks/days) still renders
  // *something* rather than blowing up.
  const monthBlock = months[Math.min(selectedMonth - 1, months.length - 1)] || [];
  const weekClampIndex = Math.min(selectedWeek - 1, Math.max(monthBlock.length - 1, 0));
  const week = monthBlock[weekClampIndex] || null;
  const days = week ? getDaysOfWeek(week) : [];
  const dayClampIndex = Math.min(selectedDay - 1, Math.max(days.length - 1, 0));
  const day = days[dayClampIndex] || null;

  if (months.length === 0) return null;

  const handleMonthChange = (n: number) => {
    setSelectedMonth(n);
    setSelectedWeek(1);
    setSelectedDay(1);
  };
  const handleWeekChange = (n: number) => {
    setSelectedWeek(n);
    setSelectedDay(1);
  };

  return (
    <Wrapper aria-label="Long-horizon schedule">
      <Header>
        <CalendarDays size={16} />
        <Title>Detailed Schedule</Title>
        <BreadcrumbDim>
          <span>Month {selectedMonth}</span>
          <ChevronRight size={12} />
          <span>Week {week?.weekNumber ?? selectedWeek}</span>
          <ChevronRight size={12} />
          <span>{day ? (day.name || day.dayName || `Day ${day.dayNumber}`) : 'Day'}</span>
        </BreadcrumbDim>
      </Header>

      {/* Month tabs */}
      <TabRow role="tablist" aria-label="Month">
        {months.map((_, idx) => {
          const monthNumber = idx + 1;
          const isActive = monthNumber === selectedMonth;
          return (
            <Tab
              key={monthNumber}
              role="tab"
              aria-selected={isActive}
              $active={isActive}
              $tone="primary"
              type="button"
              onClick={() => handleMonthChange(monthNumber)}
            >
              Month {monthNumber}
            </Tab>
          );
        })}
      </TabRow>

      {/* Week tabs (within month) */}
      <TabRow role="tablist" aria-label="Week">
        {monthBlock.map((w, idx) => {
          const weekNumberInMonth = idx + 1;
          const isActive = weekNumberInMonth === selectedWeek;
          return (
            <Tab
              key={w.weekNumber}
              role="tab"
              aria-selected={isActive}
              $active={isActive}
              $tone="primary"
              $compact
              type="button"
              onClick={() => handleWeekChange(weekNumberInMonth)}
              title={w.focus || ''}
            >
              Week {w.weekNumber}
              {w.focus ? <SmallSubtext>{w.focus}</SmallSubtext> : null}
            </Tab>
          );
        })}
      </TabRow>

      {/* Day list (within selected week) */}
      <DayList role="tablist" aria-label="Day">
        {days.length === 0 ? (
          <Empty>This week has no populated days.</Empty>
        ) : (
          days.map((d, idx) => {
            const dayNumber = idx + 1;
            const isActive = dayNumber === selectedDay;
            const exerciseCount = Array.isArray(d.exercises) ? d.exercises.length : 0;
            return (
              <DayChip
                key={d.dayNumber}
                role="tab"
                aria-selected={isActive}
                $active={isActive}
                type="button"
                onClick={() => setSelectedDay(dayNumber)}
              >
                <DayChipLabel>Day {d.dayNumber}</DayChipLabel>
                <DayChipMeta>
                  {(d.name || d.dayName || d.focus || '—')}
                  <DayCount>· {exerciseCount} ex</DayCount>
                </DayChipMeta>
              </DayChip>
            );
          })
        )}
      </DayList>

      {/* Selected day's exercises */}
      <Detail>
        {day ? (
          <>
            <DetailTitle>
              {(day.name || day.dayName || `Day ${day.dayNumber}`)}
              {day.focus ? <DetailFocus>{day.focus}</DetailFocus> : null}
            </DetailTitle>
            {Array.isArray(day.exercises) && day.exercises.length > 0 ? (
              <ExerciseList>
                {day.exercises.map((ex, i) => (
                  <ExerciseRow key={`${ex.exerciseId || ex.exerciseName || ex.name || 'ex'}-${i}`}>
                    <span>{formatExerciseLine(ex)}</span>
                    {ex.rotationFallback ? (
                      <FallbackBadge title="Rotation fallback - see L1 receipt">fallback</FallbackBadge>
                    ) : null}
                  </ExerciseRow>
                ))}
              </ExerciseList>
            ) : (
              <Empty>No exercises populated for this day.</Empty>
            )}
          </>
        ) : (
          <Empty>Select a day above to see its exercises.</Empty>
        )}
      </Detail>
    </Wrapper>
  );
};

const LongHorizonScheduleView = memo(LongHorizonScheduleViewBase);
export default LongHorizonScheduleView;

// ─── Styled ────────────────────────────────────────────────

const Wrapper = styled.section`
  margin-top: 16px;
  padding: 12px 14px 14px;
  border-radius: 10px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  color: var(--accent-primary, #60C0F0);
`;

const Title = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const BreadcrumbDim = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
`;

const TabRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
`;

const Tab = styled.button<{ $active: boolean; $tone: 'primary' | 'secondary'; $compact?: boolean }>`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
  padding: ${({ $compact }) => ($compact ? '6px 10px' : '8px 12px')};
  border-radius: 8px;
  border: 1px solid ${({ $active, $tone }) =>
    $active
      ? `color-mix(in srgb, var(--accent-${$tone === 'primary' ? 'primary' : 'secondary'}, #60C0F0) 60%, transparent)`
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $active, $tone }) =>
    $active
      ? `color-mix(in srgb, var(--accent-${$tone === 'primary' ? 'primary' : 'secondary'}, #60C0F0) 18%, var(--bg-elevated, #141419))`
      : 'var(--bg-elevated, #141419)'};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : 'var(--text-secondary, rgba(224, 236, 244, 0.7))')};
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;
  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const SmallSubtext = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  text-transform: capitalize;
`;

const DayList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
`;

const DayChip = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, var(--bg-elevated, #141419))'
      : 'var(--bg-elevated, #141419)'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  text-align: left;
  min-height: 56px;
  transition: all 0.15s ease;
  &:hover {
    border-color: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const DayChipLabel = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
`;

const DayChipMeta = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.75));
  text-transform: capitalize;
`;

const DayCount = styled.span`
  margin-left: 4px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
`;

const Detail = styled.div`
  padding: 12px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, var(--bg-elevated, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent);
`;

const DetailTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  text-transform: capitalize;
`;

const DetailFocus = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  text-transform: lowercase;
`;

const ExerciseList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const ExerciseRow = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 0;
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-primary, #E0ECF4);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 6%, transparent);
  &:last-child { border-bottom: none; }
`;

const FallbackBadge = styled.span`
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  text-transform: uppercase;
  background: color-mix(in srgb, var(--accent-warning, #C6A84B) 18%, transparent);
  color: var(--accent-warning, #C6A84B);
`;

const Empty = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  padding: 8px 0;
`;
