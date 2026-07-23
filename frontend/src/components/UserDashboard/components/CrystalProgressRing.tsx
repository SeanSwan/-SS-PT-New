/**
 * ============================================================================
 * FILE: CrystalProgressRing.tsx
 * PURPOSE: The client-home SIGNATURE MOMENT (design.md §8) — a level-indexed
 *          "living crystal ring" that evolves a little EVERY level from 1 to
 *          1000, building toward an ultimate ring. Flowing purple↔cyan gradient
 *          with electricity circling the band; escalates in depth as you climb.
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22 | Kimi K3 design pass 2026-07-22
 * ============================================================================
 *
 * KIMI K3 MANDATES (all applied):
 *   1. Index to LEVEL not tier — dials are smooth functions of level (1–1000);
 *      tier boundaries (every 20) are celebration thresholds, not the only
 *      change. See crystalRing.tiers.ts.
 *   2. ONE master clock — the whole ring is phase-locked to a single rotation
 *      loop (`--ring-loop`). Escalation adds DEPTH; motion SLOWS as it deepens
 *      (loopMs grows with ascent). No independent second animator.
 *   3. Numeral sanctuary — an obsidian scrim behind the level number whose
 *      opacity scales UP with ambient light so the numeral never drowns.
 *   4. Electricity is FAKED with transform:rotate() on STATIC filament paths —
 *      never animated stroke-dashoffset/dasharray, never SVG feTurbulence
 *      filters (both are paint-bound; this is compositor-safe).
 *   5. ONE styled wrapper; ALL dynamics via CSS custom properties (the engine
 *      writes --vars); keyframes are static, defined once in the styles file.
 *   6. SVG-only (no canvas in this build). Full/Lean/Still via `quality`;
 *      reduced-motion = the engine's t=0 frame (amplitude→0), one code path.
 *   7. Responsive: dials quantize at small radii (fringe/filaments drop below
 *      ~160px render size).
 *
 * CANON: §4 dispersion (fringe monotonic in wavelength, ≤0.7 alpha); §8 one
 *   signature/route; §2 transform/opacity only; §3 reduced-motion. Ring is
 *   decorative (aria-hidden); the accessible progressbar stays on the parent.
 */

import React from 'react';
import { dialsFor } from './crystalRing.tiers';
import {
  RingCenter,
  RingEraLabel,
  RingLevelValue,
  RingScrim,
  RingWrap,
} from './CrystalProgressRing.styles';

export type RingQuality = 'full' | 'lean' | 'still';

export interface CrystalProgressRingProps {
  /** 0–100 progress toward the next level. */
  pct: number;
  /** Level number rendered at the ring's center (1–1000). */
  level: number;
  /** Diameter in px (default 132). */
  size?: number;
  /** Runtime quality mode (Kimi Full/Lean/Still). Default 'full'. */
  quality?: RingQuality;
}

const STROKE = 8;
const GAP_DEG = 4;

/** Precomputed static filament segment along the ring, rotated by the loop.
 *  A short dashed arc reads as a crackle of light chasing the band. */
function Filament({ r, circ, cx, cy, index, count, arc, opacity }: {
  r: number; circ: number; cx: number; cy: number;
  index: number; count: number; arc: string; opacity: number;
}) {
  const segLen = circ * 0.04;
  const offset = -(circ * (index / count));
  return (
    <circle
      className="ring-filament"
      cx={cx}
      cy={cy}
      r={r}
      fill="none"
      stroke={arc}
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray={`${segLen} ${circ}`}
      strokeDashoffset={offset}
      transform={`rotate(-90 ${cx} ${cy})`}
      style={{ opacity }}
    />
  );
}

