/**
 * ============================================================================
 * FILE: CrystalProgressRing.tsx
 * PURPOSE: The client-home SIGNATURE MOMENT (design.md §8) — a level-indexed
 *          "living crystal ring" that evolves every level from 1→1000 and takes
 *          on a distinct identity every 50 levels (20 bands), building toward
 *          the ultimate Apex ring. Flowing purple↔cyan↔gold gradient, electricity
 *          circling the band, plus escalating FX: aura halo, orbital sparks,
 *          faceted gems, a counter-rotating twin band, an inner glyph ring, a
 *          progress-tip spark, and a radiant crown at Level 1000.
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22 | Kimi K3 design pass 2026-07-22
 * ============================================================================
 *
 * KIMI K3 + SEAN MANDATES (all applied):
 *   - Index to LEVEL not tier; 20 bands (every 50 levels) give a visible new
 *     identity ~2.5× as often as the prior 5 eras. crystalRing.tiers.ts.
 *   - ONE master clock — every FX layer is phase-locked to a single rotation
 *     loop; escalation adds DEPTH, motion SLOWS as it deepens. FX are layers,
 *     NOT independent animators.
 *   - Electricity + all rotating FX are STATIC geometry rotated by transform —
 *     never animated stroke-dashoffset/dasharray, never SVG feTurbulence.
 *   - ONE styled wrapper; dynamics via CSS custom properties; static keyframes.
 *   - Numeral sanctuary scrim scales up with the light. SVG-only.
 *   - Full/Lean/Still quality; reduced-motion = the t=0 frame. Responsive
 *     quantization at small render sizes.
 *
 * CANON: §4 dispersion fringe (monotonic, ≤0.7α); §8 one signature/route; §2
 *   transform/opacity only; §3 reduced-motion. Ring is decorative (aria-hidden);
 *   the accessible progressbar stays on the parent.
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
  pct: number;
  level: number;
  size?: number;
  quality?: RingQuality;
}

const STROKE = 8;
const GAP_DEG = 4;
const TAU = Math.PI * 2;

/** Points evenly spaced on a circle of radius `rad` about (cx,cy). */
const onCircle = (cx: number, cy: number, rad: number, i: number, n: number, phase = 0) => {
  const t = phase + (i / n) * TAU;
  return { x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) };
};

const CrystalProgressRing: React.FC<CrystalProgressRingProps> = ({
  pct,
  level,
  size = 132,
  quality = 'full',
}) => {
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

  const uid = `cr-${size}-${d.era.key}`;
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
              <stop key={i} offset={`${Math.round((i / (stops.length - 1)) * 100)}%`} stopColor={c} />
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

        {/* Faceted gem nodes set into the ring — static diamonds */}
        {gemCount > 0 && (
          <g className="ring-gems">
            {Array.from({ length: gemCount }, (_, i) => {
              const p = onCircle(cx, cy, r, i, gemCount, -Math.PI / 2);
              const s = small ? 2 : 2.6;
              return (
                <rect
                  key={i} x={p.x - s} y={p.y - s} width={s * 2} height={s * 2}
                  fill={d.era.arc} opacity={0.85}
                  transform={`rotate(45 ${p.x} ${p.y})`}
                />
              );
            })}
          </g>
        )}

        {/* Electricity filaments — static, whole group rotated by master clock */}
        {showFilaments && (
          <g className="ring-arc-group">
            {Array.from({ length: filamentCount }, (_, i) => {
              const seg = circ * 0.04;
              const off = -(circ * (i / filamentCount));
              return (
                <circle
                  key={i} cx={cx} cy={cy} r={r} fill="none"
                  className="ring-filament"
                  stroke={d.era.arc} strokeWidth={2} strokeLinecap="round"
                  strokeDasharray={`${seg} ${circ}`} strokeDashoffset={off}
                  transform={`rotate(-90 ${cx} ${cy})`} style={{ opacity: d.arcOpacity }}
                />
              );
            })}
          </g>
        )}

        {/* Counter-rotating twin band (inner) */}
        {showTwin && (() => {
          const n = Math.max(2, Math.round(filamentCount / 2));
          const seg = circ * 0.03;
          const innerR = r - STROKE * 1.3;
          const innerCirc = TAU * innerR;
          return (
            <g className="ring-twin-group">
              {Array.from({ length: n }, (_, i) => (
                <circle
                  key={i} cx={cx} cy={cy} r={innerR} fill="none"
                  className="ring-twin"
                  stroke="var(--ice-wing, #60c0f0)" strokeWidth={1.5} strokeLinecap="round"
                  strokeDasharray={`${seg} ${innerCirc}`} strokeDashoffset={-(innerCirc * (i / n))}
                  transform={`rotate(-90 ${cx} ${cy})`} opacity={0.55}
                />
              ))}
            </g>
          );
        })()}

        {/* Inner rotating facet glyph ring */}
        {showGlyph && (
          <g className="ring-glyph-group">
            {Array.from({ length: 6 }, (_, i) => {
              const p = onCircle(cx, cy, r * 0.52, i, 6, -Math.PI / 2);
              return <circle key={i} cx={p.x} cy={p.y} r={1.4} fill="var(--gilded-fern, #c6a84b)" opacity={0.7} />;
            })}
          </g>
        )}

        {/* Orbital luminous dots — static positions, group rotated by the clock */}
        {orbitalCount > 0 && (
          <g className="ring-orbit-group">
            {Array.from({ length: orbitalCount }, (_, i) => {
              const p = onCircle(cx, cy, r + STROKE * 0.9, i, orbitalCount, -Math.PI / 2);
              return <circle key={i} cx={p.x} cy={p.y} r={small ? 1.4 : 2} fill={d.era.arc} className="ring-orbital" />;
            })}
          </g>
        )}

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
        <RingEraLabel>{d.era.name}</RingEraLabel>
        <RingLevelValue>{safeLevel}</RingLevelValue>
      </RingCenter>
    </RingWrap>
  );
};

export default CrystalProgressRing;