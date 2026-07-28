/**
 * FILE: CrystalProgressRing.fx.tsx
 * PURPOSE: The decorative FX layers of the Crystal Ring — aura, gems (seated on the
 *   silhouette's vertices), comet electricity, gold-trace promise line, and orbital motes
 *   whose SHAPE is the era's particle grammar (dot/dash/shard/rune/comet), not just a count.
 *   Every element lives inside the FX budget (crystalRing.geometry) so nothing ever clips.
 * CONSTRAINTS: static SVG geometry (motion via the styled one-clock); no filter on rotating
 *   layers (gradient fills only); colors via token,#fallback; aria-hidden in the parent.
 */

import React from 'react';
import {
  CENTER, R_CORE, STROKE, ORBIT_OFFSET, onCircle,
} from './crystalRing.geometry';
import type { ParticleGrammar } from './crystalRing.tiers';

export interface RingFxProps {
  uid: string;
  sides: number;
  arc: string;
  arcOpacity: number;
  particle: ParticleGrammar;
  orbitalCount: number;
  gemCount: number;
  filaments: number;
  goldTrace: boolean;
  showAura: boolean;
}

const ORBIT_R = R_CORE + ORBIT_OFFSET;
const CIRC = 2 * Math.PI * R_CORE;

/** One orbital mote rendered in its era's particle grammar, at (x,y) with radial angle `a`. */
const Mote: React.FC<{ g: ParticleGrammar; x: number; y: number; a: number; sz: number; fill: string; grad: string }>
  = ({ g, x, y, a, sz, fill, grad }) => {
  const inx = x - Math.cos(a) * sz * 2.6; // tail/point toward center
  const iny = y - Math.sin(a) * sz * 2.6;
  switch (g) {
    case 'dash':
      return <line x1={x} y1={y} x2={inx} y2={iny} stroke={fill} strokeWidth={sz} strokeLinecap="round" opacity={0.85} />;
    case 'shard':
      return <path d={`M${x} ${y - sz * 1.8} L${x + sz} ${y + sz} L${x - sz} ${y + sz} Z`} fill={fill} opacity={0.85} transform={`rotate(${(a * 180) / Math.PI + 90} ${x} ${y})`} />;
    case 'rune':
      return <path d={`M${x} ${y - sz * 1.6} L${x + sz * 1.6} ${y} L${x} ${y + sz * 1.6} L${x - sz * 1.6} ${y} Z`} fill="none" stroke={fill} strokeWidth={1} opacity={0.85} />;
    case 'comet':
      return <>
        <line x1={x} y1={y} x2={inx} y2={iny} stroke={fill} strokeWidth={sz * 0.7} strokeLinecap="round" opacity={0.5} />
        <circle cx={x} cy={y} r={sz} fill={`url(#${grad})`} className="ring-orbital" />
      </>;
    default: // dot
      return <circle cx={x} cy={y} r={sz} fill={`url(#${grad})`} className="ring-orbital" />;
  }
};

const RingFx: React.FC<RingFxProps> = ({
  uid, sides, arc, arcOpacity, particle, orbitalCount, gemCount, filaments, goldTrace, showAura,
}) => {
  const gemGrad = `${uid}-gem`;
  const orbGrad = `${uid}-orb`;
  const seg = CIRC * 0.04;
  const gemR = sides >= 3 ? R_CORE : R_CORE; // gems sit on the band; polygon vertices when faceted

  return (
    <>
      <defs>
        <linearGradient id={gemGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--frost-white, #e0ecf4)" stopOpacity="0.95" />
          <stop offset="45%" stopColor={arc} />
          <stop offset="100%" stopColor={arc} stopOpacity="0.62" />
        </linearGradient>
        <radialGradient id={orbGrad}>
          <stop offset="0%" stopColor="var(--frost-white, #e0ecf4)" stopOpacity="0.95" />
          <stop offset="34%" stopColor={arc} stopOpacity="0.9" />
          <stop offset="100%" stopColor={arc} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Aura halo — soft ring behind, breathes via .ring-aura (scale about center). */}
      {showAura && (
        <circle className="ring-aura" cx={CENTER} cy={CENTER} r={R_CORE * 1.02} fill="none" stroke={arc} strokeWidth={STROKE * 0.7} />
      )}

      {/* Gold-trace promise line — a single thin inner gold ring (late Amethyst only). */}
      {goldTrace && (
        <circle cx={CENTER} cy={CENTER} r={R_CORE * 0.82} fill="none" stroke="var(--gilded-fern, #c6a84b)" strokeWidth={1} opacity={0.5} />
      )}

      {/* Faceted gems — seated on the silhouette's vertices (polygon) or evenly (circle). */}
      {gemCount > 0 && (
        <g className="ring-gems">
          {Array.from({ length: sides >= 3 ? sides : gemCount }, (_, i) => {
            const n = sides >= 3 ? sides : gemCount;
            const p = onCircle(gemR, i, n, -Math.PI / 2);
            const s = 4;
            return <rect key={i} x={p.x - s} y={p.y - s} width={s * 2} height={s * 2} fill={`url(#${gemGrad})`} opacity={0.9} transform={`rotate(45 ${p.x} ${p.y})`} />;
          })}
        </g>
      )}

      {/* Comet electricity — dimmed dash tail + bright leading head, on the energy circle. */}
      {filaments > 0 && (
        <g className="ring-arc-group">
          {Array.from({ length: filaments }, (_, i) => {
            const off = -(CIRC * (i / filaments));
            const theta = -Math.PI / 2 + (i / filaments) * 2 * Math.PI + (seg / CIRC) * 2 * Math.PI;
            const hx = CENTER + R_CORE * Math.cos(theta);
            const hy = CENTER + R_CORE * Math.sin(theta);
            return (
              <React.Fragment key={i}>
                <circle className="ring-filament" cx={CENTER} cy={CENTER} r={R_CORE} fill="none" stroke={arc} strokeWidth={2} strokeLinecap="round" strokeDasharray={`${seg} ${CIRC}`} strokeDashoffset={off} transform={`rotate(-90 ${CENTER} ${CENTER})`} style={{ opacity: arcOpacity * 0.72 }} />
                <circle className="ring-arc-head" cx={hx} cy={hy} r={2.4} fill="var(--frost-white, #e0ecf4)" style={{ opacity: Math.min(1, arcOpacity + 0.15) }} />
              </React.Fragment>
            );
          })}
        </g>
      )}

      {/* Orbital motes — the era's particle grammar, prime-count + detuned sizes. */}
      {orbitalCount > 0 && (
        <g className="ring-orbit-group">
          {Array.from({ length: orbitalCount }, (_, i) => {
            const p = onCircle(ORBIT_R, i, orbitalCount, -Math.PI / 2);
            const a = Math.atan2(p.y - CENTER, p.x - CENTER);
            const sz = [3.5, 2.5, 4][i % 3]; // varied sizes (Kimi: never uniform)
            return <Mote key={i} g={particle} x={p.x} y={p.y} a={a} sz={sz} fill={arc} grad={orbGrad} />;
          })}
        </g>
      )}
    </>
  );
};

export default RingFx;
