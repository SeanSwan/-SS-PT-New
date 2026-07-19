/**
 * Dashboards v2 — semantic accent slot → --dash-* token (shared, no color names in components).
 * StatDef.accent is a semantic slot; components map it here to the theme token. Never a hex.
 */
import type { StatDef } from '../types';

export const accentVar = (accent: StatDef['accent']): string => {
  switch (accent) {
    case 'action':
      return 'var(--dash-action)';
    case 'good':
      return 'var(--dash-good)';
    case 'warn':
      return 'var(--dash-warn)';
    case 'bad':
      return 'var(--dash-bad)';
    case 'lens':
    default:
      return 'var(--dash-accent)';
  }
};

export const deltaVar = (tone: 'good' | 'bad' | 'neutral'): string =>
  tone === 'good' ? 'var(--dash-good)' : tone === 'bad' ? 'var(--dash-bad)' : 'var(--dash-ink-2)';
