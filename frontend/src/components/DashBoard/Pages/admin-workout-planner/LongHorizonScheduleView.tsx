/**
 * LongHorizonScheduleView
 * =======================
 *
 * Drill-down navigation for populated long-horizon workout plans.
 * Renders Month -> Week -> Day tabs from generated plan data without DB access.
 */

import React, { memo, useMemo, useState } from 'react';
import type { GeneratedPlanWeek, GeneratedPlanWeekDay } from './WorkoutPlannerTypes';
import {
  DayDetail,
  DayTabs,
  MonthTabs,
  ScheduleHeader,
  WeekTabs,
} from './LongHorizonScheduleView.parts';
import {
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

const selectedItem = <T,>(items: T[], selectedNumber: number): T | null => {
  const selectedIndex = Math.min(selectedNumber - 1, Math.max(items.length - 1, 0));
  return items[selectedIndex] ?? null;
};

const LongHorizonScheduleViewBase: React.FC<LongHorizonScheduleViewProps> = ({ weeks }) => {
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
      <DayDetail day={day} />
    </Wrapper>
  );
};

const LongHorizonScheduleView = memo(LongHorizonScheduleViewBase);
export default LongHorizonScheduleView;
