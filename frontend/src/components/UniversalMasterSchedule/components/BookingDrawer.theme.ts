/**
 * Theme bridge for the Universal Master Schedule quick-book drawer.
 * Keep visual tokens connected to the active Crystalline Swan theme.
 */

export const BOOKING_DRAWER_THEME = {
  drawerSurface: 'var(--bg-elevated, rgba(30, 30, 50, 0.82))',
  panelSurface: 'var(--bg-surface, #1A1A24)',
  baseSurface: 'var(--bg-base, #0A0A0F)',
  accentPrimary: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textMuted: 'var(--text-muted, #8892b0)',
  textInverse: 'var(--text-inverse, #0F172A)',
  success: 'var(--success, #10B981)',
  danger: 'var(--danger, #EF4444)',
  borderAccent: 'var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent))',
  subtleBorder: 'var(--border-subtle, color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent))',
  softShadow: 'var(--shadow-strong, -8px 0 32px color-mix(in srgb, var(--bg-base, #0A0A0F) 50%, transparent))',
  confirmGlow: 'var(--shadow-glow-primary, 0 0 15px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent))',
};

export const translucent = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`;
