/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: CrystallineBody (CC-1b — the signature moment)   ║
 * ║  PURPOSE: The client's body as faceted crystal that brightens ║
 * ║           as it recovers — real readiness data drives every   ║
 * ║           region's luminance, texture, and shimmer.           ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Kimi verdict (concept A over B/C — gem tiles and orbital ring killed on record):
 *  - State is encoded by fill LUMINANCE + facet HATCH texture + (the list's) text —
 *    never color alone. READY glows crystalline, CAUTION mid-luminance, LOADING dim + hatch.
 *  - One slow prismatic caustic sweep (transform/opacity only, ~0.2 opacity), fully
 *    frozen under prefers-reduced-motion. No loops of noise — a breath, not a strobe.
 *  - Decorative: aria-hidden; the readiness LIST below carries the accessible truth.
 *  - Region geometry reuses the REAL BodyMap front-view catalog (zero new asset debt);
 *    a region shows the WORST readiness of the muscle groups it contains (honest floor).
 */
import React from 'react';
import styled, { css, keyframes } from 'styled-components';
import { FRONT_VIEW_REGIONS, type MuscleGroup } from '../../../BodyMap/bodyRegions';
import type { ReadinessGroup, ReadinessState } from './useMuscleReadiness';

/** BodyMap region category → readiness groups it contains (worst-of decides the facet). */
const REGION_TO_READINESS: Record<MuscleGroup, string[]> = {
  neck: ['neck'],
  shoulder: ['shoulders'],
  chest: ['chest'],
  arm: ['biceps', 'triceps', 'forearms'],
  core: ['core'],
  hip: ['glutes'],
  leg: ['quads', 'hamstrings', 'calves'],
  back_muscles: ['back'],
  foot: ['calves'],
};

const sweep = keyframes`
  from { transform: translateX(-60px); }
  to { transform: translateX(260px); }
`;

const Wrap = styled.div`
  display: none;
  @media (min-width: 480px) {
    display: flex;
    justify-content: center;
    padding: 6px 0 2px;
  }
`;

const Svg = styled.svg`
  width: 132px;
  height: auto;
  overflow: visible;
  .sheen { animation: ${css`${sweep}`} 7s ease-in-out infinite; opacity: 0.18; }
  @media (prefers-reduced-motion: reduce) { .sheen { animation: none; opacity: 0; } }
`;

const STATE_OPACITY: Record<ReadinessState, number> = { ready: 0.95, caution: 0.55, loading: 0.28 };

function stateForRegion(group: MuscleGroup, byGroup: Map<string, ReadinessGroup>): ReadinessState {
  const names = REGION_TO_READINESS[group] || [];
  let worst: ReadinessGroup | null = null;
  for (const name of names) {
    const g = byGroup.get(name);
    if (g && (!worst || g.pct < worst.pct)) worst = g;
  }
  return worst?.state ?? 'ready'; // untrained = fully recovered (matches the board contract)
}

const CrystallineBody: React.FC<{ groups: ReadinessGroup[] }> = ({ groups }) => {
  const byGroup = new Map(groups.map((g) => [g.group, g]));
  return (
    <Wrap>
      <Svg viewBox="0 0 200 420" data-testid="crystalline-body" aria-hidden="true" role="presentation">
        <defs>
          <linearGradient id="crystalFacet" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary, #60C0F0)" />
            <stop offset="55%" stopColor="var(--accent-glow, #8B5CF6)" />
            <stop offset="100%" stopColor="var(--tertiary, #4070C0)" />
          </linearGradient>
          {/* facet-density hatch marks LOADING so state never rides on color alone */}
          <pattern id="crystalHatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="5" height="5" fill="transparent" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="var(--text-primary, #E0ECF4)" strokeWidth="1" strokeOpacity="0.28" />
          </pattern>
          <clipPath id="crystalClip"><rect x="0" y="0" width="200" height="420" /></clipPath>
        </defs>

        {/* silhouette spine — quiet armature so sparse regions still read as one body */}
        <line x1="100" y1="46" x2="100" y2="330" stroke="var(--handoff-card-border, rgba(96,192,240,0.14))" strokeWidth="1" />

        {groups.length >= 0 && FRONT_VIEW_REGIONS.map((region) => {
          const state = stateForRegion(region.muscleGroup, byGroup);
          const { cx, cy, rx, ry } = region.svgCoords;
          return (
            <g key={region.id} data-readiness={state}>
              {/* faceted gem: a diamond polygon reads crystal, not clinic */}
              <polygon
                points={`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`}
                fill="url(#crystalFacet)"
                fillOpacity={STATE_OPACITY[state]}
                stroke="var(--accent-primary, #60C0F0)"
                strokeOpacity={state === 'ready' ? 0.7 : 0.25}
                strokeWidth="0.8"
              />
              {state === 'loading' && (
                <polygon
                  points={`${cx},${cy - ry} ${cx + rx},${cy} ${cx},${cy + ry} ${cx - rx},${cy}`}
                  fill="url(#crystalHatch)"
                />
              )}
            </g>
          );
        })}

        {/* one slow prismatic caustic — a light breath across the facets */}
        <g clipPath="url(#crystalClip)">
          <rect className="sheen" x="-40" y="0" width="34" height="420"
            fill="var(--text-primary, #E0ECF4)" transform="skewX(-18)" />
        </g>
      </Svg>
    </Wrap>
  );
};

export default CrystallineBody;
