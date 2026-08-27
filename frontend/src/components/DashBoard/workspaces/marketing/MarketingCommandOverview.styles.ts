/**
 * ============================================================================
 * FILE: MarketingCommandOverview.styles.ts
 * PURPOSE: Styled-components extracted from the Marketing command overview.
 * AUTHOR: Codex GPT-5 | CREATED: 2026-05-08
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Holds the command-center overview grid, metric blocks,
 * signal rows, and boundary-copy styling used by MarketingCommandOverview.
 *
 * HOW IT FITS IN THE APP: Imported only by MarketingCommandOverview.tsx so the
 * workflow component stays focused on lead stats and operator actions.
 *
 * KEY DECISIONS:
 * - Styled-components only; no utility classes or component-library styling.
 * - Crystalline Swan token fallbacks for color and focus states.
 * - Responsive grid collapse keeps the command center readable on mobile.
 */

import styled from 'styled-components';

export const Stack = styled.div`
  display: grid;
  gap: 20px;
`;

export const OverviewGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 20px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

export const SignalList = styled.div`
  display: grid;
  gap: 10px;
`;

export const SignalRow = styled.div`
  min-height: 56px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));

  &:last-child {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    grid-template-columns: 44px 1fr;
  }
`;

export const SignalIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
`;

export const SignalTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const SignalMeta = styled.div`
  margin-top: 3px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const CommandButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.16));
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  padding: 8px 14px;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
  }

  @media (max-width: 640px) {
    grid-column: 1 / -1;
  }
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricBlock = styled.div`
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
`;

export const MetricValue = styled.div<{ $tone?: 'gold' | 'purple' | 'cyan' }>`
  font-family: 'Fira Code', monospace;
  font-size: 28px;
  font-weight: 800;
  color: ${({ $tone }) =>
    $tone === 'gold'
      ? 'var(--accent-gold, #C6A84B)'
      : $tone === 'purple'
        ? 'var(--accent-secondary, #8B5CF6)'
        : 'var(--accent-primary, #60C0F0)'};
`;

export const MetricLabel = styled.div`
  margin-top: 4px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const BoundaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const BoundaryItem = styled.div`
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.1));
`;

export const BoundaryTitle = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const BoundaryCopy = styled.p`
  margin: 6px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

export const StatusLine = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

// --- Leads-by-channel rollup -------------------------------------------------
export const ChannelList = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 4px;
`;

export const ChannelRow = styled.div`
  display: grid;
  grid-template-columns: minmax(90px, 140px) 1fr auto;
  align-items: center;
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(80px, 1fr) 2fr auto;
  }
`;

export const ChannelName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: capitalize;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ChannelTrack = styled.div`
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  overflow: hidden;
`;

export const ChannelFill = styled.div<{ $pct: number }>`
  height: 100%;
  border-radius: 999px;
  width: ${({ $pct }) => Math.max(4, Math.min(100, $pct))}%;
  background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
`;

export const ChannelMeta = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1px;
  min-width: 36px;
`;

export const ChannelCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  font-weight: 800;
  color: var(--accent-primary, #60C0F0);
  text-align: right;
`;

// Converted (paying) count for the channel — the money signal.
export const ChannelWon = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-gold, #C6A84B);
  white-space: nowrap;
`;

export const SubsectionLabel = styled.h4`
  margin: 18px 0 8px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  border-top: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.14));
  padding-top: 14px;
`;

export const ChannelEmpty = styled.p`
  margin: 4px 0 0;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;
