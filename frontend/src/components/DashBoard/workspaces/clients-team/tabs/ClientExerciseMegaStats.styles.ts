/**
 * STYLES: ClientExerciseMegaStats
 * PURPOSE: Ranked exercise diary and insight-strip layout primitives.
 */
import styled from 'styled-components';

import { CHART_COLORS } from '../../../../Charts/chartTheme';

export const Board = styled.section`
  margin: 0 0 1rem;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 16%, transparent);
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-elevated, #141419) 92%, var(--accent-primary, #60c0f0) 5%),
      color-mix(in srgb, var(--bg-base, #0a0a0f) 90%, var(--accent-secondary, #8b5cf6) 6%));
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
`;

export const CountPill = styled.div`
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.4rem 0.65rem;
  border-radius: 9px;
  border: 1px solid var(--border-soft, rgba(198, 168, 75, 0.16));
  color: var(--accent-gold, #c6a84b);
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, var(--accent-gold, #c6a84b) 7%);
  font-family: 'Sora', sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  white-space: nowrap;
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
  min-width: 0;
  min-height: 64px;
  display: grid;
  align-content: center;
  gap: 0.25rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, var(--accent-primary, #60c0f0) 5%);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
`;

export const InsightLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

export const InsightValue = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.94rem;
  font-weight: 900;
`;

export const InsightMeta = styled.span`
  color: var(--accent-primary, #60c0f0);
  font-family: 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 800;
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  min-height: 48px;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-base, #0a0a0f) 82%, transparent);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.08));
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary, #e0ecf4);
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
`;

export const Bar = styled.span`
  position: relative;
  grid-column: 2 / 4;
  height: 7px;
  border-radius: 999px;
  background: var(--chart-track-bg, rgba(96, 192, 240, 0.08));
  overflow: hidden;
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
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  white-space: nowrap;
`;

export const Empty = styled.div`
  min-height: 90px;
  display: grid;
  place-items: center;
  color: var(--text-muted, rgba(224, 236, 244, 0.56));
  font-family: 'Sora', sans-serif;
  font-size: 0.84rem;
  text-align: center;
`;
