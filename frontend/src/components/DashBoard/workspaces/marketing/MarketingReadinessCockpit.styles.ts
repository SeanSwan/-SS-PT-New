/**
 * ┌─── STYLES: Marketing Readiness Cockpit ─────────────────────────┐
 * │ PARENT: MarketingReadinessCockpit (embedded in Overview tab)     │
 * │ PURPOSE: Read-only subsystem status cards. Low-motion data cards  │
 * │          per the Swan Card standard (no pointer tracking / loops).│
 * │ TOKENS: var(--token, #fallback) with Crystalline Swan fallbacks.  │
 * └──────────────────────────────────────────────────────────────────┘
 */

import styled from 'styled-components';

export type ReadinessStatus = 'ready' | 'degraded' | 'blocked' | 'demo';

const STATUS_COLOR: Record<ReadinessStatus, string> = {
  ready: '#10B981',
  degraded: '#F59E0B',
  blocked: '#EF4444',
  demo: '#8B5CF6',
};

const statusColor = (s: ReadinessStatus) => STATUS_COLOR[s] || STATUS_COLOR.demo;

export const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 4px;
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const HeaderIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(96, 192, 240, 0.12);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const Subtitle = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  margin: 2px 0 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const OverallPill = styled.span<{ $status: ReadinessStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${({ $status }) => statusColor($status)};
  background: ${({ $status }) => `${statusColor($status)}1f`};
  border: 1px solid ${({ $status }) => `${statusColor($status)}55`};
`;

export const RefreshButton = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;

  &:hover:not(:disabled) { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
`;

export const Card = styled.div<{ $status: ReadinessStatus }>`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.12));
  border-left: 3px solid ${({ $status }) => statusColor($status)};
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
`;

export const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

export const CardIcon = styled.div<{ $status: ReadinessStatus }>`
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ $status }) => statusColor($status)};
  background: ${({ $status }) => `${statusColor($status)}1a`};
`;

export const CardName = styled.h4`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Badge = styled.span<{ $status: ReadinessStatus }>`
  flex-shrink: 0;
  padding: 3px 9px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ $status }) => statusColor($status)};
  background: ${({ $status }) => `${statusColor($status)}1f`};
`;

export const MetricList = styled.dl`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const MetricRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
`;

export const MetricKey = styled.dt`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
`;

export const MetricVal = styled.dd<{ $tone?: 'good' | 'warn' | 'bad' | 'muted' }>`
  margin: 0;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  font-weight: 600;
  text-align: right;
  color: ${({ $tone }) =>
    $tone === 'good' ? '#10B981'
      : $tone === 'warn' ? '#F59E0B'
        : $tone === 'bad' ? '#EF4444'
          : 'var(--text-primary, #E0ECF4)'};
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.span<{ $tone: 'good' | 'muted' | 'demo' }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 600;
  color: ${({ $tone }) =>
    $tone === 'good' ? '#10B981' : $tone === 'demo' ? '#8B5CF6' : 'var(--text-secondary, rgba(224, 236, 244, 0.85))'};
  background: ${({ $tone }) =>
    $tone === 'good' ? 'rgba(16, 185, 129, 0.12)' : $tone === 'demo' ? 'rgba(139, 92, 246, 0.14)' : 'rgba(96, 192, 240, 0.08)'};
  border: 1px solid ${({ $tone }) =>
    $tone === 'good' ? 'rgba(16, 185, 129, 0.3)' : $tone === 'demo' ? 'rgba(139, 92, 246, 0.3)' : 'var(--border-subtle, rgba(96, 192, 240, 0.12))'};
`;

export const Note = styled.p`
  margin: 0;
  font-family: 'Sora', sans-serif;
  font-size: 11.5px;
  line-height: 1.5;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
`;

export const NextAction = styled.p`
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11.5px;
  line-height: 1.45;
  color: #F59E0B;

  svg { flex-shrink: 0; margin-top: 1px; }
`;

export const StateBlock = styled.div`
  padding: 24px;
  border-radius: 14px;
  border: 1px dashed var(--border-subtle, rgba(96, 192, 240, 0.18));
  background: var(--bg-elevated, #141419);
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
`;
