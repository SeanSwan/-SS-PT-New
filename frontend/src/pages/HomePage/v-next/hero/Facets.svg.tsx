/**
 * Home V-next — Facets (the vector crystal that "resolves"). Kimi (c): SVG facets carry 4K crispness for
 * free (canvas blurs, vectors don't); this is BOTH the LCP element and the reduced-motion static frame.
 * Each facet animates transform/opacity ONLY between `scattered` (light in entropy — displaced + rotated)
 * and `aligned` (the Crystalline lattice) via framer variants (no inline style). Fills come from the
 * home-facet + home-ice tokens (lens-derived), so the crystal re-skins with the world. aria-hidden — decorative.
 */
import { motion, type Variants } from 'framer-motion';

interface Facet {
  points: string;
  sx: number; // scatter x/y/rotate (the entropy state)
  sy: number;
  srot: number;
  fill: string;
  i: number;
}

// Aligned geometry: 7 facets composing a faceted prism around the optical center (viewBox 0 0 100 100).
const FACETS: Facet[] = [
  { points: '50,8 68,26 50,40 40,24', sx: -14, sy: -22, srot: -24, fill: 'url(#home-facet-a)', i: 0 },
  { points: '68,26 84,44 66,52 50,40', sx: 26, sy: -14, srot: 18, fill: 'url(#home-facet-b)', i: 1 },
  { points: '66,52 78,72 56,74 50,56', sx: 22, sy: 24, srot: 28, fill: 'url(#home-facet-a)', i: 2 },
  { points: '50,56 56,74 40,80 34,60', sx: -6, sy: 30, srot: -16, fill: 'url(#home-facet-b)', i: 3 },
  { points: '34,60 40,80 20,70 26,50', sx: -28, sy: 18, srot: -30, fill: 'url(#home-facet-a)', i: 4 },
  { points: '26,50 34,60 22,44 32,32', sx: -30, sy: -10, srot: 22, fill: 'url(#home-facet-b)', i: 5 },
  { points: '32,32 40,24 50,40 40,44', sx: -10, sy: -26, srot: 14, fill: 'url(#home-facet-a)', i: 6 },
];

const facetVariants: Variants = {
  scattered: (f: Facet) => ({
    opacity: 0.14,
    x: f.sx,
    y: f.sy,
    rotate: f.srot,
    scale: 0.86,
    transition: { duration: 0.01 },
  }),
  aligned: (f: Facet) => ({
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { delay: 0.1 + f.i * 0.05, duration: 0.62, ease: [0.16, 1, 0.3, 1] }, // --home-ease-crystallize
  }),
};

export function Facets({ state, animateIn }: { state: 'scattered' | 'aligned'; animateIn: boolean }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="home-facet-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--home-facet-hi)" />
          <stop offset="100%" stopColor="var(--home-facet-lo)" />
        </linearGradient>
        <linearGradient id="home-facet-b" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--home-ice)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--home-facet-lo)" />
        </linearGradient>
      </defs>
      {FACETS.map((f) => (
        <motion.polygon
          key={f.points}
          points={f.points}
          fill={f.fill}
          stroke="var(--home-ice-14)"
          strokeWidth={0.4}
          custom={f}
          variants={facetVariants}
          // animateIn=false (reduced-motion / essential tier) → render directly at the aligned state with
          // NO framer entrance (the CSS reduced-motion guard can't stop framer's JS-driven animation).
          initial={animateIn ? 'scattered' : false}
          animate={state}
        />
      ))}
    </svg>
  );
}
