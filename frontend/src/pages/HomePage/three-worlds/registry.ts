/**
 * registry — the 20-variant Three.js front-page fleet manifest.
 * @module pages/HomePage/three-worlds/registry
 *
 * THIS FILE IS THE FLEET'S SINGLE SOURCE OF TRUTH. The gallery, the console, the
 * tests and the tournament canvases all read it; none of them keeps its own list.
 *
 * PARKED BY CONTRACT. Every entry is `status: 'parked'` and `sourceRoute: '/'`
 * records which route the variant is a candidate for — but `sourceRoute` is a
 * LABEL, not a mount. Nothing here is reachable from the canonical route tree;
 * `playgroundRegistry.ts` is the only importer, and promoting a variant means
 * moving an import into a real route in a separately reviewed commit
 * (frontend/src/pages/DesignPlayground/README.md).
 *
 * `tradeoff` is REQUIRED and non-empty on every row. The atelier doctrine is blunt
 * about why: a judgment set where only the favourite gets a case made for it is a
 * rigged vote. Each row states what it gives up.
 *
 * `mobbinRefs` is empty and carries the marker, because the Mobbin MCP connector
 * is registered on this machine (`~/.codex/config.toml`) but is NOT callable from
 * the runtime that authored these variants. Per design-brain/external-reference-mcp.md
 * an unavailable reference lane must be disclosed, not silently skipped.
 */
import { SKELETONS, type SkeletonContract } from './skeletons';

export type FleetStatus = 'parked' | 'iterating' | 'approved' | 'promoted';

export interface ThreeWorldEntry {
  id: string;
  title: string;
  /** File name inside `three-worlds/<id>/`. */
  componentFile: string;
  skeleton: SkeletonContract;
  /** What this variant gives up. Required on every row. */
  tradeoff: string;
  status: FleetStatus;
  /** The route this variant is a CANDIDATE for. A label, never a mount. */
  sourceRoute: string;
  mobbinRefs: string[];
  notes: string;
}

/** Reference-lane disclosure required when Mobbin tools are not callable. */
export const REFERENCE_DISCLOSURE = '[MOBBIN UNAVAILABLE]';

const byId = new Map(SKELETONS.map((s) => [s.id, s]));
function sk(id: string): SkeletonContract {
  const s = byId.get(id);
  if (!s) throw new Error(`registry references an unknown skeleton: ${id}`);
  return s;
}

/** Titles are descriptive, not decorative — they say what the structure does. */
const TITLES: Record<string, string> = {
  v01: 'Ledger — full-bleed scrub',
  v02: 'Measured — assessment timeline',
  v03: 'Descent — depth tunnel bento',
  v04: 'Focused — single-measure orbit',
  v05: 'Guardrail — three-rail field',
  v06: 'Evidence — golf draw grid',
  v07: 'Remote — rail and well',
  v08: 'Meter — waveform table',
  v09: 'Instrument — dashboard sheet',
  v10: 'Shelf — assembled programs',
  v11: 'Hub — dolly editorial',
  v12: 'Immersion — no-nav bands',
  v13: 'Index — magazine morph',
  v14: 'Spotlight — fractured grid',
  v15: 'Console — kanban light sweep',
  v16: 'Reel — horizontal swarm',
  v17: 'Works — asymmetric assembly',
  v18: 'Broadside — terrain editorial (wildcard)',
  v19: 'Gather — orbit shells',
  v20: 'Commons — pointer parallax cards',
};

