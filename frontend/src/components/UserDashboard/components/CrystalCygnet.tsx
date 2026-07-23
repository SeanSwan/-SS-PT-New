/**
 * ============================================================================
 * FILE: CrystalCygnet.tsx
 * PURPOSE: The first Swan COMPANION — a crystalline cygnet familiar that
 *          perches on the rank badge. Built to Kimi K3's Companion
 *          Art-Direction Charter so it is premium-cute, not gacha-cute.
 * AUTHOR:  Claude Opus 4.8 | CREATED: 2026-07-22 | Kimi K3 charter
 * ============================================================================
 *
 * KIMI ART-DIRECTION CHARTER (verbatim intent):
 *  - SHARED GEOMETRY DNA: built from the same facet primitives as the ring +
 *    badge — low-poly crystalline planes, internal glow (Ice Wing core light
 *    through Frost White planes), NO outlines, NO soft cartoon shading, NO
 *    drop shadows (mud on the vault).
 *  - CUTE THROUGH PROPORTION + MOTION, not style: oversized head-to-body ratio,
 *    tiny bob/waddle, head-tilt idle, curious blink. Rendering style stays 100%
 *    Crystalline-vault; appeal lives in animation + silhouette.
 *  - RESTRAINT: eyes = two small facet-glints; no mouth lines.
 *  - THE MOLT: the cygnet is GUNMETAL at low level and WHITENS as it levels
 *    (the same Molt as the badge — feels authored, not bolted on).
 *  - GPU-safe (transform/opacity); ONE idle loop; reduced-motion freezes it in
 *    a charming pose (not vanish).
 */

import React from 'react';
import { CygnetWrap } from './CrystalCygnet.styles';

export interface CrystalCygnetProps {
  /** Drives the Molt: low level = gunmetal, high level = frost-white. */
  level: number;
  size?: number;
  quality?: 'full' | 'lean' | 'still';
}

/** Molt: blend gunmetal → frost-white by ascent. Returns a color-mix pct. */
const moltWhite = (level: number): number => {
  const L = Math.max(1, Math.min(1000, Number.isFinite(level) ? level : 1));
  return Math.round(20 + (L / 1000) * 70); // 20% → 90% frost-white plane fill
};

const CrystalCygnet: React.FC<CrystalCygnetProps> = ({ level, size = 40, quality = 'full' }) => {
  const white = moltWhite(level);
  const still = quality === 'still';

  return (
    <CygnetWrap
      style={{
        width: size,
        height: size,
        ['--molt-white' as string]: `${white}%`,
      }}
      data-still={still ? 'true' : undefined}
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width={size} height={size} focusable="false">
        {/* BODY — a single faceted crystalline plane, small (proportion: the
            head reads big against it). Internal glow via the molt fill. */}
        <g className="cygnet-body">
          <polygon
            points="18,40 12,32 20,28 30,30 34,38 26,42"
            fill="color-mix(in srgb, var(--frost-white, #e0ecf4) var(--molt-white, 40%), var(--rank-gunmetal, #6b7480))"
          />
          {/* facet highlight plane */}
          <polygon points="20,28 30,30 26,34 19,33" fill="color-mix(in srgb, var(--ice-wing, #60c0f0) 40%, transparent)" />
        </g>

        {/* HEAD group — oversized (cute proportion). Head-tilts on the idle. */}
        <g className="cygnet-head">
          {/* neck — a slim crystalline S-curve as two facets */}
          <polygon points="26,30 30,20 33,22 29,32" fill="color-mix(in srgb, var(--frost-white, #e0ecf4) var(--molt-white, 40%), var(--rank-gunmetal, #6b7480))" />
          {/* head — a rounded-off facet cluster, deliberately big */}
          <polygon points="30,20 33,12 39,12 42,18 38,23 32,23" fill="color-mix(in srgb, var(--frost-white, #e0ecf4) var(--molt-white, 40%), var(--rank-gunmetal, #6b7480))" />
          {/* head core glow */}
          <polygon points="33,15 38,14 39,19 34,20" fill="color-mix(in srgb, var(--ice-wing, #60c0f0) 45%, transparent)" />
          {/* beak — one small gold facet (the only warm accent) */}
          <polygon points="42,18 47,19 42,21" fill="var(--gilded-fern, #c6a84b)" />
          {/* eye — a single facet-glint (no mouth, no outline) */}
          <circle className="cygnet-eye" cx="36" cy="17" r="1.4" fill="var(--frost-white, #e0ecf4)" />
        </g>
      </svg>
    </CygnetWrap>
  );
};

export default CrystalCygnet;