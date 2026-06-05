/**
 * WorkoutLogger Crystalline Swan Color Palette
 * Shared across all WorkoutLogger sub-components.
 */
import { keyframes, css } from 'styled-components';

const clampOpacity = (opacity: number): number =>
  Math.min(1, Math.max(0, opacity));

/** Convert a color token to an alpha-safe overlay. */
export const withAlpha = (color: string, opacity: number): string => {
  const safeOpacity = clampOpacity(opacity);
  const trimmedColor = color.trim();

  if (color.startsWith('var(') || !trimmedColor.startsWith('#')) {
    return `color-mix(in srgb, ${color} ${safeOpacity * 100}%, transparent)`;
  }

  const cleanHex = trimmedColor.replace('#', '');
  if (cleanHex.length !== 6) {
    return `color-mix(in srgb, ${color} ${safeOpacity * 100}%, transparent)`;
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${safeOpacity})`;
};

export const CS = {
  bg: 'var(--bg-elevated, #141419)',
  surface: 'var(--bg-surface, #1A1A24)',
  card: 'var(--surface-card-glass, rgba(20, 20, 25, 0.75))',
  cardSolid: 'var(--bg-elevated, #141419)',
  accent: 'var(--accent-gold, #C6A84B)',
  gaming: 'var(--accent-primary, #60C0F0)',
  glow: 'var(--chart-primary, #50A0F0)',
  glowLight: 'var(--accent-primary-light, #7CB8F4)',
  secondary: 'var(--accent-secondary, #8B5CF6)',
  secondaryLight: 'var(--accent-secondary-light, #A78BFA)',
  tertiary: 'var(--accent-tertiary, #4070C0)',
  text: 'var(--text-primary, #E0ECF4)',
  textSecondary: 'var(--text-secondary, #c8d6e5)',
  textMuted: 'var(--text-muted, #94a3b8)',
  border: 'var(--border-primary-soft, rgba(80, 160, 240, 0.2))',
  borderSolid: 'var(--border-primary-strong, #4a6382)',
  glassBorder: 'var(--border-primary-faint, rgba(80, 160, 240, 0.15))',
  success: 'var(--success, #10b981)',
  warning: 'var(--warning, #f59e0b)',
  error: 'var(--danger, #ef4444)',
  inputBg: 'var(--input-bg, rgba(20, 20, 25, 0.7))',

  bgDeep: 'var(--bg-base, #0A0A0F)',
  cardDark: 'var(--bg-elevated, #141419)',
  surfaceDark: 'var(--bg-surface, #1A1A24)',
  inputBgDark: 'var(--input-bg, rgba(20, 20, 25, 0.7))',

  warningBg: withAlpha('var(--warning, #f59e0b)', 0.12),
  successBg: withAlpha('var(--success, #10b981)', 0.12),
  errorBg: withAlpha('var(--danger, #ef4444)', 0.12),
  infoBg: withAlpha('var(--chart-primary, #50a0f0)', 0.12),

  warningBorder: withAlpha('var(--warning, #f59e0b)', 0.35),
  successBorder: withAlpha('var(--success, #10b981)', 0.35),
  errorBorder: withAlpha('var(--danger, #ef4444)', 0.35),
  infoBorder: withAlpha('var(--chart-primary, #50a0f0)', 0.35),

  warningText: 'var(--warning-text, #fbbf24)',
  successText: 'var(--success-text, #34d399)',
  errorText: 'var(--danger-text, #f87171)',
};

/** Duration constants */
export const MINUTES_PER_SET = 3;
export const MAX_WORKOUT_DURATION = 120;

/** Standardized error message extraction */
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
};

/** Reduced motion CSS mixin wraps animations to respect prefers-reduced-motion. */
export const reducedMotionSafe = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
`;

export const stellarGlow = keyframes`
  0% { box-shadow: 0 0 8px ${withAlpha(CS.glow, 0.2)}, 0 0 0 ${withAlpha(CS.gaming, 0)}; }
  50% { box-shadow: 0 0 24px ${withAlpha(CS.glow, 0.5)}, 0 0 48px ${withAlpha(CS.gaming, 0.1)}; }
  100% { box-shadow: 0 0 8px ${withAlpha(CS.glow, 0.2)}, 0 0 0 ${withAlpha(CS.gaming, 0)}; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const crystallinePulse = keyframes`
  0% { opacity: 0.03; }
  50% { opacity: 0.08; }
  100% { opacity: 0.03; }
`;
