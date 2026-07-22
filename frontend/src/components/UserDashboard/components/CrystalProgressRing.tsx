/**
 * ============================================================================
 * FILE: CrystalProgressRing.tsx
 * PURPOSE: The client-home SIGNATURE MOMENT (design.md §8 — one per route).
 *          A faceted crystal level-ring: an SVG stroke ring around the level
 *          number whose leading (progress) edge carries a 1.5px spectral
 *          dispersion fringe — monotonic violet→blue→cyan→gold per the §4
 *          dispersion law (light split by a facet, not a rainbow gradient).
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22
 * ============================================================================
 *
 * WHAT IT DOES: renders `pct` (0–100, progress to next level) as a swept ring
 *   arc, with the level number centered. On a progress change the fringe
 *   brightens 0.5→0.8 alpha at SNAP (Response tier, opacity only — GPU-safe).
 *
 * WHY IT DIVERGES FROM MOBBIN: every fitness app has a progress ring
 *   (Fitbit/Withings). This one splits white light into a spectrally-ORDERED
 *   fringe on its facet edge — physics, not a colored ring — which only the
 *   Crystalline canon defines. That is the unmistakable-Swan flourish.
 *
 * CANON:
 *   - §4 dispersion: fringe stops monotonic in wavelength (Wing Purple 420 →
 *     Swan Lavender 450 → Ice Wing 488 → Gilded Fern 580); no danger red;
 *     coverage ≪2% viewport; opacity ≤0.6; static under reduced motion.
 *   - §8 two-speed: SNAP fringe-brighten beat (the momentum pulse). The fill
 *     renders at value — no paint-driven stroke animation.
 *   - §3 reduced-motion: motion is CSS-only (styled keyframe on .ring-fringe),
 *     so the CSS @media gate is the complete gate — there is no JS motion path.
 *   - §2 opacity-only animation. Rule 43: interpolated keyframe frag uses css``.
 *   - Ring is decorative (aria-hidden); the accessible progressbar with
 *     aria-valuenow stays in the parent (the linear track + readout).
 */

import React from 'react';
import {
  RingCenter,
  RingLevelLabel,
  RingLevelValue,
  RingWrap,
} from './CrystalProgressRing.styles';

export interface CrystalProgressRingProps {
  /** 0–100 progress toward the next level. */
  pct: number;
  /** Level number rendered at the ring's center. */
  level: number;
  /** Diameter in px (default 132). */
  size?: number;
}

const STROKE = 8;
const GAP_DEG = 4; // small facet gap at the ring's start so the edge reads as cut, not closed

const CrystalProgressRing: React.FC<CrystalProgressRingProps> = ({ pct, level, size = 132 }) => {
  const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));

  const r = (size - STROKE) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  // Leave a small facet gap so the ring reads as a cut edge, not a closed loop.
  const sweep = (circ * (360 - GAP_DEG)) / 360;
  const dash = (safePct / 100) * sweep;

  // The fringe is a short spectral arc riding the LEADING edge of the progress
  // sweep — a ≤2px facet, not a fill. Positioned by the same dash geometry.
  const fringeLen = Math.min(sweep * 0.06, circ * 0.05); // tiny facet, ≪2% coverage
  const fringeOffset = Math.max(0, dash - fringeLen);

  const gradId = `crystal-ring-fringe-${size}`;

  return (
    <RingWrap style={{ width: size, height: size }} data-signature="crystal-progress-ring">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <defs>
          {/* §4 dispersion: monotonic in wavelength. Ordered so the warm gold
              terminal stop sits at the leading tip of the swept arc. */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wing-purple, #8b5cf6)" />
            <stop offset="34%" stopColor="var(--swan-lavender, #4070c0)" />
            <stop offset="68%" stopColor="var(--ice-wing, #60c0f0)" />
            <stop offset="100%" stopColor="var(--gilded-fern, #c6a84b)" />
          </linearGradient>
        </defs>

        {/* Base track — obsidian groove */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${sweep} ${circ}`}
          transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
        />

        {/* Progress fill — Ice Wing crystal light. Rendered at value (no
            stroke animation — §2 keeps motion to transform/opacity; the
            signature beat is the fringe's opacity pulse, not a paint-driven
            stroke draw). */}
        <circle
          className="ring-fill"
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--ice-wing, #60c0f0)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
        />

        {/* Spectral dispersion fringe — the §4 facet edge riding the leading tip.
            1.5px, ≤0.6 alpha, brightens on change via the wrapper's SNAP class. */}
        {safePct > 0 && (
          <circle
            className="ring-fringe"
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray={`${fringeLen} ${circ}`}
            strokeDashoffset={-fringeOffset}
            transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
          />
        )}
      </svg>

      <RingCenter>
        <RingLevelLabel>Level</RingLevelLabel>
        <RingLevelValue>{level}</RingLevelValue>
      </RingCenter>
    </RingWrap>
  );
};

export default CrystalProgressRing;
