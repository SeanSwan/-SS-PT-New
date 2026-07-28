/**
 * ============================================================================
 * FILE: CrystalProgressRing.tsx
 * PURPOSE: The client-home SIGNATURE MOMENT (design.md §8) — a level-indexed
 *          "living crystal ring" that evolves every level from 1→1000 and takes
 *          on a distinct identity every 50 levels (20 bands), building toward
 *          the ultimate Apex ring. Flowing purple↔cyan↔gold gradient, electricity
 *          circling the band, plus escalating FX: aura halo, orbital motes,
 *          faceted gems, a counter-rotating twin band, an inner glyph ring, a
 *          progress-tip spark, and a radiant crown at Level 1000.
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22 | Kimi K3 design pass 2026-07-22
 *          | motion-polish pass 2026-07-27 (detuned parallax periods, entrance
 *            bloom, comet-head filaments, glowing motes, faceted gems)
 * ============================================================================
 *
 * KIMI K3 + SEAN MANDATES (all preserved through the polish pass):
 *   - Index to LEVEL not tier; 20 bands (every 50 levels). crystalRing.tiers.ts.
 *   - ONE master clock — every FX layer is phase-locked to a single rotation
 *     loop (the polish detunes periods as HARMONIC DERIVATIONS of that one
 *     --ring-loop, not new animators); escalation adds DEPTH.
 *   - Electricity + all rotating FX are STATIC geometry rotated by transform —
 *     never animated stroke-dashoffset/dasharray, never SVG feTurbulence.
 *   - ONE styled wrapper; dynamics via CSS custom properties; static keyframes.
 *   - Numeral sanctuary scrim scales up with the light. SVG-only.
 *   - Full/Lean/Still quality; reduced-motion = the t=0 frame.
 *
 * CANON: §4 dispersion fringe (monotonic, ≤0.7α); §8 one signature/route; §2
 *   transform/opacity only; §3 reduced-motion. Ring is decorative (aria-hidden);
 *   the accessible progressbar stays on the parent. Decorative FX layers live in
 *   CrystalProgressRing.fx.tsx (Rule 4 line cap); the structural progress arc,
 *   aura, and crown stay here to preserve exact paint order.
 */

import React from 'react';
import { dialsFor } from './crystalRing.tiers';
import RingFx, { onCircle } from './CrystalProgressRing.fx';
import {
  RingCenter,
  RingEraLabel,
  RingLevelValue,
  RingScrim,
  RingWrap,
} from './CrystalProgressRing.styles';

export type RingQuality = 'full' | 'lean' | 'still';

export interface CrystalProgressRingProps {
  pct: number;
  level: number;
  size?: number;
  quality?: RingQuality;
  /** Hide the era label when the ring is wrapped by SwanRankBadge, which owns
   *  the identity label (rank name) — avoids two taxonomies for one level. */
  hideEraLabel?: boolean;
}

const STROKE = 8;
const GAP_DEG = 4;
const TAU = Math.PI * 2;

