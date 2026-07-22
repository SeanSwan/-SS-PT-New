/**
 * EvidenceLensBand — the gold Evidence Lens on Home v-next (SWA-25)
 * =================================================================
 * BLUEPRINT: The ratified signature proof device (DESIGN-RATIFICATION-FINAL-2026-07-16 §1:
 * "a gold Evidence Lens circles exactly ONE real-proof number per screen — the only badge
 * allowed to mark proof"). Visual language lifted VERBATIM from the Sean-taste-ratified
 * Webb Deep Field gallery artifact (gold ring + 4 tick marks, stroke-dash draw-in, mono
 * caption) — no new design decisions were invented here (Kimi-architect doctrine; this
 * band is flag-gated dark until the Kimi/Sean visual pass approves the flip).
 *
 * DATA-TRUTH CONTRACT (ratification §2.4 + PREREQ §3.4):
 *  - The circled number comes ONLY from content/marketingStats.ts (the provenance-tagged
 *    truth module — a contract test bans raw number claims in consumers).
 *  - exerciseLibrary is the chosen proof: the ONLY stat with [VERIFIED] provenance
 *    (live production SQL count, 2026-07-07) — and the one number the page's stats
 *    strip does NOT show (no duplicated fact on one screen, Swan card standard).
 *    Never an invented stat, never "0 workouts", never optimistic.
 *  - Copy states what the number IS. "We don't promise transformations — we record them."
 *
 * Motion: one stroke-dash draw (M-tier compliant, transform/opacity/dash only), fully
 * disabled under prefers-reduced-motion (ring renders complete). Non-interactive band —
 * no touch targets besides none; decorative SVG is aria-hidden with a text equivalent.
 */
import React from 'react';
import styled from 'styled-components';
import { MARKETING_STATS } from '../../../content/marketingStats';
// (path unchanged by the move — components/ and v-next/ sit at the same depth)

const Band = styled.section`
  position: relative;
  padding: clamp(48px, 8vw, 96px) 24px;
  background: var(--home-bg, var(--bg-base, #030712));
  text-align: center;
  overflow: hidden;
`;

const LensFigure = styled.figure`
  width: clamp(150px, 22vw, 220px);
  margin: 0 auto;
`;

/* The ring overlays ONLY this square stage — the caption lives BELOW it (live QA
   2026-07-21 caught the figcaption flowing inside the circle and colliding with
   the bottom arc; the gallery original always seated the caption under the ring). */
const RingStage = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: grid;
  place-items: center;
`;

const LensRing = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;

  circle {
    stroke-dasharray: 400;
    stroke-dashoffset: 0;
    animation: lens-draw 1.4s ease-out both;
  }

  @keyframes lens-draw {
    from { stroke-dashoffset: 400; }
    to { stroke-dashoffset: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    circle { animation: none; stroke-dashoffset: 0; }
  }
`;

const ProofNumber = styled.span`
  font-family: 'Fira Code', monospace;
  font-weight: 900;
  font-size: clamp(2.4rem, 6vw, 3.6rem);
  color: var(--text-primary, #e0ecf4);
  line-height: 1;
`;

const Caption = styled.figcaption`
  margin-top: 18px;
  font-family: 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-muted, rgba(224, 236, 244, 0.6));

  b {
    color: var(--accent-gold, #c6a84b);
    font-weight: 400;
  }
`;

const Lede = styled.p`
  max-width: 560px;
  margin: 28px auto 0;
  font-size: clamp(0.95rem, 1.6vw, 1.1rem);
  line-height: 1.65;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));

  em {
    font-style: normal;
    color: var(--accent-gold, #c6a84b);
  }
`;

const { exerciseLibrary } = MARKETING_STATS;

export function EvidenceLensBand(): React.JSX.Element {
  return (
    <Band aria-label="Evidence: recorded coaching outcomes">
      <LensFigure>
        <RingStage>
          <LensRing viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent-gold, #C6A84B)" strokeWidth="1.4" />
            <line x1="60" y1="0" x2="60" y2="12" stroke="var(--accent-gold, #C6A84B)" strokeWidth="1" />
            <line x1="60" y1="108" x2="60" y2="120" stroke="var(--accent-gold, #C6A84B)" strokeWidth="1" />
            <line x1="0" y1="60" x2="12" y2="60" stroke="var(--accent-gold, #C6A84B)" strokeWidth="1" />
            <line x1="108" y1="60" x2="120" y2="60" stroke="var(--accent-gold, #C6A84B)" strokeWidth="1" />
          </LensRing>
          <ProofNumber>
            {exerciseLibrary.value}
            {exerciseLibrary.suffix}
          </ProofNumber>
        </RingStage>
        <Caption>
          Evidence lens
          <br />
          <b>Exercises in the library — counted in production, not estimated</b>
        </Caption>
      </LensFigure>
      <Lede>
        The lens marks evidence, never hype. <em>We don&apos;t promise transformations — we record them</em>, one
        logged session at a time.
      </Lede>
    </Band>
  );
}

export default EvidenceLensBand;
