/**
 * STYLES: ClientExerciseMegaStats
 * PURPOSE: Ranked exercise diary and insight-strip layout primitives.
 */
import styled from 'styled-components';

import { CHART_COLORS } from '../../Charts/chartTheme';
import { swanDataCardShell, swanMetricTile, swanPill } from '../workspaces/clients-team/clientCardSystem';

export const Board = styled.section`
  --swan-card-padding: 1rem;
  --swan-card-radius: 14px;
  ${swanDataCardShell}
  margin: 0 0 1rem;

  &:hover {
    transform: none;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;

  @media (max-width: 620px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const TitleBlock = styled.div`
  min-width: 0;
  overflow-wrap: anywhere;
`;

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const Title = styled.h4`
  margin: 0.2rem 0 0;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  overflow-wrap: anywhere;
`;

export const CountPill = styled.div`
  ${swanPill}
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.65rem;
  color: var(--accent-gold, #c6a84b);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  overflow-wrap: anywhere;
`;

export const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
  margin-bottom: 0.75rem;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const InsightItem = styled.div`
  ${swanMetricTile}
  min-width: 0;
  min-height: 64px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  padding: 0.65rem 0.75rem;
`;

export const InsightLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const InsightValue = styled.span`
  min-width: 0;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.94rem;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

export const InsightMeta = styled.span`
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 800;
  overflow-wrap: anywhere;
`;

export const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const Row = styled.li`
  ${swanMetricTile}
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(72px, auto);
  align-items: center;
  gap: 0.65rem;
  min-height: 48px;
  padding: 0.55rem 0.65rem;

  @media (max-width: 520px) {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: start;
  }
`;

export const Rank = styled.span`
  width: 2rem;
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.76rem;
  font-weight: 800;
`;

export const ExerciseName = styled.span`
  min-width: 0;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

export const Bar = styled.span`
  position: relative;
  grid-column: 2 / 4;
  height: 7px;
  border-radius: 999px;
  background: var(--chart-track-bg, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent));
  overflow: hidden;

  @media (max-width: 520px) {
    grid-column: 1 / -1;
  }
`;

export const Fill = styled.span<{ $pct: number }>`
  position: absolute;
  inset: 0 auto 0 0;
  width: ${({ $pct }) => {
    const safePct = Number.isFinite($pct) ? $pct : 0;
    return Math.max(Math.min(safePct, 100), 3);
  }}%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    var(--accent-primary, ${CHART_COLORS.iceWing}),
    var(--accent-secondary, ${CHART_COLORS.wingPurple})
  );
`;

export const Value = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent));
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  justify-self: end;
  min-width: 0;
  overflow-wrap: anywhere;

  @media (max-width: 520px) {
    grid-column: 2;
    justify-self: start;
  }
`;

export const Empty = styled.div`
  min-height: 90px;
  display: grid;
  place-items: center;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 56%, transparent));
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  text-align: center;
  overflow-wrap: anywhere;
`;
