/*
 * constellation-layout.ts — T-T1 / R10. The PURE layout maths for CD3's
 * constellation. No three.js, no DOM, no time, no randomness.
 *
 * ── WHY THIS IS A SEPARATE MODULE FROM THE RENDERER ─────────────────────────
 *
 * T-T1 requires: "`layoutBrains(brains)` pure: same input → same positions/sizes/
 * colors; size ∝ videos, arc ∝ coverage, color per state map".
 *
 * A pure function is only testable if nothing impure is reachable from it, and a
 * module that also imports `three` cannot be unit-tested without a WebGL context.
 * So the maths lives here, the renderer consumes it, and the tests import THIS
 * file. That split is also what makes T-E3 measurable: the layout can be computed
 * for 40 nodes without a GPU.
 *
 * ── DETERMINISM IS A REQUIREMENT, NOT A NICETY ──────────────────────────────
 *
 * "Same input → same positions" fails the moment `Math.random()` decides an
 * angle. Every position below is a deterministic function of the node's INDEX in
 * a stably-sorted array, so two renders of the same roster are identical and a
 * screenshot difference means a real change. The sort is by (enabled, videos,
 * channelId) — `channelId` last so the order is total and cannot depend on how
 * the engine happened to serialise the map.
 *
 * ── THE ENCODINGS, FROM `03-wireframes.md` ──────────────────────────────────
 *
 *   node size  = videos      (how much material this brain holds)
 *   arc        = coverage    (fetched / total, 0..1)
 *   colour     = state map   ON=ice · off=lavender · throttle=gold · stale=danger
 *
 * Colour NEVER carries a signal alone (`03 §Keyboard/a11y`): every node also has a
 * text state in its label and the roster is the always-present equal.
 */

import type { CreatorRow, StatusInstrument } from '../adapters';

/** design.md §4 semantic picks, as literals. Duplicated from `tokens.css` on
 *  purpose: this module is pure and must not read the DOM, and a test asserting
 *  "color per state map" needs the values it can compare against. */
export const STATE_COLOR = {
  on: '#60C0F0', // ice-wing
  off: '#4070C0', // swan-lavender
  throttle: '#C6A84B', // gilded-fern
  stale: '#E5484D', // danger — the one off-palette semantic
} as const;

export type NodeState = keyof typeof STATE_COLOR;

export interface BrainNode {
  channelId: string;
  title: string;
  /** 0..1 of the widest node's video count — the sphere radius input. */
  size: number;
  /** fetched / videos, 0..1. `null` when either count could not be taken. */
  coverage: number | null;
  /** arc end angle in radians, derived from `coverage`. */
  arc: number;
  state: NodeState;
  /** Deterministic unit-sphere position. */
  position: { x: number; y: number; z: number };
  enabled: boolean;
  videos: number | null;
  fetched: number | null;
}

export interface LayoutOptions {
  /** Radius of the constellation sphere in world units. */
  radius?: number;
  /** Node radius at size 1 and at size 0, in world units. */
  maxNodeRadius?: number;
  minNodeRadius?: number;
}

const DEFAULTS: Required<LayoutOptions> = {
  radius: 100,
  maxNodeRadius: 9,
  minNodeRadius: 3.5,
};

/**
 * Which state a creator is in.
 *
 * ORDER MATTERS AND IS THE SPEC. `03-wireframes.md` lists the colour map as
 * "ON=ice · off=lavender · throttle=gold · stale=danger". Throttle outranks
 * enabled because a throttled creator is not doing useful work whatever its
 * toggle says; staleness outranks everything because it is the one state that
 * needs a human. A cascade is used rather than a lookup table because the inputs
 * overlap and the precedence has to be readable in one place.
 */
export function nodeState(row: CreatorRow, status: StatusInstrument | null): NodeState {
  if (status) {
    const lastGood = status.lastGood;
    // "stale" is the engine's own word for this, and it is per-store rather than
    // per-creator. A creator in a stale store is drawn danger so the constellation
    // agrees with the status board instead of contradicting it.
    if (lastGood && lastGood.staleDays > 3) return 'stale';
    if (status.throttle && status.throttle.active) return 'throttle';
  }
  return row.enabled ? 'on' : 'off';
}

/**
 * Golden-angle spiral placement on a unit sphere.
 *
 * WHY THIS AND NOT RANDOM OR RINGS. A golden-angle spiral distributes N points
 * near-uniformly for ANY N, with no clustering and no tuning — so a store with 3
 * creators and a store with 300 both look deliberate. It is also closed-form:
 * point i depends only on i and N, which is what makes "same input → same
 * positions" true by construction rather than by seeding a PRNG well.
 *
 * The radius is damped by the node's own size so large nodes are not piled at the
 * outer shell, which reads as a sphere rather than a bubble.
 */
