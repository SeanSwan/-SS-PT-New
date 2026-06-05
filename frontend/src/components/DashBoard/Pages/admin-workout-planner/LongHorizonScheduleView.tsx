/**
 * LongHorizonScheduleView
 * =======================
 *
 * Drill-down navigation for populated long-horizon workout plans.
 * Renders Month -> Week -> Day tabs from generated plan data without DB access.
 */

import React, { memo, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import type { GeneratedPlanWeek, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';
import {
  BreadcrumbDim,
  DayChip,
  DayChipLabel,
  DayChipMeta,
  DayCount,
  DayList,
  Detail,
  DetailFocus,
  DetailTitle,
  Empty,
  ExerciseList,
  ExerciseRow,
  FallbackBadge,
  Header,
  SmallSubtext,
  Tab,
  TabRow,
  Title,
  Wrapper,
} from './LongHorizonScheduleView.styles';

interface LongHorizonScheduleViewProps {
  weeks: GeneratedPlanWeek[];
}

const getDaysOfWeek = (week: GeneratedPlanWeek): GeneratedPlanWeekDay[] => {
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
  return `${name} - ${setCount} x ${reps}`;
};

const LongHorizonScheduleViewBase: React.FC<LongHorizonScheduleViewProps> = ({ weeks }) => {
  const months = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  const monthBlock = months[Math.min(selectedMonth - 1, months.length - 1)] || [];
  const weekClampIndex = Math.min(selectedWeek - 1, Math.max(monthBlock.length - 1, 0));
  const week = monthBlock[weekClampIndex] || null;
  const days = week ? getDaysOfWeek(week) : [];
  const dayClampIndex = Math.min(selectedDay - 1, Math.max(days.length - 1, 0));
  const day = days[dayClampIndex] || null;

  if (months.length === 0) return null;

  const handleMonthChange = (monthNumber: number) => {
    setSelectedMonth(monthNumber);
    setSelectedWeek(1);
    setSelectedDay(1);
  };

  const handleWeekChange = (weekNumber: number) => {
    setSelectedWeek(weekNumber);
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
                  {d.name || d.dayName || d.focus || '-'}
                  <DayCount>- {exerciseCount} ex</DayCount>
                </DayChipMeta>
              </DayChip>
            );
          })
        )}
      </DayList>

      <Detail>
        {day ? (
          <>
            <DetailTitle>
              {day.name || day.dayName || `Day ${day.dayNumber}`}
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