const CrystalProgressRing: React.FC<CrystalProgressRingProps> = ({
  pct,
  level,
  size = 132,
  quality = 'full',
}) => {
  const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const safeLevel = Math.max(1, Math.min(1000, Number.isFinite(level) ? Math.round(level) : 1));
  const d = dialsFor(safeLevel);

  const r = (size - STROKE) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sweep = (circ * (360 - GAP_DEG)) / 360;
  const dash = (safePct / 100) * sweep;

  // Responsive quantization (Kimi): drop fine detail at small render sizes.
  const small = size < 160;
  const showFringe = !small;
  const showFilaments = quality !== 'still' && d.arcOpacity > 0.3;
  const filamentCount = small ? Math.min(1, d.arcCount) : d.arcCount;

  // Motion amplitude: 1 for full, damped for lean, 0 for still.
  const ampl = quality === 'full' ? 1 : quality === 'lean' ? 0.5 : 0;

  const fringeLen = Math.min(sweep * 0.06, circ * 0.05);
  const fringeOffset = Math.max(0, dash - fringeLen);

  const uid = `crystal-ring-${size}-${d.era.key}`;
  const gradId = `${uid}-grad`;
  const fringeId = `${uid}-fringe`;

  // Build the flowing spectrum gradient from the era's ordered stops.
  const stops = d.era.spectrum;

  return (
    <RingWrap
      style={{
        width: size,
        height: size,
        // One master clock + all dynamics as CSS vars (Kimi mandate 5).
        ['--ring-loop' as string]: `${d.loopMs}ms`,
        ['--ring-glow' as string]: String(d.glow),
        ['--ring-ampl' as string]: String(ampl),
        ['--ring-scrim' as string]: String(d.scrimAlpha),
      }}
      data-signature="crystal-progress-ring"
      data-era={d.era.key}
      data-ultimate={d.isUltimate ? 'true' : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <defs>
          {/* Flowing ring spectrum — rotated by the master clock so the
              purple↔cyan gradient sweeps around the band. */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {stops.map((c, i) => (
              <stop key={i} offset={`${Math.round((i / (stops.length - 1)) * 100)}%`} stopColor={c} />
            ))}
          </linearGradient>
          {/* §4 dispersion fringe — monotonic, warm gold at the leading tip. */}
          <linearGradient id={fringeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wing-purple, #8b5cf6)" />
            <stop offset="34%" stopColor="var(--swan-lavender, #4070c0)" />
            <stop offset="68%" stopColor="var(--ice-wing, #60c0f0)" />
            <stop offset="100%" stopColor="var(--gilded-fern, #c6a84b)" />
          </linearGradient>
        </defs>

        {/* Obsidian groove track */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent)"
          strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${sweep} ${circ}`}
          transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
        />

        {/* Electricity filaments — static geometry, the whole GROUP is rotated
            by the master clock (compositor-safe; no animated path data). */}
        {showFilaments && (
          <g className="ring-arc-group">
            {Array.from({ length: filamentCount }, (_, i) => (
              <Filament
                key={i} r={r} circ={circ} cx={cx} cy={cy}
                index={i} count={filamentCount}
                arc={d.era.arc} opacity={d.arcOpacity}
              />
            ))}
          </g>
        )}

        {/* Progress fill — the flowing era spectrum */}
        <circle
          className="ring-fill"
          cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
        />

        {/* Dispersion fringe at the leading tip */}
        {showFringe && safePct > 0 && (
          <circle
            className="ring-fringe"
            cx={cx} cy={cy} r={r} fill="none"
            stroke={`url(#${fringeId})`}
            strokeWidth={1.5} strokeLinecap="round"
            strokeDasharray={`${fringeLen} ${circ}`}
            strokeDashoffset={-fringeOffset}
            transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
            style={{ opacity: d.fringeAlpha }}
          />
        )}
      </svg>

      {/* Numeral sanctuary — obsidian scrim (opacity scales up with light) so
          the level number stays ≥4.5:1 at every era. */}
      <RingScrim aria-hidden="true" />
      <RingCenter>
        <RingEraLabel>{d.era.name}</RingEraLabel>
        <RingLevelValue>{safeLevel}</RingLevelValue>
      </RingCenter>
    </RingWrap>
  );
};

export default CrystalProgressRing;
