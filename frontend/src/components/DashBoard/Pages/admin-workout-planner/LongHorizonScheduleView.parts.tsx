/**
 * COMPONENT HELPERS: LongHorizonScheduleView.parts
 * PURPOSE: Presentational pieces for the Month > Week > Day drill-down.
 * DATA FLOW: Receives already-selected generated plan weeks and days from
 * LongHorizonScheduleView without owning state or persistence.
 */

import React from 'react';
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
} from './LongHorizonScheduleView.styles';
import { formatWorkoutPlannerExerciseName } from './workoutPlannerExerciseDisplay';

interface ScheduleHeaderProps {
  selectedMonth: number;
  selectedWeek: number;
  week: GeneratedPlanWeek | null;
  day: GeneratedPlanWeekDay | null;
}

interface MonthTabsProps {
  months: GeneratedPlanWeek[][];
  selectedMonth: number;
  onMonthChange: (monthNumber: number) => void;
}

interface WeekTabsProps {
  monthBlock: GeneratedPlanWeek[];
  selectedWeek: number;
  onWeekChange: (weekNumber: number) => void;
}

interface DayTabsProps {
  days: GeneratedPlanWeekDay[];
  selectedDay: number;
  onDayChange: (dayNumber: number) => void;
}

interface DayTabProps {
  day: GeneratedPlanWeekDay;
  dayNumber: number;
  isActive: boolean;
  onDayChange: (dayNumber: number) => void;
}

interface DayDetailProps {
  day: GeneratedPlanWeekDay | null;
}

const exerciseName = (ex: GeneratedPlanWeekDay['exercises'][number]): string => {
  if (ex.exerciseName) return formatWorkoutPlannerExerciseName(ex.exerciseName);
  if (ex.name) return formatWorkoutPlannerExerciseName(ex.name);
  return 'Unknown Exercise';
};

const exerciseSetCount = (ex: GeneratedPlanWeekDay['exercises'][number]): number => {
  if (Array.isArray(ex.sets)) return ex.sets.length;
  if (typeof ex.sets === 'number') return ex.sets;
  return 3;
};

const hasValue = <T,>(value: T | null | undefined): value is T => (
  value !== undefined && value !== null
);

const exerciseReps = (ex: GeneratedPlanWeekDay['exercises'][number]): string | number => {
  if (hasValue(ex.targetReps)) return ex.targetReps;
  if (hasValue(ex.reps)) return ex.reps;
  return '10';
};

const formatExerciseLine = (ex: GeneratedPlanWeekDay['exercises'][number]): string => (
  `${exerciseName(ex)} - ${exerciseSetCount(ex)} x ${exerciseReps(ex)}`
);

const dayTitle = (day: GeneratedPlanWeekDay): string => {
  if (day.name) return day.name;
  if (day.dayName) return day.dayName;
  return `Day ${day.dayNumber}`;
};

const dayChipMeta = (day: GeneratedPlanWeekDay): string => {
  if (day.name) return day.name;
  if (day.dayName) return day.dayName;
  if (day.focus) return day.focus;
  return '-';
};

const exerciseKeyBase = (ex: GeneratedPlanWeekDay['exercises'][number]): string => {
  if (ex.exerciseId) return ex.exerciseId;
  if (ex.exerciseName) return ex.exerciseName;
  if (ex.name) return ex.name;
  return 'ex';
};

const exerciseRowKey = (
  ex: GeneratedPlanWeekDay['exercises'][number],
  index: number,
) => `${exerciseKeyBase(ex)}-${index}`;

export const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  selectedMonth,
  selectedWeek,
  week,
  day,
}) => (
  <Header>
    <CalendarDays size={16} />
    <Title>Detailed Schedule</Title>
    <BreadcrumbDim>
      <span>Month {selectedMonth}</span>
      <ChevronRight size={12} />
      <span>Week {week?.weekNumber ?? selectedWeek}</span>
      <ChevronRight size={12} />
      <span>{day ? dayTitle(day) : 'Day'}</span>
    </BreadcrumbDim>
  </Header>
);

export const MonthTabs: React.FC<MonthTabsProps> = ({
  months,
  selectedMonth,
  onMonthChange,
}) => (
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
          onClick={() => onMonthChange(monthNumber)}
        >
          Month {monthNumber}
        </Tab>
      );
    })}
  </TabRow>
);

export const WeekTabs: React.FC<WeekTabsProps> = ({
  monthBlock,
  selectedWeek,
  onWeekChange,
}) => (
  <TabRow role="tablist" aria-label="Week">
    {monthBlock.map((week, idx) => {
      const weekNumberInMonth = idx + 1;
      const isActive = weekNumberInMonth === selectedWeek;
      return (
        <Tab
          key={week.weekNumber}
          role="tab"
          aria-selected={isActive}
          $active={isActive}
          $tone="primary"
          $compact
          type="button"
          onClick={() => onWeekChange(weekNumberInMonth)}
          title={week.focus || ''}
        >
          Week {week.weekNumber}
          {week.focus ? <SmallSubtext>{week.focus}</SmallSubtext> : null}
        </Tab>
      );
    })}
  </TabRow>
);

const DayTab: React.FC<DayTabProps> = ({
  day,
  dayNumber,
  isActive,
  onDayChange,
}) => (
  <DayChip
    key={day.dayNumber}
    role="tab"
    aria-selected={isActive}
    $active={isActive}
    type="button"
    onClick={() => onDayChange(dayNumber)}
  >
    <DayChipLabel>Day {day.dayNumber}</DayChipLabel>
    <DayChipMeta>
      {dayChipMeta(day)}
      <DayCount>- {day.exercises.length} ex</DayCount>
    </DayChipMeta>
  </DayChip>
);

export const DayTabs: React.FC<DayTabsProps> = ({
  days,
  selectedDay,
  onDayChange,
}) => {
  if (days.length === 0) {
    return (
      <DayList role="tablist" aria-label="Day">
        <Empty>This week has no populated days.</Empty>
      </DayList>
    );
  }

  return (
    <DayList role="tablist" aria-label="Day">
      {days.map((day, idx) => {
        const dayNumber = idx + 1;
        return (
          <DayTab
            key={day.dayNumber}
            day={day}
            dayNumber={dayNumber}
            isActive={dayNumber === selectedDay}
            onDayChange={onDayChange}
          />
        );
      })}
    </DayList>
  );
};

const DayExercises: React.FC<{ day: GeneratedPlanWeekDay }> = ({ day }) => {
  if (day.exercises.length === 0) return <Empty>No exercises populated for this day.</Empty>;
  return (
    <ExerciseList>
      {day.exercises.map((ex, index) => (
        <ExerciseRow key={exerciseRowKey(ex, index)}>
          <span>{formatExerciseLine(ex)}</span>
          {ex.rotationFallback ? (
            <FallbackBadge title="Rotation fallback - see L1 receipt">fallback</FallbackBadge>
          ) : null}
        </ExerciseRow>
      ))}
    </ExerciseList>
  );
};

export const DayDetail: React.FC<DayDetailProps> = ({ day }) => {
  if (!day) {
    return (
      <Detail>
        <Empty>Select a day above to see its exercises.</Empty>
      </Detail>
    );
  }

  return (
    <Detail>
      <DetailTitle>
        {dayTitle(day)}
        {day.focus ? <DetailFocus>{day.focus}</DetailFocus> : null}
      </DetailTitle>
      <DayExercises day={day} />
    </Detail>
  );
};
