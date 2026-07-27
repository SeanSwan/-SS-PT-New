/**
 * COMPONENT: CanonicalProgressChartsGrid.styles
 * OWNER: Client Dashboard / Progress
 * PURPOSE: Theme-connected card, bar, and grid primitives for the 15-chart grid.
 */

import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { CHART_COLORS } from '../../../Charts/chartTheme';

export const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 0.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartCard = styled.div`
  min-height: 260px;
  display: flex;
  flex-direction: column;
  padding: 1rem 1.25rem 1.25rem;
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: var(--world-panel-radius, 12px);
  transition: border-color 0.2s ease;

  &:hover {
    border-color: var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

export const CardIcon = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
`;

export const CardTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
`;

export const CardSubtitle = styled.span`
  margin-left: auto;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const ChartBody = styled.div`
  flex: 1;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.55rem;
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 1.5rem 0.5rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  text-align: center;
`;

export const EmptyLabel = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-size: 0.82rem;
`;

export const EmptyHint = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-size: 0.7rem;
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
  margin-bottom: 0.25rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const BarList = styled.ul`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const BarRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
`;

export const BarLabel = styled.span`
  overflow: hidden;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BarTrack = styled.div`
  position: relative;
  height: 8px;
  overflow: hidden;
  background: var(--chart-track, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  border-radius: 4px;
`;

export const BarFill = styled.div<{ $pct: number; $color?: string }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 2)}%;
  background: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  border-radius: 4px;
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const BarValue = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  white-space: nowrap;
`;

export const RingWrap = styled.div`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 1rem;
`;

export const RingNumber = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 2.25rem;
  font-weight: 700;
  line-height: 1;
`;

export const RingLabel = styled.div`
  margin-top: 0.25rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

export const StatStack = styled.div`
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
`;

export const StatPill = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.6rem;
  background: var(--bg-surface, #1A1A24);
  border-radius: 8px;
`;

export const StatPillValue = styled.span<{ $color?: string }>`
  color: ${({ $color }) => $color || 'var(--text-primary, #E0ECF4)'};
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  font-weight: 700;
`;

export const StatPillLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

export const RecoveryAlertIcon = styled(AlertTriangle)`
  margin-right: 4px;
  color: ${CHART_COLORS.crimsonFrost};
  vertical-align: -2px;
`;

export const LoadingStrip = styled.div`
  padding: 1rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  text-align: center;
`;

export const ErrorLoadingStrip = styled(LoadingStrip)`
  color: ${CHART_COLORS.crimsonFrost};
`;

export const DrillTriggerRow = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 0.25rem 0.5rem 0.5rem;
`;

export const DrillTriggerButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 44px;
  padding: 0 0.9rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 10px;
  background: transparent;
  color: var(--accent-primary, #60C0F0);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;

  &:hover {
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 45%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;
