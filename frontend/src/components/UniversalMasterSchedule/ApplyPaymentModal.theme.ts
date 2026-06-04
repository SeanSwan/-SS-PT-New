/**
 * Theme bridge for the schedule payment recovery modal.
 */

export const APPLY_PAYMENT_THEME = {
  accentPrimary: 'var(--accent-primary, #60C0F0)',
  accentSecondary: 'var(--accent-secondary, #8B5CF6)',
  textPrimary: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, #CBD5E1)',
  danger: 'var(--danger, #EF4444)',
  warning: 'var(--warning, #F59E0B)',
  success: 'var(--success, #10B981)',
  credit: 'var(--info, #38BDF8)',
};

export const translucent = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`;
