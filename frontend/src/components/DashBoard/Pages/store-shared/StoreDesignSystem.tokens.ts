/**
 * StoreDesignSystem.tokens.ts - Theme-aware store/revenue tokens.
 * Provides shared colors, animation primitives, and currency helpers for
 * mounted admin Store/Revenue surfaces without hard-coding bright panels.
 */

import { keyframes } from 'styled-components';

export const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const STORE_TOKENS = {
  bg: {
    app: 'radial-gradient(circle at top right, var(--bg-base, #0A0A0F) 0%, var(--bg-elevated, #002060) 100%)',
    glass: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 72%, transparent) 0%, color-mix(in srgb, var(--bg-base, #0A0A0F) 82%, transparent) 100%)',
    glassHover: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)',
    dark: 'color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent)',
  },
  border: {
    subtle: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)',
    glass: 'color-mix(in srgb, var(--text-primary, #E0ECF4) 8%, transparent)',
    purple: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)',
    cyan: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)',
  },
  color: {
    cyan: 'var(--accent-primary, #60C0F0)',
    purple: 'var(--accent-secondary, #8B5CF6)',
    white: 'var(--text-primary, #E0ECF4)',
    muted: 'var(--text-muted, #A0A0B0)',
    completed: 'var(--accent-primary, #60C0F0)',
    pending: 'var(--accent-gold, #C6A84B)',
    inactive: 'var(--danger, #C92A54)',
    revenue: 'var(--accent-primary, #60C0F0)',
    tax: 'var(--danger, #C92A54)',
  },
  radius: {
    card: '16px',
    button: '8px',
    badge: '20px',
    table: '12px',
  },
} as const;

export const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

export const formatCurrencyCompact = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
