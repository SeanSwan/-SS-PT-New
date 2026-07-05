import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { CHART_COLORS } from '../../../../Charts/chartTheme';
import { swanDataCardShell, swanPill } from '../clientCardSystem';

export const GridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 1rem;
  min-width: 0;
  max-width: 100%;

  @media (max-width: 430px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Card = styled.div`
  --swan-card-padding: 1rem 1.25rem 1.25rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  min-height: 220px;
  display: flex;
  flex-direction: column;
  min-width: 0;

  &:hover {
    transform: none;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  min-width: 0;
`;

export const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const CardBody = styled.div`
  flex: 1;
  min-height: 140px;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const ChartStack = styled.div`
  display: grid;
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
`;

export const AdminShareButton = styled.button`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.78rem;
  border: 1px solid var(--border-accent, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  border-radius: 8px;
  background: var(--accent-primary-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent));
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const Empty = styled.div`
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  text-align: center;
  padding: 1.1rem 0.5rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  overflow-wrap: anywhere;

  em {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic;
    font-size: 1.05rem;
    color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent));
  }

  span {
    font-size: 0.68rem;
    line-height: 1.4;
  }
`;

export const SummaryLine = styled.div`
  ${swanPill}
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0;
  margin: 0.25rem 0 0.75rem;
  overflow-wrap: anywhere;
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
  min-width: 0;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.35rem 0.5rem;
  }
`;

export const BarLabel = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 4px;
  background: var(--accent-primary-soft, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  overflow: hidden;
  min-width: 0;

  @media (max-width: 520px) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
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
  justify-self: end;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const LoadingStrip = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 45%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  overflow-wrap: anywhere;
`;

export const ErrorLoadingStrip = styled(LoadingStrip)`
  color: ${CHART_COLORS.crimsonFrost};
`;

export const AttendanceSummary = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  min-width: 0;

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.5rem;
  }
`;

export const AttendancePercent = styled.div`
  color: ${CHART_COLORS.iceWing};
  font-family: 'Fira Code', monospace;
  font-size: 2rem;
  font-weight: 700;
  line-height: 1;
`;

export const AttendanceMeta = styled.div`
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 55%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  text-transform: uppercase;
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const RecoveryIcon = styled(AlertTriangle)`
  color: ${CHART_COLORS.crimsonFrost};
  margin-right: 4px;
  vertical-align: -2px;
`;
