/**
 * Dashboards v2 — MilestoneTile (KIMI-DASHBOARDS §2.4 / §4). One earned milestone. When not yet
 * crystallized it offers the Crystallize action (confirm-first via useCrystallizeMilestone in the
 * parent density); once crystallized it shows the settled state. Tier drives the edge accent only
 * (facet/prism/crown). All color via --dash-* tokens; 44px+ target; no hover-only affordance.
 */
import styled, { css } from 'styled-components';
import type { Milestone } from '../types';

const tierEdge = {
  facet: css`
    --tile-edge: var(--dash-line-strong);
  `,
  prism: css`
    --tile-edge: var(--dash-accent);
  `,
  crown: css`
    --tile-edge: var(--dash-accent-2, var(--dash-accent));
  `,
} as const;

const Tile = styled.article<{ $tier: Milestone['tier']; $crystallized: boolean }>`
  ${({ $tier }) => tierEdge[$tier]}
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--dash-r-panel, 16px);
  background: var(--dash-glass);
  border: 1px solid var(--tile-edge);
  box-shadow: ${({ $crystallized }) =>
    $crystallized ? '0 0 0 1px var(--dash-glow), 0 8px 28px -18px var(--dash-glow)' : 'var(--dash-elev-1, none)'};
`;
const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;
const Title = styled.h4`
  margin: 0;
  font: 600 15px / 1.2 var(--dash-font-display, inherit);
  color: var(--dash-ink);
`;
const Meta = styled.span`
  font-size: 12px;
  color: var(--dash-ink-2);
`;
const Tier = styled.span`
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--dash-ink-2);
`;
const Settled = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--dash-accent);
`;
const CrystallizeBtn = styled.button`
  min-height: var(--dash-target, 44px);
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--dash-line-strong);
  background: var(--dash-accent);
  color: var(--dash-canvas, #0b0f14);
  font: 600 13px / 1 var(--dash-font-display, inherit);
  cursor: pointer;
  transition: filter 120ms ease;
  &:hover {
    filter: brightness(1.06);
  }
  &:focus-visible {
    outline: 2px solid var(--dash-accent);
    outline-offset: 2px;
  }
`;

export interface MilestoneTileProps {
  milestone: Milestone;
  onCrystallize?: (m: Milestone) => void;
}

export function MilestoneTile({ milestone, onCrystallize }: MilestoneTileProps) {
  return (
    <Tile $tier={milestone.tier} $crystallized={milestone.crystallized} data-testid={`dash-milestone-${milestone.id}`}>
      <Row>
        <Title>{milestone.title}</Title>
        <Tier>{milestone.tier}</Tier>
      </Row>
      <Row>
        <Meta>{milestone.earnedLabel ?? 'In progress'}</Meta>
        {milestone.crystallized ? (
          <Settled aria-label="Crystallized">✦ Crystallized</Settled>
        ) : onCrystallize ? (
          <CrystallizeBtn type="button" onClick={() => onCrystallize(milestone)}>
            Crystallize
          </CrystallizeBtn>
        ) : null}
      </Row>
    </Tile>
  );
}
