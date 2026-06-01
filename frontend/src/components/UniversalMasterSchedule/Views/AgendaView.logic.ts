import type { SessionCardData } from '../Cards/SessionCard';

export interface AgendaSession extends SessionCardData {
  trainerName?: string;
  clientName?: string;
}

export const AGENDA_VIEW_THEME = {
  surface: 'var(--card-bg, rgba(10, 10, 15, 0.88))',
  border: 'var(--border, rgba(96, 192, 240, 0.16))',
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.72))',
  success: 'var(--success, #10b981)',
  danger: 'var(--danger, #ef4444)',
  completed: 'var(--text-muted, rgba(148, 163, 184, 0.74))',
  activeGlow: '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent)',
};

export const stripTime = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const formatGroupLabel = (target: Date) => {
  const today = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const diff = Math.floor((stripTime(target).getTime() - stripTime(today).getTime()) / oneDay);

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  return target.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });
};

export const getAgendaGroups = (
  date: Date,
  sessions: AgendaSession[],
  isAdmin: boolean
) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
  const rangeStart = new Date(monthStart);
  rangeStart.setDate(rangeStart.getDate() - 7);
  const rangeEnd = new Date(monthEnd);
  rangeEnd.setDate(rangeEnd.getDate() + 7);

  const filtered = sessions.filter((session) => {
    const sessionDate = new Date(session.sessionDate);
    if (sessionDate < rangeStart || sessionDate > rangeEnd) return false;
    if (!isAdmin && session.status === 'available' && !session.clientName) return false;
    return true;
  });

  const map = new Map<string, AgendaSession[]>();
  const sorted = [...filtered].sort((a, b) => {
    return new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime();
  });

  sorted.forEach((session) => {
    const sessionDate = new Date(session.sessionDate);
    const key = sessionDate.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)?.push(session);
  });

  return Array.from(map.entries()).map(([key, list]) => ({
    key,
    label: formatGroupLabel(new Date(key)),
    sessions: list
  }));
};
