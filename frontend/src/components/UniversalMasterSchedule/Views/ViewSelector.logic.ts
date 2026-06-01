export type ViewType = 'month' | 'week' | 'day' | 'agenda';

export const VIEW_SELECTOR_THEME = {
  surface: 'var(--card-bg, rgba(10, 10, 15, 0.88))',
  surfaceStrong: 'var(--bg-elevated, rgba(20, 20, 25, 0.95))',
  border: 'var(--border, rgba(96, 192, 240, 0.18))',
  primary: 'var(--accent-primary, #60C0F0)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  base: 'var(--bg-base, #0A0A0F)',
  text: 'var(--text-primary, #E0ECF4)',
  textSoft: 'var(--text-secondary, rgba(224, 236, 244, 0.78))',
  hoverSurface: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 11%, transparent)',
  activeGlow: '0 0 16px color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)',
  activeGradient: 'linear-gradient(135deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6))',
};

export const VIEW_LABELS: Array<{ value: ViewType; label: string }> = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' }
];

export const shiftDate = (date: Date, view: ViewType, direction: 'prev' | 'next') => {
  const next = new Date(date);
  const delta = direction === 'next' ? 1 : -1;

  if (view === 'month') {
    next.setMonth(next.getMonth() + delta);
    return next;
  }

  if (view === 'day') {
    next.setDate(next.getDate() + delta);
    return next;
  }

  next.setDate(next.getDate() + 7 * delta);
  return next;
};

export const formatHeaderDate = (date: Date, view: ViewType) => {
  if (view === 'day') {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });
};
