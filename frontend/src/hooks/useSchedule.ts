import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  ScheduleView,
  setCalendarView,
  setSelectedDate,
  selectSession,
  setFilters,
  resetFilters
} from '../redux/slices/scheduleSlice';

const toSafeDate = (value?: string) => {
  if (!value) {
    return new Date();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

export const useSchedule = () => {
  const dispatch = useAppDispatch();
  const schedule = useAppSelector((state) => state.schedule);

  const activeView: ScheduleView = schedule.view;
  const currentDate = toSafeDate(schedule.selectedDate);

  return {
    activeView,
    currentDate,
    selectedSessionId: schedule.selectedSessionId,
    filters: schedule.filters,
    setView: useCallback((view: ScheduleView) => dispatch(setCalendarView(view)), [dispatch]),
    setDate: useCallback((date: Date) => dispatch(setSelectedDate(date.toISOString())), [dispatch]),
    selectSession: useCallback(
      (id: string | number | null) => dispatch(selectSession(id)),
      [dispatch]
    ),
    setFilters: useCallback(
      (filters: Parameters<typeof setFilters>[0]) => dispatch(setFilters(filters)),
      [dispatch]
    ),
    resetFilters: useCallback(() => dispatch(resetFilters()), [dispatch]),
    drillDownToDay: useCallback((date: Date) => {
      dispatch(setSelectedDate(date.toISOString()));
      dispatch(setCalendarView('day'));
    }, [dispatch])
  };
};
