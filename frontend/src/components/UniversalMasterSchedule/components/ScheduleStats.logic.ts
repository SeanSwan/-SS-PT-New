export interface Stats {
  total: number;
  available: number;
  scheduled: number;
  completed: number;
  other: number;
  staleAvailable: number;
}

export interface CardConfig {
  key: string;
  label: string;
  subtitle: string;
  definition: string;
  color: string;
  getValue: (stats: Stats) => number;
}

export const SCHEDULE_STAT_COLORS = {
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  success: 'var(--success, #10b981)',
  warning: 'var(--warning, #f59e0b)',
  danger: 'var(--danger, #ef4444)',
  muted: 'var(--text-muted, #94a3b8)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, #cbd5e1)',
  textFaint: 'var(--text-muted, #94a3b8)',
  surface: 'var(--bg-surface, #1A1A24)',
  elevated: 'var(--bg-elevated, #141419)',
  base: 'var(--bg-base, #0A0A0F)',
};

export const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'total',
    label: 'Total Sessions',
    subtitle: 'All in scope',
    definition: 'All sessions in current scope and date range',
    color: SCHEDULE_STAT_COLORS.secondary,
    getValue: (stats) => stats.total,
  },
  {
    key: 'available',
    label: 'Available',
    subtitle: 'Upcoming open slots',
    definition: 'Open slots today or later, not yet booked by a client',
    color: SCHEDULE_STAT_COLORS.primary,
    getValue: (stats) => stats.available,
  },
  {
    key: 'scheduled',
    label: 'Scheduled',
    subtitle: 'Upcoming booked',
    definition: 'Booked or confirmed sessions today or later',
    color: SCHEDULE_STAT_COLORS.success,
    getValue: (stats) => stats.scheduled,
  },
  {
    key: 'completed',
    label: 'Completed',
    subtitle: 'Finished sessions',
    definition: 'Sessions that have been finished',
    color: SCHEDULE_STAT_COLORS.muted,
    getValue: (stats) => stats.completed,
  },
  {
    key: 'other',
    label: 'Cancelled',
    subtitle: 'Cancelled sessions',
    definition: 'Sessions that were cancelled',
    color: SCHEDULE_STAT_COLORS.warning,
    getValue: (stats) => stats.other,
  },
];

export const STATUS_COLORS: Record<string, string> = {
  available: SCHEDULE_STAT_COLORS.primary,
  scheduled: SCHEDULE_STAT_COLORS.success,
  confirmed: 'color-mix(in srgb, var(--success, #10b981) 78%, var(--accent-primary, #60C0F0) 22%)',
  completed: SCHEDULE_STAT_COLORS.muted,
  cancelled: SCHEDULE_STAT_COLORS.danger,
  blocked: SCHEDULE_STAT_COLORS.warning,
  requested: SCHEDULE_STAT_COLORS.secondary,
};

export function isUpcoming(session: any): boolean {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return true;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return new Date(date) >= startOfToday;
}

function getSessionDate(session: any): Date {
  const date = session.sessionDate || session.start || session.startTime;
  return date ? new Date(date) : new Date(0);
}

export function getSessionsForFilter(sessions: any[], filterKey: string): any[] {
  if (filterKey === 'total') {
    return sessions.filter((session) => {
      if (session.status === 'available') return isUpcoming(session);
      if (session.status === 'scheduled' || session.status === 'confirmed') return isUpcoming(session);
      if (session.status === 'completed') return true;
      return false;
    });
  }
  if (filterKey === 'scheduled') {
    return sessions.filter(
      (session) => (session.status === 'scheduled' || session.status === 'confirmed') && isUpcoming(session)
    );
  }
  if (filterKey === 'available') {
    return sessions.filter((session) => session.status === 'available' && isUpcoming(session));
  }
  if (filterKey === 'other') {
    return sessions.filter((session) => session.status === 'cancelled');
  }
  return sessions.filter((session) => session.status === filterKey);
}

export function sortSessions(sessions: any[], filterKey: string): any[] {
  const sorted = [...sessions];
  if (filterKey === 'completed') {
    sorted.sort((a, b) => getSessionDate(b).getTime() - getSessionDate(a).getTime());
  } else {
    sorted.sort((a, b) => getSessionDate(a).getTime() - getSessionDate(b).getTime());
  }
  return sorted;
}

function keyPart(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  return raw || fallback;
}

export function getScheduleSessionRowKey(session: any): string {
  const persistedId = keyPart(session?.id ?? session?._id, '');
  if (persistedId) {
    return `schedule-session|id|${persistedId}`;
  }

  const start = session?.sessionDate ?? session?.start ?? session?.startTime;
  const end = session?.endDate ?? session?.end ?? session?.endTime;
  const trainerId = session?.trainerId ?? session?.trainer?.id ?? session?.trainer?.userId;
  const clientId = session?.userId ?? session?.clientId ?? session?.client?.id ?? session?.client?.userId ?? session?.clientName;

  return [
    'schedule-session',
    'draft',
    keyPart(start, 'no-start'),
    keyPart(end, 'no-end'),
    keyPart(session?.status, 'unknown-status'),
    keyPart(session?.duration, 'unknown-duration'),
    keyPart(trainerId, 'no-trainer'),
    keyPart(clientId, 'no-client'),
    keyPart(session?.location, 'no-location'),
  ].join('|');
}

export function formatPersonName(person: any): string {
  if (!person) return '-';
  const first = person.firstName || '';
  const last = person.lastName || '';
  return `${first} ${last}`.trim() || person.email || '-';
}

export function formatSessionDate(session: any): string {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return 'No date';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSessionTime(session: any): string {
  const date = session.sessionDate || session.start || session.startTime;
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}
