/**
 * LongHorizonScheduleView
 * =======================
 *
 * Drill-down navigation for populated long-horizon workout plans.
 * Renders Month -> Week -> Day tabs from generated plan data without DB access.
 */

import React, { memo, useMemo, useState } from 'react';
import type { GeneratedPlanWeek, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';
import type { HorizonSwapTarget, PlannerSwapTarget } from './workoutPlannerHorizonSwap.helpers';
import {
  DayDetail,
  DayTabs,
  MonthTabs,
  ScheduleHeader,
  WeekTabs,
  type DayExerciseEditHandlers,
} from './LongHorizonScheduleView.parts';
import {
  Wrapper,
} from './LongHorizonScheduleView.styles';

interface LongHorizonScheduleViewProps {
  weeks: GeneratedPlanWeek[];
  /** Optional day-level editing (trainer planner). Absent → read-only view. */
  swapTarget?: PlannerSwapTarget | null;
  onBeginHorizonSwap?: (target: HorizonSwapTarget) => void;
  onRemoveHorizonExercise?: (target: HorizonSwapTarget) => void;
  onCancelSwap?: () => void;
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

const selectedItem = <T,>(items: T[], selectedNumber: number): T | null => {
  const selectedIndex = Math.min(selectedNumber - 1, Math.max(items.length - 1, 0));
  return items[selectedIndex] ?? null;
};

const LongHorizonScheduleViewBase: React.FC<LongHorizonScheduleViewProps> = ({
  weeks,
  swapTarget,
  onBeginHorizonSwap,
  onRemoveHorizonExercise,
  onCancelSwap,
}) => {
  const months = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);

  const monthBlock = selectedItem(months, selectedMonth) ?? [];
  const week = selectedItem(monthBlock, selectedWeek);
  const days = week ? getDaysOfWeek(week) : [];
  const day = selectedItem(days, selectedDay);

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

  // Day-slot edit wiring: targets address week by weekNumber and the day by
  // its POSITION in the days/sessions array (matches this view's selection).
  const dayIndex = Math.min(selectedDay - 1, Math.max(days.length - 1, 0));
  const buildTarget = (exerciseIndex: number, exerciseName: string): HorizonSwapTarget => ({
    kind: 'horizon',
    weekNumber: week?.weekNumber ?? selectedWeek,
    dayIndex,
    exerciseIndex,
    exerciseName,
  });
  const editHandlers: DayExerciseEditHandlers | null = (onBeginHorizonSwap && onRemoveHorizonExercise)
    ? {
      onBeginSwapExercise: (exerciseIndex, exerciseName) => onBeginHorizonSwap(buildTarget(exerciseIndex, exerciseName)),
      onRemoveExercise: (exerciseIndex, exerciseName) => onRemoveHorizonExercise(buildTarget(exerciseIndex, exerciseName)),
    }
    : null;
  const swapActiveIndex = (
    swapTarget?.kind === 'horizon'
    && swapTarget.weekNumber === (week?.weekNumber ?? selectedWeek)
    && swapTarget.dayIndex === dayIndex
  ) ? swapTarget.exerciseIndex : null;

  return (
    <Wrapper aria-label="Long-horizon schedule">
      <ScheduleHeader
        selectedMonth={selectedMonth}
        selectedWeek={selectedWeek}
        week={week}
        day={day}
      />
      <MonthTabs months={months} selectedMonth={selectedMonth} onMonthChange={handleMonthChange} />
      <WeekTabs monthBlock={monthBlock} selectedWeek={selectedWeek} onWeekChange={handleWeekChange} />
      <DayTabs days={days} selectedDay={selectedDay} onDayChange={setSelectedDay} />
      <DayDetail
        day={day}
        editHandlers={editHandlers}
        swapTarget={swapTarget}
        swapActiveIndex={swapActiveIndex}
        onCancelSwap={onCancelSwap}
      />
    </Wrapper>
  );
};

const LongHorizonScheduleView = memo(LongHorizonScheduleViewBase);
export default LongHorizonScheduleView;
