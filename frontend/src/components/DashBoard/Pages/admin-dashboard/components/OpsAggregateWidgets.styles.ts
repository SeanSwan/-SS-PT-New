/**
 * ┌─── OPS AGGREGATE WIDGETS ──────────────────────────────────┐
 * │ PARENT: AdminOverviewPanel (Operations band)                │
 * │ SWA-138 S15 — the three widgets S11 deferred, now that      │
 * │ server-side rollups exist behind them.                      │
 * │                                                             │
 * │  TrainerUtilizationWidget  booked vs available, per trainer │
 * │  CancellationImpactWidget  charged / waived / pending       │
 * │  ActivationFunnelWidget    signup -> booked -> completed    │
 * │                                                             │
 * │ Each renders the backend's own `basis` string, because      │
 * │ every one of these numbers is easy to misread. A rate with  │
 * │ no stated denominator is the same class of lie as the       │
 * │ synthetic KPI targets S6 removed.                           │
 * │ PRIVACY: first name + id only (Rule 8).                     │
 * └─────────────────────────────────────────────────────────────┘
 */

import styled from 'styled-components';

export const MUTED = 'var(--text-muted, #94A3B8)';
export const ERROR = 'var(--error, #EF4444)';
export const WARNING = 'var(--warning, #EAB308)';
export const SUCCESS = 'var(--success, #22C55E)';
export const PRIMARY = 'var(--accent-primary, #60C0F0)';

export const money = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(Number.isFinite(v) ? v : 0);

/** The backend's stated counting basis, surfaced rather than hidden. */
export const Basis = styled.p`
  color: ${MUTED};
  font-size: 0.68rem;
  margin: 0 0 12px;
`;

export const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 6px;
`;

export const Stat = styled.div`
  min-width: 88px;
`;

export const StatValue = styled.div<{ $tone?: string }>`
  color: ${({ $tone }) => $tone || 'var(--text-primary, #E0ECF4)'};
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 700;
`;

export const StatLabel = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const List = styled.ul`
  list-style: none;
  margin: 0;
  max-height: 180px;
  overflow-y: auto;
  padding: 0;
`;

export const Row = styled.li`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-tertiary, #4070C0) 12%, transparent);
  display: flex;
  gap: 10px;
  padding: 8px 0;
  &:last-child { border-bottom: none; }
`;

export const Who = styled.div`
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-size: 0.82rem;
  min-width: 0;
`;

export const Meta = styled.div`
  color: ${MUTED};
  font-size: 0.7rem;
`;

export const Pct = styled.span<{ $tone: string }>`
  background: color-mix(in srgb, ${({ $tone }) => $tone} 16%, transparent);
  border: 1px solid color-mix(in srgb, ${({ $tone }) => $tone} 38%, transparent);
  border-radius: 8px;
  color: ${({ $tone }) => $tone};
  flex-shrink: 0;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  min-width: 48px;
  padding: 3px 8px;
  text-align: center;
`;

export const Bar = styled.div`
  background: var(--surface-muted, rgba(255,255,255,0.06));
  border-radius: 4px;
  height: 8px;
  margin: 6px 0 2px;
  overflow: hidden;
`;

export const Fill = styled.div<{ $pct: number; $tone: string }>`
  background: ${({ $tone }) => $tone};
  height: 100%;
  width: ${({ $pct }) => Math.max(0, Math.min(100, $pct))}%;
`;

/** Under-booked and over-booked are both problems; the middle is healthy. */
export const utilizationTone = (pct: number | null) => {
  if (pct === null) return MUTED;
  if (pct >= 95) return ERROR;
  if (pct >= 60) return SUCCESS;
  if (pct >= 30) return WARNING;
  return ERROR;
};

