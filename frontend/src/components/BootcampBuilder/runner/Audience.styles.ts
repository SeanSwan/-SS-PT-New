/**
 * ============================================================================
 * FILE: runner/Audience.styles.ts
 * PURPOSE: The TV type system — physics-derived, not taste-derived.
 *          SWA-105 Slice 6b.
 * AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 * ============================================================================
 *
 * LAWS (consult synthesis §P3/§2.2, enforced here):
 *  - Everything is sized in vh — the TV viewport and viewing distance are
 *    fixed, so vh IS the correct unit; px is banned on this surface.
 *  - No font-weight below 600 anywhere: thin type at 20ft under gym lighting
 *    is invisible.
 *  - Sentence case for exercise names; UPPERCASE only for <=12-char labels
 *    (WORK / REST / MOVE) — uppercase destroys word-shape recognition.
 *  - NO Wing Purple on the audience surface: participants do not care that an
 *    AI picked their squat. Purple stays on the Trainer Console + Floor Card.
 *  - The modification line is styled to be READ, not to be found.
 *  - Reduced motion collapses the crossfade to a hard cut (Rule 25).
 */

import styled, { css, keyframes } from 'styled-components';

/** --tv-* scale. Base values target the conservative default (4-card room). */
export const AudienceRoot = styled.div`
  --tv-bg: var(--bg-base, #030712);
  --tv-surface: var(--surface-dark, #0a1128);
  --tv-text: var(--text-primary, #e0ecf4);
  --tv-accent: var(--accent-primary, #60c0f0);
  --tv-gold: var(--accent-luxury, #c6a84b);

  --tv-timer: 22vh;
  --tv-hero-name: 11vh;
  --tv-card-name: 5.6vh;
  --tv-card-scheme: 4vh;
  --tv-mod-line: 2.8vh;
  --tv-equipment: 2.4vh;
  --tv-meta: 2.2vh;

  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--tv-bg);
  color: var(--tv-text);
  font-family: 'Sora', 'Plus Jakarta Sans', sans-serif;
  overflow: hidden;
  cursor: none; /* an audience surface has no pointer */
`;

export const ClockBand = styled.header`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 1vh 3vh 0;
  min-height: 13vh;
`;

export const PhaseLabel = styled.div<{ $alert?: boolean }>`
  font-size: 5vh;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase; /* short labels only: WORK / REST / MOVE */
  color: ${({ $alert }) => ($alert ? 'var(--tv-gold)' : 'var(--tv-accent)')};
`;

export const Timer = styled.div`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: var(--tv-timer);
  font-weight: 700;
  line-height: 0.9;
  letter-spacing: -0.03em;
`;

export const MetaCorner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6vh;
  font-size: var(--tv-meta);
  font-weight: 600;
  color: var(--tv-text);
  opacity: 0.85;
`;

export const StageArea = styled.main`
  flex: 1;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 1vh 3vh 3vh;
  min-height: 0;
`;

/* ── Hero (S1/S4/S5/S6) — the ONE place a single huge exercise is right ── */

export const HeroName = styled.h1`
  font-size: var(--tv-hero-name);
  font-weight: 700;
  line-height: 1.02;
  margin: 0;
  text-align: center;
  align-self: center;
  max-width: 90vw;
`;

export const HeroCue = styled.p`
  font-size: 3.2vh;
  font-weight: 600;
  color: var(--tv-accent);
  text-align: center;
  margin: 1vh 0 0;
`;

export const HeroWrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex: 1;
`;

/* ── Station grid (S2/S3) ── */

export const StationGrid = styled.div<{ $count: number }>`
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-auto-rows: 1fr;
  gap: 2vh;
  min-height: 0;
  ${({ $count }) => $count <= 2 && css`grid-template-columns: repeat(${$count}, 1fr);`}
`;

export const StationCard = styled.section<{ $tight?: boolean }>`
  background: var(--tv-surface);
  border: 0.4vh solid ${({ $tight }) => ($tight ? 'var(--tv-gold)' : 'rgba(96, 192, 240, 0.35)')};
  border-radius: 2vh;
  padding: 2vh 2.4vh;
  display: flex;
  flex-direction: column;
  gap: 0.8vh;
  min-height: 0;
  overflow: hidden;
`;

export const StationTag = styled.div`
  font-size: var(--tv-meta);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--tv-accent);
`;

export const ExerciseName = styled.div<{ $emphasis: 'name' | 'scheme' }>`
  font-size: ${({ $emphasis }) => ($emphasis === 'name' ? 'var(--tv-card-name)' : 'var(--tv-card-scheme)')};
  font-weight: ${({ $emphasis }) => ($emphasis === 'name' ? 700 : 600)};
  line-height: 1.05;
`;

export const SchemeLine = styled.div<{ $emphasis: 'name' | 'scheme' }>`
  font-family: 'Fira Code', monospace;
  font-size: ${({ $emphasis }) => ($emphasis === 'scheme' ? 'var(--tv-card-name)' : 'var(--tv-card-scheme)')};
  font-weight: ${({ $emphasis }) => ($emphasis === 'scheme' ? 700 : 600)};
  color: var(--tv-accent);
`;

/** ALWAYS visible — never behind an interaction. The dignity feature. */
export const ModificationLine = styled.div`
  font-size: var(--tv-mod-line);
  font-weight: 600;
  color: var(--tv-gold);
  margin-top: auto;
`;

export const EquipmentLine = styled.div`
  font-size: var(--tv-equipment);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.7;
`;

export const NextUpLine = styled.div`
  font-size: var(--tv-equipment);
  font-weight: 600;
  opacity: 0.75;

  &::before {
    content: 'Next · ';
    color: var(--tv-accent);
  }
`;

/* ── Alternating pagination (over-capacity rooms) ── */

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

export const PageFade = styled.div`
  display: contents;

  @media (prefers-reduced-motion: no-preference) {
    & > section {
      animation: ${fadeIn} 400ms ease-out;
    }
  }
`;

export const PaperNotice = styled.div`
  align-self: center;
  text-align: center;
  font-size: 3.4vh;
  font-weight: 600;
  line-height: 1.4;
  max-width: 80vw;
`;

/* ── S7 complete — the one Gilded Fern moment ── */

export const CompleteWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 2vh;
`;

export const CompleteHeadline = styled.div`
  font-size: 10vh;
  font-weight: 800;
  color: var(--tv-gold);
`;

export const CompleteStat = styled.div`
  font-size: 3.6vh;
  font-weight: 600;
  opacity: 0.9;
`;
