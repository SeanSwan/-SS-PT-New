/**
 * FILE: CrystalSwanCrest.tsx
 * PURPOSE: The earned Swan crest that enters the ring at the higher tiers (Kimi C). Four
 *   stages, gated by level: watermark (L650) → dark-glass occluder (L700) → gold emblem that
 *   interrupts the arc at 12 o'clock (L800) → coronation with mirrored wings (L1000). The
 *   swan NEVER spins; the ring revolves around it — that hierarchy is the brand.
 * CONSTRAINTS: SVG-only; transform/opacity; the only moving parts are opacity breath +
 *   (coronation) a slow scale on the master clock; gradient fills, no filters on the moving
 *   group. All within the FX budget (crest sits at the ring center, well inside R_MAX).
 * A11Y: aria-hidden (decorative); the accessible level/label live in the parent center.
 */

import React from 'react';
import { CENTER } from './crystalRing.geometry';
import type { SwanStage } from './crystalRing.tiers';

// Stylized swan silhouette (S-neck + body), authored in a 200x200 box (from About SwanMark).
const SWAN =
  'M52,158 C36,156 28,138 38,123 C47,110 74,113 92,120 C68,101 70,66 96,52 ' +
  'C114,42 128,50 124,63 C121,73 110,70 108,78 C124,92 138,120 126,146 ' +
  'C117,163 74,161 52,158 Z';

interface Props {
  stage: SwanStage;
  uid: string;
  /** Diameter of the crest box, in 400-space units. Large enough that the swan reads
   *  OUTSIDE the center scrim (radius ~112) — a hidden-behind-the-scrim crest is not earned. */
  span?: number;
}

/**
 * Places the 200x200 swan art centered on the ring, scaled to `span`. The crest's own
 * transform-group is positioned; the swan path is drawn in local 0..200 coords.
 */
const CrystalSwanCrest: React.FC<Props> = ({ stage, uid, span = 240 }) => {
  if (stage === 'none') return null;

  const s = span / 200; // scale from the 200-box to `span`
  const originX = CENTER - span / 2;
  const originY = CENTER - span / 2;
  const bodyId = `${uid}-swanbody`;
  const rimId = `${uid}-swanrim`;

  // Per-stage treatment.
  const watermark = stage === 'watermark';
  const occluder = stage === 'occluder';
  const emblem = stage === 'emblem' || stage === 'coronation';
  const coronation = stage === 'coronation';

  return (
    <g
      className={`ring-crest ring-crest--${stage}`}
      transform={`translate(${originX} ${originY}) scale(${s})`}
      aria-hidden="true"
    >
      <defs>
        {/* Gold emblem fill — two static stops, lit from the top. */}
        <linearGradient id={bodyId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--frost-white, #e0ecf4)" stopOpacity="0.9" />
          <stop offset="42%" stopColor="var(--gilded-fern, #c6a84b)" />
          <stop offset="100%" stopColor="var(--gilded-fern, #c6a84b)" stopOpacity="0.7" />
        </linearGradient>
        {/* Occluder body — dark glass. */}
        <radialGradient id={rimId} cx="46%" cy="42%" r="70%">
          <stop offset="0%" stopColor="var(--surface-graphite, #1a1a24)" />
          <stop offset="100%" stopColor="var(--obsidian-black, #0a0a0f)" />
        </radialGradient>
      </defs>

      {/* Coronation: mirrored wing behind, flanking the crest. */}
      {coronation && (
        <path
          className="ring-crest-wing"
          d={SWAN}
          transform="translate(200 0) scale(-1 1)"
          fill="var(--gilded-fern, #c6a84b)" opacity="0.28"
        />
      )}

      {watermark && (
        <path d={SWAN} fill="var(--frost-white, #e0ecf4)" opacity="0.05" />
      )}

      {occluder && (
        <>
          <path d={SWAN} fill={`url(#${rimId})`} opacity="0.62" />
          <path d={SWAN} fill="none" stroke="var(--ice-wing, #60c0f0)" strokeWidth="1.6" opacity="0.32" />
        </>
      )}

      {emblem && (
        <path d={SWAN} fill={`url(#${bodyId})`} opacity="0.92" />
      )}
    </g>
  );
};

export default CrystalSwanCrest;
