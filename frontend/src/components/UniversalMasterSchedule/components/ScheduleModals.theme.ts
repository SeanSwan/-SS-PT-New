/**
 * Theme bridge for Universal Master Schedule modal chrome.
 */

export const SCHEDULE_MODALS_THEME = {
  surfaceGlass: 'var(--bg-elevated, rgba(30, 30, 50, 0.72))',
  panelSurface: 'var(--bg-surface, #1A1A24)',
  accentPrimary: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, #CBD5E1)',
  textMuted: 'var(--text-muted, #94A3B8)',
  danger: 'var(--danger, #EF4444)',
  warning: 'var(--warning, #F59E0B)',
  credit: 'var(--info, #38BDF8)',
  borderSubtle: 'var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent))',
};

export const translucent = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`;
