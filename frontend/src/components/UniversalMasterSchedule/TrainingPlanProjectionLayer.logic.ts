/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.logic.ts
 * PURPOSE: Derive bounded projection windows and separate coexistence metadata.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Computes local date-only API ranges, strict staff client
 * scope, appointment coexistence keys, trainer filtering, and date grouping.
 * HOW IT FITS IN THE APP: Shared by the UMS projection hook and read-only view.
 * KEY DECISIONS: Session objects contribute only a same-day annotation key;
 * they are never converted, merged, or copied into projection objects.
 */

import type { ScheduleView } from '../../redux/slices/scheduleSlice';
import type { TrainingPlanProjection } from '../../services/training-plan-projection-service';
import { localDayKey, sessionDayKey } from './components/ScheduleDayStrip.logic';

export interface ProjectionClientLike { id?: string | number | null }
export interface ProjectionSessionLike {
  userId?: string | number | null;
  clientId?: string | number | null;
  sessionDate?: string | Date | null;
  start?: string | Date | null;
  startTime?: string | Date | null;
}

const strictPositiveId = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
};

const validDate = (value: Date): Date => Number.isNaN(value.getTime()) ? new Date() : new Date(value);
const localDate = (value: Date): Date => {
  const date = validDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
};
const shiftedDate = (value: Date, days: number): Date => {
  const date = localDate(value);
  date.setDate(date.getDate() + days);
  return date;
};

export const buildProjectionRange = (
  view: ScheduleView,
  selectedDate: Date,
): { startDate: string; endDate: string } => {
  const selected = localDate(selectedDate);
  if (view === 'month') {
    return {
      startDate: localDayKey(new Date(selected.getFullYear(), selected.getMonth(), 1, 12)),
      endDate: localDayKey(new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 12)),
    };
  }
  if (view === 'week') {
    const mondayOffset = (selected.getDay() + 6) % 7;
    const start = shiftedDate(selected, -mondayOffset);
    return { startDate: localDayKey(start), endDate: localDayKey(shiftedDate(start, 6)) };
  }
  if (view === 'agenda') {
    return { startDate: localDayKey(selected), endDate: localDayKey(shiftedDate(selected, 29)) };
  }
  const day = localDayKey(selected);
  return { startDate: day, endDate: day };
};

export const normalizeProjectionClientScope = (clients: readonly ProjectionClientLike[]) => {
  const validIds = [...new Set(clients.map(({ id }) => strictPositiveId(id)).filter((id): id is number => id !== null))];
  return {
    clientIds: validIds.slice(0, 50),
    limited: validIds.length > 50,
    totalValidClients: validIds.length,
  };
};

export const buildAppointmentCoexistenceKeys = (
  sessions: readonly ProjectionSessionLike[],
): Set<string> => {
  const keys = new Set<string>();
  sessions.forEach((session) => {
    const clientId = strictPositiveId(session.userId ?? session.clientId);
    const date = sessionDayKey(session);
    if (clientId && date) keys.add(`${clientId}:${date}`);
  });
  return keys;
};

export const filterProjectionItemsByTrainer = (
  items: readonly TrainingPlanProjection[],
  trainerId?: string | number | null,
): TrainingPlanProjection[] => {
  const normalizedTrainerId = strictPositiveId(trainerId);
  return normalizedTrainerId
    ? items.filter((item) => item.trainerId === normalizedTrainerId)
    : [...items];
};

export interface ProjectionDateGroup {
  date: string;
  items: TrainingPlanProjection[];
}

export const groupProjectionItemsByDate = (
  items: readonly TrainingPlanProjection[],
): ProjectionDateGroup[] => {
  const grouped = new Map<string, TrainingPlanProjection[]>();
  items.forEach((item) => grouped.set(
    item.scheduledDate,
    [...(grouped.get(item.scheduledDate) || []), item],
  ));
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, groupedItems]) => ({ date, items: groupedItems }));
};