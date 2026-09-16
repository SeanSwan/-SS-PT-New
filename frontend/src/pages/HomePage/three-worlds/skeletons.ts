/**
 * skeletons — the 20 structural divergence contracts for the Three.js front-page fleet.
 * @module pages/HomePage/three-worlds/skeletons
 *
 * WHY THIS FILE IS DATA AND NOT CODE
 * The atelier doctrine (.claude/skills/swan-atelier-studio/SKILL.md, A2) defines a
 * variant by its SKELETON, not its styling: `{id, nav_model, hero_mechanics, grid,
 * anti_specs[], wildcard}`. Divergence must therefore be constrainable, reviewable,
 * and machine-checkable BEFORE anything renders — otherwise "20 different designs"
 * collapses into 20 recolours of one layout.
 *
 * THE FINGERPRINT is the tuple `nav_model | hero_mechanics | grid`. All 20 are
 * pairwise unique by construction, and `fleet-contract.test.mjs` / the vitest suite
 * asserts it. A collision is a HARD GATE (halt, report, build nothing on top) per
 * the atelier fingerprint rule.
 *
 * RULE HONOURED: motion is deliberately NOT a seed axis. The atelier skill excludes
 * motion from v1 seeds because a static artboard judges a motion seed with the motion
 * removed, which biases the judge against it. Motion enters only on the winner.
 *
 * `anti_specs` are negatives aimed at the modal layout ("no top nav bar"), because
 * negatives break prior layouts more reliably than positives request new ones.
 * Exactly one variant carries a `wildcard` seeded from an alien archetype.
 */

/** Navigation is structural: where the page's wayfinding physically lives. */
export type NavModel =
  | 'no-nav' | 'radial-hub' | 'progress-spine' | 'floating-pill' | 'side-rail'
  | 'chapter-dots' | 'split-rail' | 'command-palette' | 'edge-tabs' | 'command-strip'
  | 'vertical-index' | 'horizon-bar' | 'gutter-index' | 'orbital' | 'sticky-minimal'
  | 'stepper-left' | 'corner-anchor' | 'split-header' | 'overlay-drawer' | 'ticker-nav';

/** Hero mechanics = the interaction model. Motion is not encoded here. */
export type HeroMechanics =
  | 'scroll-scrub' | 'pointer-parallax' | 'depth-tunnel' | 'assemble' | 'object-orbit'
  | 'field-reveal' | 'measured-reveal' | 'assembling-parts' | 'layered-shells' | 'grid-ignition'
  | 'line-draw' | 'instanced-swarm' | 'camera-dolly' | 'shell-morph' | 'instanced-field'
  | 'light-sweep' | 'fracture' | 'waveform' | 'terrain-fly' | 'shell-lens';

/** Grid = how content is placed. The third fingerprint axis. */
export type GridModel =
  | 'full-bleed' | 'timeline-spine' | 'bento' | 'three-rail' | 'single-measure'
  | 'evidence-grid' | 'rail-well' | 'admin-table' | 'dashboard-sheet' | 'product-shelf'
  | 'editorial-offset' | 'stacked-bands' | 'magazine-index' | 'spotlight-grid' | 'kanban-columns'
  | 'asymmetric-bento' | 'horizontal-scroll' | 'editorial-spread' | 'orbit-ring' | 'editorial-cards';

export interface SkeletonContract {
  id: string;
  /** Where the wayfinding lives. */
  nav_model: NavModel;
  /** The hero's interaction model. */
  hero_mechanics: HeroMechanics;
  /** Content placement model. */
  grid: GridModel;
  /** How many scroll chapters the page is divided into. */
  chapters: number;
  /** Negatives aimed at the modal layout. Minimum 2, enforced by test. */
  anti_specs: string[];
  /** Set on exactly one variant: an alien archetype seed. */
  wildcard?: string;
}

/**
 * The 20 skeletons. Ordered v01..v20. Each row is a distinct structural bet;
 * the `nav_model | hero_mechanics | grid` tuple is unique across the set.
 */