function spherePoint(i: number, n: number, size: number, radius: number) {
  if (n <= 1) return { x: 0, y: 0, z: 0 };
  const golden = Math.PI * (3 - Math.sqrt(5)); // ≈2.39996 rad
  const y = 1 - (i / (n - 1)) * 2; // 1 .. -1
  const ring = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  // Damp so bigger brains sit slightly toward the middle of the cloud.
  const r = radius * (0.78 + 0.22 * (1 - size));
  return { x: Math.cos(theta) * ring * r, y: y * r, z: Math.sin(theta) * ring * r };
}

/**
 * Lay out the roster as constellation nodes. Pure and total.
 *
 * TOTAL means it never throws: a damaged store gives `videos: null` (S1-H9, "must
 * be rendered as absent, never as 0"), and a null count must not become a zero
 * size silently — it becomes the MINIMUM size, so the node is visibly small
 * rather than invisibly wrong.
 */
export function layoutBrains(
  rows: CreatorRow[],
  status: StatusInstrument | null = null,
  opts: LayoutOptions = {},
): BrainNode[] {
  const { radius } = { ...DEFAULTS, ...opts };

  // STABLE TOTAL ORDER. `enabled` first so the eye finds working brains first;
  // then by volume; then by channelId to break ties deterministically.
  // D10 (Astra 140126): only FINITE, NON-NEGATIVE counts are counts — an
  // Infinity/NaN row sorts as "unavailable" instead of poisoning every
  // comparison downstream.
  const sorted = [...(rows || [])].sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    const av = typeof a.videos === 'number' && Number.isFinite(a.videos) ? a.videos : -1;
    const bv = typeof b.videos === 'number' && Number.isFinite(b.videos) ? b.videos : -1;
    if (av !== bv) return bv - av;
    return String(a.channelId).localeCompare(String(b.channelId));
  });

  const counts = sorted.map((r) => (
    typeof r.videos === 'number' && Number.isFinite(r.videos) && r.videos >= 0 ? r.videos : 0
  ));
  const widest = counts.length ? Math.max(...counts) : 0;

  return sorted.map((row, i) => {
    // A null count is a MISSING MEASUREMENT, not a zero. It maps to size 0 so the
    // node renders at the floor — the same honesty rule the roster applies.
    // D10: non-finite and negative take the same floor — Infinity/Infinity was
    // NaN, and NaN flowed through spherePoint into the scene extent (D5's fit).
    const size = widest > 0 && typeof row.videos === 'number'
      && Number.isFinite(row.videos) && row.videos >= 0
      ? Math.min(1, row.videos / widest) : 0;
    const coverage = ratio(row.fetched, row.videos);
    return {
      channelId: row.channelId,
      title: row.title,
      size,
      coverage,
      arc: (coverage === null ? 0 : coverage) * Math.PI * 2,
      state: nodeState(row, status),
      position: spherePoint(i, sorted.length, size, radius),
      enabled: row.enabled,
      videos: row.videos,
      fetched: row.fetched,
    };
  });
}

/**
 * `fetched / videos`, or `null` when either is unusable.
 *
 * Returns null rather than 0 for a damaged row: a 0 arc and an unmeasurable arc
 * look identical on screen but mean opposite things, and the caller renders the
 * difference (the label says "counts unavailable").
 */
function ratio(fetched: unknown, total: unknown): number | null {
  if (typeof fetched !== 'number' || typeof total !== 'number') return null;
  if (!Number.isFinite(fetched) || !Number.isFinite(total) || total <= 0) return null;
  // D10: a NEGATIVE count is a damaged measurement, not a zero — clamping it
  // to 0% would draw an arc that reports "nothing fetched" for garbage.
  if (fetched < 0) return null;
  return Math.max(0, Math.min(1, fetched / total));
}

/** World-unit sphere radius for a node of this size. */
export function nodeRadius(size: number, opts: LayoutOptions = {}): number {
  const { maxNodeRadius, minNodeRadius } = { ...DEFAULTS, ...opts };
  const s = Number.isFinite(size) ? Math.max(0, Math.min(1, size)) : 0;
  return minNodeRadius + (maxNodeRadius - minNodeRadius) * s;
}

/** The accessibility label. Colour is never the only signal (`03 §a11y`). */
export function nodeLabel(n: BrainNode): string {
  const state = n.state === 'on' ? 'on' : n.state === 'off' ? 'off' : n.state;
  const counts = n.coverage === null
    ? 'counts unavailable'
    : `${n.fetched}/${n.videos} fetched (${Math.round(n.coverage * 100)}%)`;
  return `${n.title}, ${state}, ${counts}`;
}
