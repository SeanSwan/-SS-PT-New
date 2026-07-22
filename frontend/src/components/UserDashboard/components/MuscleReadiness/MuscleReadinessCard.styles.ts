/**
 * MuscleReadinessCard.styles — CC-1 "recovery estimate" board (list foundation; the faceted
 * Crystalline Body silhouette lands on top of this base in CC-1b).
 *
 * Kimi law baked in: state is NEVER color-alone — luminance (bar fill %) + facet hatch texture
 * (loading state) + text label carry it together. Shimmer is transform/opacity only and dies under
 * prefers-reduced-motion. 44px touch targets (Rule 2). Tokens with crystalline fallbacks (Rule 6).
 */
import styled, { css, keyframes } from 'styled-components';

const facetSweep = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(240%); }
`;

export const Card = styled.section`
  position: relative;
  background: var(--surface-card, #141419);
  border: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.14));
  border-radius: 20px;
  padding: 18px 18px 12px;
  color: var(--text-primary, #E0ECF4);
`;

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
`;

export const Title = styled.h3`
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.01em;
`;

export const EstimateTag = styled.button`
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.18));
  background: transparent;
  color: var(--text-secondary, #8aa2b8);
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const Explainer = styled.p`
  margin: 4px 0 10px;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--text-secondary, #8aa2b8);
`;

export const Rows = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 6px;
  @media (min-width: 768px) { grid-template-columns: 1fr 1fr; column-gap: 18px; }
`;

export const Row = styled.li`
  display: grid;
  grid-template-columns: 92px 1fr auto;
  align-items: center;
  gap: 10px;
  min-height: 34px;
`;

export const GroupName = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.78rem;
  text-transform: capitalize;
  color: var(--text-primary, #E0ECF4);
`;

export const BarTrack = styled.div`
  position: relative;
  height: 10px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface-elevated-dark, #1A1A24);
  border: 1px solid var(--handoff-card-border, rgba(96, 192, 240, 0.10));
`;

/** Luminance carries the state; hatch texture marks LOADING so color is never the only signal. */
export const BarFill = styled.div<{ $pct: number; $state: 'ready' | 'caution' | 'loading' }>`
  position: relative;
  height: 100%;
  width: ${({ $pct }) => Math.max(4, Math.min(100, $pct))}%;
  border-radius: 6px;
  background: ${({ $state }) => ($state === 'ready'
    ? 'linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-glow, #8B5CF6))'
    : $state === 'caution'
      ? 'var(--data-accent, #50A0F0)'
      : 'var(--surface-elevated, #003080)')};
  opacity: ${({ $state }) => ($state === 'ready' ? 1 : $state === 'caution' ? 0.75 : 0.5)};
  ${({ $state }) => $state === 'loading' && css`
    background-image: repeating-linear-gradient(
      -45deg,
      transparent 0 4px,
      var(--handoff-card-border, rgba(96, 192, 240, 0.22)) 4px 6px
    );
  `}
`;

/** One slow prismatic sweep on READY rows — the quiet precursor of the CC-1b facet caustic. */
export const ReadySheen = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 6px;
  pointer-events: none;
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    background: linear-gradient(90deg, transparent, var(--text-primary, #E0ECF4), transparent);
    opacity: 0.16;
    animation: ${css`${facetSweep}`} 3.2s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) { &::after { animation: none; opacity: 0; } }
`;

export const StateLabel = styled.span<{ $state: 'ready' | 'caution' | 'loading' }>`
  font-family: 'Fira Code', monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ $state }) => ($state === 'ready'
    ? 'var(--accent-primary, #60C0F0)'
    : 'var(--text-secondary, #8aa2b8)')};
`;
