import type { SessionDetail, SessionDetailModalMode } from './SessionDetailModal.types';
import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';

const STATUS_TONES: Record<string, string> = {
  available: 'var(--schedule-status-available, #3b82f6)',
  scheduled: 'var(--schedule-status-scheduled, #10b981)',
  confirmed: 'var(--schedule-status-confirmed, #059669)',
  completed: 'var(--schedule-status-completed, #6b7280)',
  cancelled: 'var(--schedule-status-cancelled, #ef4444)',
  blocked: 'var(--schedule-status-blocked, #f59e0b)',
};

export const getStatusTone = (status?: string | null) =>
  STATUS_TONES[status || ''] || STATUS_TONES.available;

const normalizeCreditCount = (value: unknown) => {
  if (value === null || value === '') return 1;
  const credits = typeof value === 'number' ? value : Number(value);
  return Number.isSafeInteger(credits) && credits >= 0 ? credits : 1;
};

const getSessionTypeCreditsRequired = (session: SessionDetail | null) => {
  if (!session || !session.sessionType || typeof session.sessionType === 'string') {
    return 1;
  }

  return normalizeCreditCount(session.sessionType.creditsRequired);
};

export const buildScheduleLogWorkoutLabel = (session: SessionDetail | null) => {
  if (!session) {
    return 'Log Workout';
  }

  if (isNonDeductingClientSource(session.clientSource)) {
    return 'Log Workout (no paid credit)';
  }

  if (session.sessionDeducted) {
    return 'Log Workout (deducted)';
  }

  const credits = getSessionTypeCreditsRequired(session);
  if (credits < 1) {
    return 'Log Workout (no paid credit)';
  }

  return `Log Workout (${credits} credit${credits === 1 ? '' : 's'})`;
};

export const buildScheduleReturnRoute = (mode: SessionDetailModalMode) => {
  if (mode === 'admin') {
    return '/dashboard/admin/master-schedule';
  }

  const dashPath = mode === 'client' ? 'client' : mode;
  return `/dashboard/${dashPath}/schedule`;
};

export const buildScheduleWorkoutLoggerRoute = (
  mode: SessionDetailModalMode,
  session: SessionDetail
) => {
  const params = new URLSearchParams();
  params.set('clientId', String(session.userId));
  params.set('sessionId', String(session.id));
  params.set('sessionDate', String(session.sessionDate));
  params.set('source', 'master-schedule');
  params.set('returnTo', buildScheduleReturnRoute(mode));
  params.set('loadPlan', 'today');
  params.set('sessionCredits', String(getSessionTypeCreditsRequired(session)));

  if (mode === 'admin') {
    params.set('tab', 'training');
    params.set('trainingSection', 'logger');
    return `/dashboard/admin/client-management?${params.toString()}`;
  }

  const dashPath = mode === 'client' ? 'client' : mode;
  return `/dashboard/${dashPath}/log-workout?${params.toString()}`;
};

export const buildScheduleCoachRoute = (
  mode: SessionDetailModalMode,
  session: SessionDetail
) => {
  const returnRoute = buildScheduleReturnRoute(mode);
  const params = new URLSearchParams();
  params.set('clientId', String(session.userId));
  params.set('intent', 'log_workout');
  params.set('source', 'master-schedule');
  params.set('sourcePath', returnRoute);
  params.set('returnTo', returnRoute);
  params.set('sessionId', String(session.id));
  params.set('sessionDate', String(session.sessionDate));
  params.set('sessionCredits', String(getSessionTypeCreditsRequired(session)));

  const dashPath = mode === 'client' ? 'client' : mode;
  return `/dashboard/${dashPath}/coach-assistant?${params.toString()}`;
};

export const buildScheduleWorkoutsRoute = (
  mode: SessionDetailModalMode,
  session: SessionDetail
) => {
  if (mode === 'client') {
    return '/dashboard/client/workouts';
  }

  const params = new URLSearchParams();
  params.set('clientId', String(session.userId));

  if (mode === 'admin') {
    params.set('tab', 'training');
    params.set('trainingSection', 'history');
    return `/dashboard/admin/client-management?${params.toString()}`;
  }

  return `/dashboard/trainer/client-progress?${params.toString()}`;
};

const isPositiveInteger = (value: unknown) => {
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value.trim())) return false;
  const parsedValue = Number(value);
  return Number.isSafeInteger(parsedValue) && parsedValue > 0;
};

const isUsableSessionDate = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  const sessionDate = new Date(value);
  if (Number.isNaN(sessionDate.getTime())) return false;

  const latestLoggableDate = new Date();
  latestLoggableDate.setHours(23, 59, 59, 999);
  return sessionDate <= latestLoggableDate;
};

export const canSessionOpenWorkoutLogger = (session: SessionDetail | null) => {
  if (!session) return false;

  return Boolean(
    isPositiveInteger(session.id)
    && isPositiveInteger(session.userId)
    && isUsableSessionDate(session.sessionDate)
    && session.status !== 'cancelled'
    && session.status !== 'blocked'
    && !session.isBlocked
    && session.attendanceStatus !== 'no_show'
  );
};

export const canSessionBeCompleted = (session: SessionDetail | null) => {
  if (!session) return false;

  return Boolean(
    isPositiveInteger(session.id)
    && isUsableSessionDate(session.sessionDate)
    && (session.status === 'scheduled' || session.status === 'confirmed')
    && !session.isBlocked
    && session.attendanceStatus !== 'no_show'
  );
};

/** S1: local-date-only string for the Plan Reveal — never toISOString()
 *  (UTC would shift an evening session onto tomorrow's plan day). */
export const sessionDateToLocalISO = (date: Date | null | undefined): string | null => {
  if (!date || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
