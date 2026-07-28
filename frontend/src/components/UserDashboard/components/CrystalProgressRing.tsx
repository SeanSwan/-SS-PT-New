/**
 * ============================================================================
 * FILE: CrystalProgressRing.tsx
 * PURPOSE: The client-home SIGNATURE MOMENT — a level-indexed "living crystal ring" that
 *   EVOLVES across 20 bands / 4 eras (1→1000). Each band is a distinct artifact (silhouette,
 *   material, motion, particle grammar, swan treatment) — not "the last band + more dots".
 *   The Swan crest is earned at the higher tiers and crowns the Apex.
 * AUTHOR: Claude Opus 4.8 (Kimi K3 + Claude fusion, evolution redesign 2026-07-27; motion-
 *   polish pass + original ring 2026-07-22 Kimi K3). SPEC: CRYSTAL-RING-EVOLUTION-SPEC-2026-07-27.md
 * ============================================================================
 * MANDATES (preserved): ONE master clock (harmonic derivations only); transform/opacity;
 *   static keyframes; SVG-only; no filter on rotating layers; var(--token,#fallback);
 *   reduced-motion = t=0 frame; ≤300 lines. Ring is decorative (aria-hidden); the accessible
 *   level/label live in the center overlay.
 * CLIP GUARANTEE: authored in a fixed 400×400 viewBox; ALL geometry lives within R_MAX=200
 *   (crystalRing.geometry FX budget). Renders at any CSS size; nothing ever clips.
 */

import React from 'react';
import { dialsFor } from './crystalRing.tiers';
import RingFx from './CrystalProgressRing.fx';
import CrystalSwanCrest from './CrystalSwanCrest';
import {
  CENTER, R_CORE, STROKE, VIEWBOX, CROWN_INNER, CROWN_OUTER,
  onCircle, polygonPath, polygonPerimeter, progressDash,
} from './crystalRing.geometry';
import {
  RingCenter, RingEraLabel, RingLevelValue, RingScrim, RingWrap,
} from './CrystalProgressRing.styles';

export type RingQuality = 'full' | 'lean' | 'still';

export interface CrystalProgressRingProps {
  pct: number;
  level: number;
  size?: number;
  quality?: RingQuality;
  /** Hide the era label when wrapped by SwanRankBadge (which owns the rank name). */
  hideEraLabel?: boolean;
}

