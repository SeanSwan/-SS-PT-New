/**
 * FILE: CrystalProgressRing.fx.tsx
 * PURPOSE: The decorative FX layers of the Crystal Ring (aura, faceted gems,
 *   comet-head electricity filaments, counter twin band, inner glyph ring,
 *   glowing orbital motes, ultimate crown). Extracted from the main component so
 *   each file stays under the 300-line cap (Rule 4) while the FX gained real
 *   material craft in the 2026-07-27 polish pass.
 * POLISH: filaments now lead with a bright COMET HEAD over a dimmed tail (was a
 *   uniform-opacity sliding dash → cheap marquee); orbitals are soft radial-glow
 *   MOTES (was flat pinpoints); gems carry a lit FACET gradient (was flat squares).
 *   All static geometry — motion lives in the styles' one master clock. Colors via
 *   token,#fallback (Rule 6); the whole SVG is aria-hidden in the parent.
 */

import React from 'react';

const TAU = Math.PI * 2;

/** Points evenly spaced on a circle of radius `rad` about (cx,cy). */
export const onCircle = (cx: number, cy: number, rad: number, i: number, n: number, phase = 0) => {
  const t = phase + (i / n) * TAU;
  return { x: cx + rad * Math.cos(t), y: cy + rad * Math.sin(t) };
};

export interface RingFxProps {
  uid: string;
  cx: number;
  cy: number;
  r: number;
  circ: number;
  stroke: number;
  small: boolean;
  arc: string;
  arcOpacity: number;
  showFilaments: boolean;
  filamentCount: number;
  showTwin: boolean;
  showGlyph: boolean;
  orbitalCount: number;
  gemCount: number;
}

/**
 * Mid-layer decorative FX (gems, comet filaments, twin band, glyph ring, orbital
 * motes), rendered between the groove track and the progress fill. The aura
 * (behind) and crown (on top) stay in the parent to preserve exact paint order.
 * Owns its own gradient defs (gem facet + orbital glow), keyed by `uid`.
 */
const RingFx: React.FC<RingFxProps> = ({
  uid, cx, cy, r, circ, stroke, small, arc, arcOpacity,
  showFilaments, filamentCount, showTwin, showGlyph, orbitalCount, gemCount,
}) => {
  const gemGrad = `${uid}-gem`;
  const orbGrad = `${uid}-orb`;
  const seg = circ * 0.04;

  return (
    <>
      <defs>
        {/* Faceted gem — lit from the top-left corner into the era color. */}
        <linearGradient id={gemGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--frost-white, #e0ecf4)" stopOpacity="0.95" />
          <stop offset="45%" stopColor={arc} />
          <stop offset="100%" stopColor={arc} stopOpacity="0.62" />
        </linearGradient>
        {/* Glowing mote — bright core fading to transparent (soft-edged dot). */}
        <radialGradient id={orbGrad}>
          <stop offset="0%" stopColor="var(--frost-white, #e0ecf4)" stopOpacity="0.95" />
          <stop offset="34%" stopColor={arc} stopOpacity="0.9" />
          <stop offset="100%" stopColor={arc} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Faceted gem nodes set into the ring — cut-stone gradient diamonds */}
      {gemCount > 0 && (
        <g className="ring-gems">
          {Array.from({ length: gemCount }, (_, i) => {
            const p = onCircle(cx, cy, r, i, gemCount, -Math.PI / 2);
            const s = small ? 2 : 2.6;
            return (
              <rect
                key={i} x={p.x - s} y={p.y - s} width={s * 2} height={s * 2}
                fill={`url(#${gemGrad})`} opacity={0.92}
                transform={`rotate(45 ${p.x} ${p.y})`}
              />
            );
          })}
        </g>
      )}

      {/* Electricity filaments — dimmed tail dash + bright leading comet head,
          whole group rotated by the master clock. */}
      {showFilaments && (
        <g className="ring-arc-group">
          {Array.from({ length: filamentCount }, (_, i) => {
            const off = -(circ * (i / filamentCount));
            // leading-head angle: dash start (top, rotate -90) + i-share + dash length
            const theta = -Math.PI / 2 + (i / filamentCount) * TAU + (seg / circ) * TAU;
            const head = { x: cx + r * Math.cos(theta), y: cy + r * Math.sin(theta) };
            return (
              <React.Fragment key={i}>
                <circle
                  cx={cx} cy={cy} r={r} fill="none"
                  className="ring-filament"
                  stroke={arc} strokeWidth={2} strokeLinecap="round"
                  strokeDasharray={`${seg} ${circ}`} strokeDashoffset={off}
                  transform={`rotate(-90 ${cx} ${cy})`} style={{ opacity: arcOpacity * 0.72 }}
                />
                <circle
                  className="ring-arc-head"
                  cx={head.x} cy={head.y} r={small ? 1.6 : 2.3}
                  fill="var(--frost-white, #e0ecf4)" style={{ opacity: Math.min(1, arcOpacity + 0.15) }}
                />
              </React.Fragment>
            );
          })}
        </g>
      )}

      {/* Counter-rotating twin band (inner) */}
      {showTwin && (() => {
        const n = Math.max(2, Math.round(filamentCount / 2));
        const tSeg = circ * 0.03;
        const innerR = r - stroke * 1.3;
        const innerCirc = TAU * innerR;
        return (
          <g className="ring-twin-group">
            {Array.from({ length: n }, (_, i) => (
              <circle
                key={i} cx={cx} cy={cy} r={innerR} fill="none"
                className="ring-twin"
                stroke="var(--ice-wing, #60c0f0)" strokeWidth={1.5} strokeLinecap="round"
                strokeDasharray={`${tSeg} ${innerCirc}`} strokeDashoffset={-(innerCirc * (i / n))}
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

      {/* Orbital glowing motes — soft radial-glow dots, group rotated by the clock */}
      {orbitalCount > 0 && (
        <g className="ring-orbit-group">
          {Array.from({ length: orbitalCount }, (_, i) => {
            const p = onCircle(cx, cy, r + stroke * 0.9, i, orbitalCount, -Math.PI / 2);
            return <circle key={i} cx={p.x} cy={p.y} r={small ? 2.6 : 3.6} fill={`url(#${orbGrad})`} className="ring-orbital" />;
          })}
        </g>
      )}
    </>
  );
};

export default RingFx;