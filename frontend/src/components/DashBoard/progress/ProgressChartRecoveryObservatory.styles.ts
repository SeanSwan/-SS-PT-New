/**
 * STYLES: ProgressChartRecoveryObservatory
 * PURPOSE: Dense recovery/readiness chart environment for progress dashboards.
 */
import styled from 'styled-components';
import { swanDataCardShell, swanMetricTile, swanPill } from '../workspaces/clients-team/clientCardSystem';

export const Observatory = styled.section`
  --swan-card-padding: 1rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  display: grid;
  gap: 1rem;
  margin: 0 0 1rem;

  &:hover {
    transform: none;
  }
`;

export const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

export const TitleBlock = styled.div`
  min-width: 0;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60C0F0);
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
`;

export const Title = styled.h4`
  margin: 0.25rem 0 0;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.02rem;
  overflow-wrap: anywhere;
`;

export const StatusPill = styled.span<{ $status: 'empty' | 'clear' | 'watch' | 'intervene' }>`
  ${swanPill}
  min-height: 38px;
  color: ${({ $status }) => (
    $status === 'empty'
      ? 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent))'
      : $status === 'clear'
        ? 'var(--accent-primary, #60C0F0)'
        : $status === 'watch'
          ? 'var(--accent-gold, #C6A84B)'
          : 'var(--error, #EF4444)'
  )};
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
`;

export const Body = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(230px, 0.72fr);
  gap: 1rem;
  align-items: stretch;

  @media (max-width: 840px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartGraphic = styled.div`
  min-height: 232px;
  min-width: 0;
  border: 1px solid var(--border-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent));
  border-radius: 12px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--bg-surface, #1A1A24) 86%, transparent), transparent),
    color-mix(in srgb, var(--bg-base, #030712) 42%, transparent);
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const MetricTile = styled.div`
  ${swanMetricTile}
  min-height: 88px;
  display: grid;
  align-content: center;
  gap: 0.28rem;
  padding: 0.72rem 0.8rem;
`;

export const MetricValue = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 1.1rem;
  line-height: 1;
`;

export const MetricLabel = styled.span`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 58%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
`;

export const ScreenReaderList = styled.ul`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;