export const SKELETONS: SkeletonContract[] = [
  {
    id: 'v01', nav_model: 'vertical-index', hero_mechanics: 'scroll-scrub', grid: 'full-bleed', chapters: 6,
    anti_specs: ['no centered hero text block', 'no cookie-cutter card grid', 'no decorative gradient only'],
  },
  {
    id: 'v02', nav_model: 'stepper-left', hero_mechanics: 'measured-reveal', grid: 'timeline-spine', chapters: 5,
    anti_specs: ['no full-bleed background image', 'no floating pill nav'],
  },
  {
    id: 'v03', nav_model: 'overlay-drawer', hero_mechanics: 'depth-tunnel', grid: 'bento', chapters: 4,
    anti_specs: ['no persistent top bar', 'no hero as a single static still'],
  },
  {
    id: 'v04', nav_model: 'side-rail', hero_mechanics: 'object-orbit', grid: 'single-measure', chapters: 4,
    anti_specs: ['no decorative card shadows', 'no grid of equal tiles'],
  },
  {
    id: 'v05', nav_model: 'split-header', hero_mechanics: 'field-reveal', grid: 'three-rail', chapters: 5,
    anti_specs: ['no body copy wider than 70 characters', 'no carousel controls'],
  },
  {
    id: 'v06', nav_model: 'corner-anchor', hero_mechanics: 'line-draw', grid: 'evidence-grid', chapters: 4,
    anti_specs: ['no hero video background', 'no rounded-corner pill buttons'],
  },
  {
    id: 'v07', nav_model: 'progress-spine', hero_mechanics: 'instanced-field', grid: 'rail-well', chapters: 4,
    anti_specs: ['no marketing superlatives in headings', 'no stacked full-width bands'],
  },
  {
    id: 'v08', nav_model: 'ticker-nav', hero_mechanics: 'waveform', grid: 'admin-table', chapters: 7,
    anti_specs: ['no hero above the fold taller than 60vh', 'no decorative illustration'],
  },
  {
    id: 'v09', nav_model: 'sticky-minimal', hero_mechanics: 'grid-ignition', grid: 'dashboard-sheet', chapters: 4,
    anti_specs: ['no hero at all', 'no centered column wider than 900px'],
  },
  {
    id: 'v10', nav_model: 'gutter-index', hero_mechanics: 'assemble', grid: 'product-shelf', chapters: 5,
    anti_specs: ['no full-screen hero image', 'no autoplaying media without a pause control'],
  },
  {
    id: 'v11', nav_model: 'radial-hub', hero_mechanics: 'camera-dolly', grid: 'editorial-offset', chapters: 4,
    anti_specs: ['no sticky footer bar', 'no 50/50 split hero'],
  },
  {
    id: 'v12', nav_model: 'no-nav', hero_mechanics: 'layered-shells', grid: 'stacked-bands', chapters: 7,
    anti_specs: ['no navigation chrome of any kind', 'no header logo lockup'],
  },
  {
    id: 'v13', nav_model: 'vertical-index', hero_mechanics: 'shell-morph', grid: 'magazine-index', chapters: 4,
    anti_specs: ['no hero that requires reading to understand', 'no nested card-in-card'],
  },
  {
    id: 'v14', nav_model: 'edge-tabs', hero_mechanics: 'fracture', grid: 'spotlight-grid', chapters: 5,
    anti_specs: ['no symmetrical layout', 'no decorative dividers between every section'],
  },
  {
    id: 'v15', nav_model: 'command-palette', hero_mechanics: 'light-sweep', grid: 'kanban-columns', chapters: 4,
    anti_specs: ['no hero text over a busy photograph', 'no hover-only navigation'],
  },
  {
    id: 'v16', nav_model: 'floating-pill', hero_mechanics: 'instanced-swarm', grid: 'horizontal-scroll', chapters: 5,
    anti_specs: ['no centered layout anywhere', 'no full-page vertical scroll'],
  },
  {
    id: 'v17', nav_model: 'sticky-minimal', hero_mechanics: 'assembling-parts', grid: 'asymmetric-bento', chapters: 6,
    anti_specs: ['no equal-height card row', 'no hero shorter than 70vh'],
  },
  {
    id: 'v18', nav_model: 'command-strip', hero_mechanics: 'terrain-fly', grid: 'editorial-spread', chapters: 5,
    anti_specs: ['no stock photography', 'no soft gradients', 'no rounded corners on section frames'],
    wildcard: 'construction-trades-site-as-editorial-magazine',
  },
  {
    id: 'v19', nav_model: 'chapter-dots', hero_mechanics: 'shell-lens', grid: 'orbit-ring', chapters: 5,
    anti_specs: ['no stacked single-column layout', 'no carousel of testimonial cards'],
  },
  {
    id: 'v20', nav_model: 'horizon-bar', hero_mechanics: 'pointer-parallax', grid: 'editorial-cards', chapters: 4,
    anti_specs: ['no hero without a visible primary action', 'no text smaller than 16px'],
  },
];

/** Convenience: the fingerprint tuple, used by the divergence gate. */
export function fingerprintOf(s: SkeletonContract): string {
  return `${s.nav_model}|${s.hero_mechanics}|${s.grid}`;
}

/** True when any two skeletons share a fingerprint (a hard-gate condition). */
export function findCollisions(rows: SkeletonContract[] = SKELETONS): string[] {
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const s of rows) {
    const k = fingerprintOf(s);
    const prev = seen.get(k);
    if (prev) out.push(`${prev} == ${s.id} (${k})`);
    seen.set(k, s.id);
  }
  return out;
}
