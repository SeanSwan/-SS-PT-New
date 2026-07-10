/**
 * FILE: ApexHeader.styles.ts
 * PURPOSE: Styled surface for ApexHeader (Apex redesign Phase 1b).
 *
 * Extracted from ApexHeader.tsx to honor the 300-line file rule (CLAUDE.md rule 4).
 * Palette is Crystalline Swan via var(--token, #fallback) (rule 6). Dual-Button Glow:
 * sapphire surface -> purple glow (LogButton); purple surface -> cyan glow (LevelHex).
 * Motion is opt-in behind prefers-reduced-motion (rule 25).
 */
import styled, { css } from 'styled-components';

export const Header = styled.header`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(1rem, 3vw, 2.5rem);
  max-width: 1760px;
  margin: 0 auto clamp(1rem, 1.6vw, 1.5rem);
  padding: clamp(1.1rem, 2vw, 1.75rem) clamp(1.1rem, 2.2vw, 2rem);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.1));
  border-radius: 20px;
  background:
    radial-gradient(120% 140% at 82% 0%, rgba(0, 48, 128, 0.55), transparent 60%),
    linear-gradient(150deg, var(--bg-elevated, #141419), var(--bg-surface, #1a1a24));

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
`;

export const Eyebrow = styled.p`
  margin: 0 0 0.35rem;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
`;

export const Title = styled.h2`
  margin: 0;
  color: var(--text-primary, #e0ecf4);
  font-size: clamp(1.5rem, 2.6vw, 2.2rem);
  font-weight: 800;
  line-height: 1.1;
`;

export const Subtitle = styled.p`
  margin: 0.4rem 0 0;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.92rem;
`;

/* Dual-Button Glow: sapphire background -> purple glow. */
export const LogButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  margin-top: 1.15rem;
  padding: 0 1.35rem;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent-secondary, #002060), #0a3aa0);
  color: var(--text-primary, #e0ecf4);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 22px rgba(139, 92, 246, 0.45);
  transition: box-shadow 160ms ease;

  &:hover {
    box-shadow: 0 0 30px rgba(139, 92, 246, 0.65);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: no-preference) {
    transition: transform 160ms ease, box-shadow 160ms ease;
    &:hover { transform: translateY(-1px); }
  }
`;

export const LevelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-top: 1.25rem;
  max-width: 440px;
`;

/* Dual-Button Glow: purple surface -> cyan glow. */
export const LevelHex = styled.div`
  flex: none;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  background: linear-gradient(150deg, var(--accent-glow, #8b5cf6), #6d3fd6);
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);
  box-shadow: 0 0 18px rgba(96, 192, 240, 0.45);
`;

export const XpBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

export const XpMeta = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.8rem;

  strong {
    color: var(--accent-gold, #c6a84b);
    font-size: 0.85rem;
  }
`;

export const XpTrack = styled.div`
  height: 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--text-primary, #e0ecf4) 9%, transparent);
  overflow: hidden;
`;

export const XpFill = styled.div<{ $pct: number }>`
  width: ${({ $pct }) => $pct}%;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--accent-tertiary, #4070c0), var(--accent-primary, #60c0f0));
  box-shadow: 0 0 10px rgba(96, 192, 240, 0.5);

  @media (prefers-reduced-motion: no-preference) {
    transition: width 420ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

export const Rings = styled.div`
  display: flex;
  gap: clamp(0.9rem, 2vw, 1.75rem);

  @media (max-width: 860px) {
    justify-content: flex-start;
  }
`;

export const RingWrap = styled.div`
  position: relative;
  display: grid;
  place-items: center;
  width: 104px;
  text-align: center;

  svg {
    width: 88px;
    height: 88px;
    transform: rotate(-90deg);
  }

  circle {
    fill: none;
    stroke-width: 7;
    stroke-linecap: round;
  }
`;

/* css`` helper is mandatory here: this fragment is composed into a styled
   component and interpolates tokens (CLAUDE.md rule 43). */
const ringTone = (tone: 'gold' | 'cyan') => (tone === 'gold'
  ? css`
      stroke: var(--accent-gold, #c6a84b);
      filter: drop-shadow(0 0 6px rgba(198, 168, 75, 0.55));
    `
  : css`
      stroke: var(--accent-primary, #60c0f0);
      filter: drop-shadow(0 0 6px rgba(96, 192, 240, 0.55));
    `);

export const Track = styled.circle`
  stroke: color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
`;

export const Fill = styled.circle<{ $tone: 'gold' | 'cyan' }>`
  ${({ $tone }) => ringTone($tone)}

  @media (prefers-reduced-motion: no-preference) {
    transition: stroke-dashoffset 520ms cubic-bezier(0.22, 1, 0.36, 1);
  }
`;

export const RingCenter = styled.div`
  position: absolute;
  top: 30px;
  display: grid;
  gap: 0.1rem;
  color: var(--text-primary, #e0ecf4);
  pointer-events: none;

  strong { font-size: 1.35rem; font-weight: 800; line-height: 1; }
  span {
    color: var(--text-muted, #8fa3b8);
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
`;

export const RingLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.35rem;
  color: var(--text-muted, #8fa3b8);
  font-size: 0.72rem;
  font-weight: 600;
`;