const CrystalProgressRing: React.FC<CrystalProgressRingProps> = ({
  pct,
  level,
  size = 132,
  quality = 'full',
  hideEraLabel = false,
}) => {
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const safeLevel = Math.max(1, Math.min(1000, Number.isFinite(level) ? Math.round(level) : 1));
  const d = dialsFor(safeLevel);
  const fx = d.fx;

  const r = (size - STROKE) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = TAU * r;
  const sweep = (circ * (360 - GAP_DEG)) / 360;
  const dash = (safePct / 100) * sweep;

  // Responsive + quality quantization.
  const small = size < 160;
  const still = quality === 'still';
  const lean = quality === 'lean';
  const ampl = quality === 'full' ? 1 : lean ? 0.5 : 0;

  const showFringe = !small;
  const showFilaments = !still && d.arcOpacity > 0.3;
  const filamentCount = small ? Math.min(2, fx.filaments) : fx.filaments;
  const showTwin = fx.twinBand && !still && !small;
  const orbitalCount = still ? 0 : small ? Math.min(2, fx.orbitals) : (lean ? Math.min(4, fx.orbitals) : fx.orbitals);
  const gemCount = small ? Math.min(4, fx.facetGems) : fx.facetGems;
  const showAura = fx.auraPulse && !still;
  const showSpark = fx.sparkTip && safePct > 0;
  const showGlyph = fx.innerGlyph && !small;
  const showCrown = fx.crown;

  const fringeLen = Math.min(sweep * 0.06, circ * 0.05);
  const fringeOffset = Math.max(0, dash - fringeLen);

  // Leading-tip position (for the spark) at the end of the progress sweep.
  const tipAngle = -Math.PI / 2 + (GAP_DEG / 2) * (Math.PI / 180) + (safePct / 100) * (sweep / circ) * TAU;
  const tip = { x: cx + r * Math.cos(tipAngle), y: cy + r * Math.sin(tipAngle) };

  // useId keeps the SVG gradient ids unique even when two same-size, same-era
  // rings render on one page (document-global ids — hostile-review LOW).
  const uid = `cr${reactId}`;
  const gradId = `${uid}-g`;
  const fringeId = `${uid}-f`;
  const stops = d.era.spectrum;

  return (
    <RingWrap
      style={{
        width: size,
        height: size,
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
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {stops.map((c, i) => (
              // guard divisor: a future single-stop spectrum would divide by 0
              <stop key={i} offset={`${Math.round((i / Math.max(1, stops.length - 1)) * 100)}%`} stopColor={c} />
            ))}
          </linearGradient>
          <linearGradient id={fringeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--wing-purple, #8b5cf6)" />
            <stop offset="34%" stopColor="var(--swan-lavender, #4070c0)" />
            <stop offset="68%" stopColor="var(--ice-wing, #60c0f0)" />
            <stop offset="100%" stopColor="var(--gilded-fern, #c6a84b)" />
          </linearGradient>
        </defs>

        {/* Aura halo — a soft breathing ring behind everything */}
        {showAura && (
          <circle
            className="ring-aura"
            cx={cx} cy={cy} r={r * 0.98} fill="none"
            stroke={d.era.arc} strokeWidth={STROKE * 1.6}
          />
        )}

        {/* Obsidian groove track */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke="color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent)"
          strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={`${sweep} ${circ}`}
          transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
        />

        {/* Mid decorative FX (gems, comet filaments, twin, glyph, motes) */}
        <RingFx
          uid={uid} cx={cx} cy={cy} r={r} circ={circ} stroke={STROKE} small={small}
          arc={d.era.arc} arcOpacity={d.arcOpacity}
          showFilaments={showFilaments} filamentCount={filamentCount}
          showTwin={showTwin} showGlyph={showGlyph}
          orbitalCount={orbitalCount} gemCount={gemCount}
        />

        {/* Progress fill — flowing era spectrum */}
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
            strokeDasharray={`${fringeLen} ${circ}`} strokeDashoffset={-fringeOffset}
            transform={`rotate(${-90 + GAP_DEG / 2} ${cx} ${cy})`}
            style={{ opacity: d.fringeAlpha }}
          />
        )}

        {/* Spark burst at the progress tip */}
        {showSpark && (
          <circle className="ring-spark" cx={tip.x} cy={tip.y} r={small ? 2.4 : 3.4} fill="var(--frost-white, #e0ecf4)" />
        )}

        {/* Radiant crown — ultimate (L1000) only: gold spikes around the ring */}
        {showCrown && (
          <g className="ring-crown">
            {Array.from({ length: 12 }, (_, i) => {
              const a = onCircle(cx, cy, r + STROKE * 0.6, i, 12, -Math.PI / 2);
              const b = onCircle(cx, cy, r + STROKE * 2.4, i, 12, -Math.PI / 2);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--gilded-fern, #c6a84b)" strokeWidth={1.5} strokeLinecap="round" opacity={0.85} />;
            })}
          </g>
        )}
      </svg>

      <RingScrim aria-hidden="true" />
      <RingCenter>
        {!hideEraLabel && <RingEraLabel>{d.era.name}</RingEraLabel>}
        <RingLevelValue>{safeLevel}</RingLevelValue>
      </RingCenter>
    </RingWrap>
  );
};

export default CrystalProgressRing;