const CrystalProgressRing: React.FC<CrystalProgressRingProps> = ({
  pct, level, size = 132, quality = 'full', hideEraLabel = false,
}) => {
  const reactId = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const safePct = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0));
  const d = dialsFor(level);
  const sides = d.sides;

  const still = quality === 'still';
  const lean = quality === 'lean';
  const ampl = quality === 'full' ? 1 : lean ? 0.5 : 0;
  const small = size < 160;

  const perim = polygonPerimeter(R_CORE, sides);
  const dash = progressDash(safePct, R_CORE, sides);
  const arcOpacity = 0.4 + d.evo * 0.5;

  // FX gating by quality / size.
  const showFilaments = !still && !small ? d.filaments : (still ? 0 : Math.min(2, d.filaments));
  const orbitalCount = still ? 0 : small ? Math.min(3, d.orbitalCount) : d.orbitalCount;
  const gemCount = still ? 0 : d.gemCount;
  const showAura = d.auraPulse && !still;
  const showFringe = !small && safePct > 0;
  const showSpark = d.sparkTip && safePct > 0;
  const showCrown = d.isUltimate;

  // Silhouette element: circle (sides<3) or polygon path, top-started so the dash begins at 12.
  const path = polygonPath(R_CORE, sides);
  const silTransform = sides < 3 ? `rotate(-90 ${CENTER} ${CENTER})` : undefined;
  const Sil = (cls: string, extra: React.SVGAttributes<SVGElement>) =>
    sides < 3
      ? <circle className={cls} cx={CENTER} cy={CENTER} r={R_CORE} fill="none" transform={silTransform} {...extra} />
      : <path className={cls} d={path as string} fill="none" transform={silTransform} {...extra} />;

  const uid = `cr${reactId}`;
  const gradId = `${uid}-g`;
  const fringeId = `${uid}-f`;
  const [c1, c2] = d.spectrum;
  const fringeLen = Math.min(perim * 0.05, 40);

  return (
    <RingWrap
      style={{
        width: size, height: size,
        ['--ring-loop' as string]: `${d.loopMs}ms`,
        ['--ring-glow' as string]: String(d.glow),
        ['--ring-ampl' as string]: String(ampl),
        ['--ring-scrim' as string]: String(d.scrimAlpha),
        ['--evo' as string]: String(d.evo.toFixed(3)),
      }}
      data-signature="crystal-progress-ring"
      data-era={d.era.key}
      data-motion={d.motion}
      data-ultimate={d.isUltimate ? 'true' : undefined}
    >
      <svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="55%" stopColor="var(--frost-white, #e0ecf4)" />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <linearGradient id={fringeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={d.arc} />
            <stop offset="100%" stopColor="var(--frost-white, #e0ecf4)" />
          </linearGradient>
        </defs>

        {/* Groove track (full silhouette perimeter) */}
        {Sil('ring-track', {
          stroke: 'color-mix(in srgb, var(--ice-wing, #60c0f0) 12%, transparent)',
          strokeWidth: STROKE, strokeLinejoin: 'round', strokeLinecap: 'round',
        })}

        {/* Swan crest (earned) — sits behind the fill so the arc can break for the emblem */}
        <CrystalSwanCrest stage={d.swan} uid={uid} />

        {/* Mid decorative FX */}
        <RingFx
          uid={uid} sides={sides} arc={d.arc} arcOpacity={arcOpacity} particle={d.particle}
          orbitalCount={orbitalCount} gemCount={gemCount} filaments={showFilaments}
          goldTrace={d.goldTrace} showAura={showAura}
        />

        {/* Progress fill — flowing era material */}
        {Sil('ring-fill', {
          stroke: `url(#${gradId})`, strokeWidth: STROKE, strokeLinecap: 'round', strokeLinejoin: 'round',
          strokeDasharray: `${dash} ${perim}`,
        })}

        {/* Dispersion fringe at the leading tip */}
        {showFringe && Sil('ring-fringe', {
          stroke: `url(#${fringeId})`, strokeWidth: 4, strokeLinecap: 'round',
          strokeDasharray: `${fringeLen} ${perim}`, strokeDashoffset: -(dash - fringeLen),
          style: { opacity: d.fringeAlpha },
        })}

        {/* Spark cap at the tip */}
        {showSpark && Sil('ring-spark', {
          stroke: 'var(--frost-white, #e0ecf4)', strokeWidth: STROKE * 0.5, strokeLinecap: 'round',
          strokeDasharray: `2 ${perim}`, strokeDashoffset: -(dash - 1),
        })}

        {/* Radiant crown — the Apex only: gold spikes within the FX budget */}
        {showCrown && (
          <g className="ring-crown">
            {Array.from({ length: 12 }, (_, i) => {
              const a = onCircle(R_CORE + CROWN_INNER, i, 12, -Math.PI / 2);
              const b = onCircle(R_CORE + CROWN_OUTER, i, 12, -Math.PI / 2);
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--gilded-fern, #c6a84b)" strokeWidth={2} strokeLinecap="round" opacity={0.85} />;
            })}
          </g>
        )}
      </svg>

      <RingScrim aria-hidden="true" />
      <RingCenter>
        {!hideEraLabel && <RingEraLabel>{d.era.name}</RingEraLabel>}
        <RingLevelValue>{d.level}</RingLevelValue>
      </RingCenter>
    </RingWrap>
  );
};

export default CrystalProgressRing;