const TRADEOFFS: Record<string, string> = {
  v01: 'Full-bleed costs reading comfort: long lines need generous leading, and the six-column grid gets busy on narrow laptops.',
  v02: 'A timeline spine forces sequence onto content that is not inherently ordered, so returning visitors scroll further to reach pricing.',
  v03: 'The depth tunnel needs real GPU headroom; on the essential tier this collapses to a static poster and loses its whole argument.',
  v04: 'The 68ch measure is the most readable variant and the least scannable — proving scale requires scrolling past a lot of prose.',
  v05: 'Three rails push the primary CTA off the centre axis, which measurably weakens first-click attention on wide screens.',
  v06: 'Grid ignition needs pointer movement to read as intentional; on touch devices it fires late and looks like a plain grid.',
  v07: 'The rail-and-well keeps navigation permanently visible, spending horizontal space that the content column then cannot use.',
  v08: 'A waveform hero reads as data, so it undersells the human side of coaching even though it suits the logging story.',
  v09: 'Removing the hero entirely is the boldest cut and the riskiest: there is no emotional entry point before the first number.',
  v10: 'The travelling-band shelf reads as a carousel, so it implies motion the user cannot stop or scrub directly.',
  v11: 'A fixed radial hub confuses keyboard order, because the navigation no longer precedes the content in DOM sequence.',
  v12: 'No navigation at all is a genuine usability cost — every section must be reachable by scroll alone, which fails long content.',
  v13: 'The magazine index reads as editorial and therefore less like a product page, which can slow conversion-minded visitors.',
  v14: 'Asymmetry is deliberately unbalanced, so any future added section must be re-composed rather than dropped into a row.',
  v15: 'Kanban columns imply drag-and-drop affordance that the page does not have, which can read as an unfinished interaction.',
  v16: 'Horizontal scroll fights the platform convention for vertical reading and is the most likely variant to feel wrong on desktop.',
  v17: 'Unequal card heights make the page taller than its peers, so the closing CTA sits further down than in any other variant.',
  v18: 'The wildcard speaks in an alien register by design; it is a divergence probe, not a serious promotion candidate as-is.',
  v19: 'An orbit ring layout wastes the corners of every viewport and degrades badly below 900px where it must stack anyway.',
  v20: 'Pointer parallax does nothing for keyboard or touch users, so its signature effect is invisible to a real share of visitors.',
};

/** The fleet. Order is intentional: v18 is the wildcard and sits near the end. */
export const THREE_WORLDS: ThreeWorldEntry[] = SKELETONS.map((skeleton) => ({
  id: skeleton.id,
  title: TITLES[skeleton.id] ?? skeleton.id,
  componentFile: `${skeleton.id}.tsx`,
  skeleton,
  tradeoff: TRADEOFFS[skeleton.id] ?? '',
  status: 'parked' as FleetStatus,
  sourceRoute: '/',
  mobbinRefs: [REFERENCE_DISCLOSURE],
  notes: skeleton.wildcard
    ? `Wildcard seed: ${skeleton.wildcard}. Levers exist but defaults stay alien.`
    : `${skeleton.nav_model} nav · ${skeleton.hero_mechanics} hero · ${skeleton.grid} grid · ${skeleton.chapters} chapters.`,
}));

/** Lookup by id. Throws rather than returning undefined, so galleries fail loudly. */
export function worldById(id: string): ThreeWorldEntry {
  const found = THREE_WORLDS.find((w) => w.id === id);
  if (!found) throw new Error(`unknown variant id: ${id}`);
  return found;
}

/** The tournament split required by the atelier judgement rule (max 5 per canvas). */
export function tournamentRounds(perRound = 5): ThreeWorldEntry[][] {
  const rounds: ThreeWorldEntry[][] = [];
  for (let i = 0; i < THREE_WORLDS.length; i += perRound) {
    rounds.push(THREE_WORLDS.slice(i, i + perRound));
  }
  return rounds;
}

/** Fleet-level counts the console prints. Generated at read time, never transcribed. */
export function fleetSummary(): {
  total: number; parked: number; wildcards: number; families: string[];
  navModels: string[]; grids: string[];
} {
  return {
    total: THREE_WORLDS.length,
    parked: THREE_WORLDS.filter((w) => w.status === 'parked').length,
    wildcards: THREE_WORLDS.filter((w) => Boolean(w.skeleton.wildcard)).length,
    families: [...new Set(THREE_WORLDS.map((w) => w.skeleton.hero_mechanics))],
    navModels: [...new Set(THREE_WORLDS.map((w) => w.skeleton.nav_model))],
    grids: [...new Set(THREE_WORLDS.map((w) => w.skeleton.grid))],
  };
}
