/**
 * FILE: ClientDashboardHome.heroStyles.ts
 * PURPOSE: Profile hero and primary stat styles for the client dashboard.
 */
import styled from 'styled-components';
import { PanelCard } from './ClientDashboardHome.cardStyles';

export const HeroPanel = styled(PanelCard)`
  min-height: 198px;
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroContent = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  align-content: center;
  gap: 14px;
  padding: 18px 20px;
`;

export const HeroMedia = styled.div`
  position: relative;
  min-height: 198px;
  background:
    radial-gradient(circle at 72% 12%, color-mix(in srgb, var(--client-text) 38%, transparent), transparent 7rem),
    linear-gradient(120deg, transparent, color-mix(in srgb, var(--client-blue) 18%, transparent));

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(1.08) contrast(1.04);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, var(--client-panel), transparent 46%);
  }
`;

export const HeroIdentity = styled.div`
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 16px;
  align-items: center;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

export const HeroAvatar = styled.img`
  width: 86px;
  height: 86px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--client-mint);
  box-shadow: 0 0 24px color-mix(in srgb, var(--client-mint) 58%, transparent);
`;

export const HeroTitle = styled.h1`
  margin: 0;
  color: var(--client-text);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 2.45rem;
  line-height: 0.98;

  @media (max-width: 520px) {
    font-size: 2rem;
  }
`;

export const HeroPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: fit-content;
  min-height: 30px;
  margin-top: 7px;
  padding: 0 11px;
  border: 1px solid color-mix(in srgb, var(--client-mint) 34%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--client-mint) 14%, transparent);
  color: var(--client-mint);
  font-size: 0.72rem;
  font-weight: 900;
`;

/* Weighted, not 3×1fr (design.md §10 weighted-columns law). The headline
   Swan Points stat leads wider so the hero reads with hierarchy on value
   alone (grayscale test), not three interchangeable peer tiles. */
export const StatGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 9px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const StatTile = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 9px 11px;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--client-panel-soft) 80%, transparent);
`;

export const StatIcon = styled.span<{ $tone?: 'teal' | 'purple' | 'gold' }>`
  display: inline-grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: ${({ $tone }) => (
    $tone === 'purple' ? 'var(--client-purple)' : $tone === 'gold' ? 'var(--client-gold)' : 'var(--client-mint)'
  )};
  background: color-mix(in srgb, currentColor 17%, transparent);
`;

/* Momentum lens row — the crystal signature ring beside the level readout.
   Ring leads on desktop; stacks (ring on top, centered) on narrow handsets. */
export const MomentumLens = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
    gap: 12px;
  }
`;
