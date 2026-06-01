export type SessionBucket = {
  total: number;
  blocked: number;
  orbs: MonthViewOrb[];
};

export type MonthViewOrb = {
  key: string;
  status: string;
  isBlocked: boolean;
};

export const MONTH_VIEW_THEME = {
  base: 'var(--bg-base, #0A0A0F)',
  surface: 'var(--card-bg, rgba(10, 10, 15, 0.88))',
  surfaceDim: 'color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent)',
  surfacePast: 'color-mix(in srgb, var(--bg-elevated, rgba(20, 20, 25, 0.95)) 58%, transparent)',
  border: 'var(--border, rgba(96, 192, 240, 0.16))',
  borderSoft: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)',
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.72))',
  textFaint: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 30%, transparent)',
  success: 'var(--success, #10b981)',
  danger: 'var(--danger, #ef4444)',
  activeGlow: '0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent)',
  blockedSurface: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent)',
  blockedBorder: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 55%, transparent)',
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

function keyPart(value: unknown, fallback: string): string {
  const raw = String(value ?? '').trim();
  return raw || fallback;
}

export function getMonthViewSessionOrbKey(dayKey: string, session: any): string {
  const persistedId = keyPart(session?.id ?? session?._id, '');
  if (persistedId) {
    return `month-session-orb|id|${persistedId}`;
  }

  const start = session?.sessionDate ?? session?.start ?? session?.startTime ?? dayKey;
  const end = session?.endDate ?? session?.end ?? session?.endTime;
  const trainerId = session?.trainerId ?? session?.trainer?.id ?? session?.trainer?.userId;
  const clientId = session?.userId ?? session?.clientId ?? session?.client?.id ?? session?.client?.userId ?? session?.clientName;

  return [
    'month-session-orb',
    'draft',
    keyPart(dayKey, 'no-day'),
    keyPart(start, 'no-start'),
    keyPart(end, 'no-end'),
    keyPart(session?.status, 'unknown-status'),
    keyPart(session?.duration, 'unknown-duration'),
    keyPart(trainerId, 'no-trainer'),
    keyPart(clientId, 'no-client'),
    keyPart(session?.location, 'no-location'),
  ].join('|');
}

export const statusColor = (status?: string, isBlocked?: boolean) => {
  if (isBlocked || status === 'blocked') {
    return MONTH_VIEW_THEME.secondary;
  }

  switch (status) {
    case 'confirmed':
      return MONTH_VIEW_THEME.success;
    case 'scheduled':
    case 'booked':
      return MONTH_VIEW_THEME.primary;
    case 'completed':
      return MONTH_VIEW_THEME.textFaint;
    case 'cancelled':
      return MONTH_VIEW_THEME.danger;
    default:
      return MONTH_VIEW_THEME.primary;
  }
};
