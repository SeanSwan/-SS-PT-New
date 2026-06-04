/**
 * DayViewStacked pure helpers.
 *
 * Keeps date/session derivation outside the rendered component so the stacked
 * mobile schedule can stay under the project file-size ceiling.
 */
import type { DayViewSession, DayViewTrainer } from './DayView.types';
import { formatScheduleSlotTime } from '../utils/scheduleTimeSlots';

export const STACKED_DAY_VIEW_HOURS = Array.from({ length: 18 }, (_, index) => 5 + index);
export const MAX_INITIAL_TRAINERS = 6;

export const isSameScheduleDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const isPastScheduleTime = (date: Date, hour: number, minute = 0) => {
  const now = new Date();
  const slotDate = new Date(date);
  slotDate.setHours(hour, minute, 0, 0);
  return slotDate < now;
};

export const isScheduledDayViewSession = (session: DayViewSession) =>
  session.status !== 'available' && session.status !== 'cancelled';

export const formatStackedHour = (hour: number) => formatScheduleSlotTime(hour, 0);

export const getTrainerInitials = (name: string | undefined | null) => {
  if (!name) return '??';
  const parts = name.split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const deriveStackedTrainerList = (sessionsForDay: DayViewSession[]) => {
  const map = new Map<string, DayViewTrainer>();
  sessionsForDay.forEach((session) => {
    if (!session.trainerId && !session.trainerName) return;
    const id = session.trainerId ?? session.trainerName ?? 'trainer';
    const key = String(id);
    if (!map.has(key)) {
      map.set(key, { id, name: session.trainerName || `Trainer ${key}` });
    }
  });
  return Array.from(map.values());
};
