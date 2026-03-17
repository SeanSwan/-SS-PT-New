/**
 * WorkoutLogger Crystalline Swan Color Palette
 * Shared across all WorkoutLogger sub-components
 *
 * Derived tokens (Bg/Border variants) are computed once at module load
 * via withAlpha() — zero runtime overhead per AI Village Phase 3 consensus.
 */
import { keyframes, css } from 'styled-components';

/** Convert hex color to rgba string at a given opacity */
export const withAlpha = (hex: string, opacity: number): string => {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const CS = {
  // ── Base Semantic Colors ──
  bg: '#002060',             // Midnight Sapphire
  surface: '#003080',         // Royal Depth
  card: 'rgba(0, 32, 96, 0.75)',  // Glass
  cardSolid: '#00275a',
  accent: '#C6A84B',          // Gilded Fern (luxury)
  gaming: '#60C0F0',          // Ice Wing
  glow: '#50A0F0',            // Arctic Cyan — GLOW ACCENT
  glowLight: '#7CB8F4',       // Arctic Cyan Light (WCAG AA on dark)
  secondary: '#8B5CF6',       // Wing Purple — secondary accent
  secondaryLight: '#A78BFA',  // Wing Purple Light
  tertiary: '#4070C0',        // Swan Lavender
  text: '#E0ECF4',            // Frost White
  textSecondary: '#c8d6e5',
  border: 'rgba(80, 160, 240, 0.2)',
  borderSolid: '#4a6382',
  glassBorder: 'rgba(80, 160, 240, 0.15)',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  inputBg: 'rgba(0, 48, 128, 0.5)',

  // ── Derived Badge Tokens (calculated once at module load) ──
  warningBg: withAlpha('#f59e0b', 0.12),
  successBg: withAlpha('#10b981', 0.12),
  errorBg: withAlpha('#ef4444', 0.12),
  infoBg: withAlpha('#50a0f0', 0.12),

  warningBorder: withAlpha('#f59e0b', 0.35),
  successBorder: withAlpha('#10b981', 0.35),
  errorBorder: withAlpha('#ef4444', 0.35),
  infoBorder: withAlpha('#50a0f0', 0.35),

  // WCAG-safe badge text colors (high contrast on dark)
  warningText: '#fbbf24',
  successText: '#34d399',
  errorText: '#f87171',
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

/** Reduced motion CSS mixin — wraps animations to respect prefers-reduced-motion */
export const reducedMotionSafe = css`
  @media (prefers-reduced-motion: reduce) {
    animation: none !important;
    transition-duration: 0.01ms !important;
  }
`;

export const stellarGlow = keyframes`
  0% { box-shadow: 0 0 8px rgba(80, 160, 240, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
  50% { box-shadow: 0 0 24px rgba(80, 160, 240, 0.5), 0 0 48px rgba(96, 192, 240, 0.1); }
  100% { box-shadow: 0 0 8px rgba(80, 160, 240, 0.2), 0 0 0 rgba(96, 192, 240, 0); }
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
