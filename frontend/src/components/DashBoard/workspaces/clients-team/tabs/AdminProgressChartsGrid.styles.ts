import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { CHART_COLORS } from '../../../../Charts/chartTheme';

export const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const Card = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 12px;
  padding: 1rem 1.25rem 1.25rem;
  min-height: 220px;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: var(--border-hover, rgba(96, 192, 240, 0.18));
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
`;

export const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
`;

export const CardBody = styled.div`
  flex: 1;
  min-height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Empty = styled.div`
  text-align: center;
  padding: 1rem 0.5rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
`;

export const SummaryLine = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.25rem 0 0.5rem;
`;

export const BarList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

export const BarRow = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 2fr) auto;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-primary, #E0ECF4);
`;

export const BarLabel = styled.span`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
`;

export const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--accent-primary-soft, rgba(96, 192, 240, 0.08));
  overflow: hidden;
`;

export const BarFill = styled.div<{ $pct: number; $color?: string }>`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: ${({ $pct }) => Math.max(Math.min($pct, 100), 2)}%;
  background: ${({ $color }) => $color || CHART_COLORS.iceWing};
  border-radius: 4px;
`;

export const BarValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  white-space: nowrap;
`;

export const LoadingStrip = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
`;

export const ErrorLoadingStrip = styled(LoadingStrip)`
  color: ${CHART_COLORS.crimsonFrost};
`;

export const AttendanceSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
`;

export const AttendancePercent = styled.div`
  color: ${CHART_COLORS.iceWing};
  font-family: 'Fira Code', monospace;
  font-size: 2rem;
  font-weight: 700;
`;

export const AttendanceMeta = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.55));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
`;

export const RecoveryIcon = styled(AlertTriangle)`
  color: ${CHART_COLORS.crimsonFrost};
  margin-right: 4px;
  vertical-align: -2px;
`;
