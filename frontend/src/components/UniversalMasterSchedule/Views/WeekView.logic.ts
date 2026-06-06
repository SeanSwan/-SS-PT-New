import type { KeyboardEvent } from 'react';
import {
  isNonDeductingClientSource,
  normalizeAvailableSessions,
} from '../../DashBoard/workspaces/clients-team/clientSessionSignal';

export const HOURS = Array.from({ length: 18 }, (_, index) => 5 + index);
export const PIXELS_PER_HOUR = 64;
export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const WEEK_VIEW_THEME = {
  surface: 'var(--bg-elevated, #141419)',
  surfaceSoft: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)',
  surfaceFocus: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent)',
  todaySurface: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)',
  todayColumn: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)',
  border: 'var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent))',
  borderSoft: 'var(--border-soft, color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent))',
  borderAccent: 'var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent))',
  borderAccentStrong: 'var(--border-accent-strong, color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent))',
  primary: 'var(--accent-primary, #60C0F0)',
  primaryData: 'var(--chart-line, #50A0F0)',
  success: 'var(--success, #10b981)',
  danger: 'var(--danger, #ef4444)',
  warning: 'var(--warning, #f59e0b)',
  purple: 'var(--accent-secondary, #8B5CF6)',
  purpleSoft: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 25%, transparent)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, #CBD5E1)',
  textMuted: 'var(--text-muted, #94A3B8)',
  textFaint: 'var(--text-faint, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent))',
  shadow: 'color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent)',
};

export interface WeekViewProps {
  date: Date;
  sessions: any[];
  trainers?: any[];
  canQuickBook?: boolean;
  isAdmin?: boolean;
  onSelectSession?: (session: any) => void;
  onSelectSlot?: (slot: { date: Date; hour: number; minute?: number }) => void;
  onDrillDown?: (day: Date) => void;
  onBookingDialog?: (session: any) => void;
}

export function getWeekDays(centerDate: Date): Date[] {
  const start = new Date(centerDate);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(day.getDate() + index);
    return day;
  });
}

export function getSessionsForDay(sessions: any[], day: Date): any[] {
  return sessions.filter((session) => {
    const sessionDate = new Date(session.sessionDate);
    return (
      sessionDate.getFullYear() === day.getFullYear() &&
      sessionDate.getMonth() === day.getMonth() &&
      sessionDate.getDate() === day.getDate()
    );
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatHour(hour: number): string {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatDayHeader(day: Date): string {
  return `${day.getMonth() + 1}/${day.getDate()}`;
}

export function getDayKey(day: Date): string {
  return `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
}

export function isKeyboardActivationKey(event: KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar';
}

export function formatVisibleDaysLabel(visibleDays: Date[]): string {
  if (visibleDays.length === 1) {
    return visibleDays[0].toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  const start = visibleDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = visibleDays[visibleDays.length - 1].toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  return `${start} - ${end}`;
}

export function getWeekSessionDisplay(session: any) {
  const sessionDate = new Date(session.sessionDate);
  const hour = sessionDate.getHours();
  if (hour < 5 || hour >= 22) return null;

  const minutes = sessionDate.getMinutes();
  const durationMinutes = Number(session.duration) || 60;
  const status = session.status || 'available';
  const clientName =
    session.clientName ||
    (session.client
      ? `${session.client.firstName || ''} ${session.client.lastName || ''}`.trim()
      : '');
  const trainerName =
    session.trainerName ||
    (session.trainer
      ? `${session.trainer.firstName || ''} ${session.trainer.lastName || ''}`.trim()
      : '');
  const clientSource = session.clientSource ?? session.client?.clientSource;
  const rawSessionsLeft = isNonDeductingClientSource(clientSource)
    ? null
    : session.packageInfo?.sessionsRemaining ??
      session.clientAvailableSessions ??
      session.client?.availableSessions;
  const sessionsLeft = rawSessionsLeft == null ? null : normalizeAvailableSessions(rawSessionsLeft);

  return {
    status,
    clientName,
    trainerName,
    sessionsLeft,
    top: (hour - 5) * PIXELS_PER_HOUR + (minutes / 60) * PIXELS_PER_HOUR,
    height: (durationMinutes / 60) * PIXELS_PER_HOUR,
    timeStr: sessionDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
}
