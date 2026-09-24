/**
 * T-E3 layout-path CPU cost — and the honest pointer to where T-E3's REAL
 * evidence lives.
 *
 * `06-test-plan.md` T-E3 says: "`performance.now()` frame samples ≤ 16.7ms
 * median with 40 nodes". The other T-E3 clauses (idle-after-first-poll,
 * never-fetch under reduced-motion / WebGL-absent, DPR clamp) are asserted in
 * `constellation-gates.test.tsx`.
 *
 * ── WHERE THE RENDERER FRAME IS ACTUALLY MEASURED ──────────────────────────
 *
 * NOT HERE. jsdom has no WebGL, and this file's earlier incarnation was cited
 * as T-E3 exit evidence while timing a local arithmetic loop — retracted, with
 * its history kept, at `19-s5-exit-evidence.md` §4 (and the reviews
 * `2026-09-22-141500` §7 / `2026-09-22-140126` D1). The renderer frame now has
 * a real measurement: `web/bench/frame-bench.mjs` drives the BUILT chunk in a
 * real browser (drawn-pixel guard, CPU + per-frame-synced medians, allocation
 * growth via `renderer.info`, camera dolly behaviour — each mutation-killed).
 *
 * ── WHAT THIS FILE HONESTLY COVERS ──────────────────────────────────────────
 *
 * The layout path's own CPU cost — `layoutBrains` runs on every status poll,
 * so a 400-node recompute that outgrows a frame would jank the deck without
 * the renderer ever being involved. Plus the scaling properties of the maths
 * (ordering, purity, response to load). All CPU, all local, all named as such:
 * a budget test that implied it measured the GPU would be lying about its own
 * scope — that lie is exactly what the retraction recorded.
 *
 * ── HOW THIS HARNESS WAS PROVEN ABLE TO FAIL ────────────────────────────────
 *
 * A budget test orders of magnitude under its ceiling passes for almost any
 * code, which makes it worthless as a guard. Two mutations were run against an
 * earlier version of this file and BOTH left the median unmoved — because the
 * injected work sat OUTSIDE the timed window. The fix is structural: the
 * responsiveness case below asserts the number RESPONDS to node count, which
 * an out-of-window injection cannot fake.
 */
import { describe, expect, it } from 'vitest';
import { layoutBrains, nodeRadius, type BrainNode } from './constellation-layout';

/**
 * Deterministic roster rows. Field names are the shipped `CreatorRow` contract
 * (`adapters/types.ts:90`), not invented — a fixture that fed the layout
 * function fields it never reads would measure nodes it did not build.
 *
 * `throttled`/`stale` are deliberately absent: they are not row fields, they
 * are derived per-node by `nodeState(row, status)`.
 */
function makeRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    channelId: `ch-${String(i).padStart(3, '0')}`,
    title: `Creator ${i}`,
    enabled: i % 4 !== 0,
    videos: i * 3,
    fetched: i % 13 === 0 ? null : i * 2,
  }));
}

function makeNodes(count: number): BrainNode[] {
  return layoutBrains(makeRows(count) as never, null);
}

/**
 * One frame of the work `constellation-three.ts` does per node: derive the
 * drift term, read the layout position, write the transform. Everything is
 * INSIDE the caller's timed window — that is the point of the helper.
 */
function oneFrame(nodes: BrainNode[], f: number, sink: { v: number }): void {
  for (const n of nodes) {
    const drift = Math.sin((f + n.arc) * 0.004) * 0.05;
    const { x, y, z } = n.position;
    sink.v += x + y + z + drift + n.arc + n.size + nodeRadius(n.size);
  }
}

function measureMedian(nodes: BrainNode[], frames: number): number {
  const sink = { v: 0 };
  // Warm up: an unwarmed first frame measures the JIT, not the code.
  for (let i = 0; i < 20; i++) oneFrame(nodes, i, sink);

  const samples: number[] = [];
  for (let f = 0; f < frames; f++) {
    const t0 = performance.now();
    oneFrame(nodes, f, sink);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  // Consume the sink so the whole frame body is observable work.
  expect(Number.isFinite(sink.v)).toBe(true);
  return samples[Math.floor(samples.length / 2)];
}

/** Median cost of one REAL `layoutBrains` call — rows built once, outside. */
function layoutMedian(count: number, frames = 60): number {
  const rows = makeRows(count);
  layoutBrains(rows as never, null); // warm: first call measures module JIT
  const samples: number[] = [];
  for (let f = 0; f < frames; f++) {
    const t0 = performance.now();
    layoutBrains(rows as never, null);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe('T-E3 layout path — CPU cost of the maths (renderer frame: see bench)', () => {
  it('the per-frame transform sweep scales with node count (the window times real work)', () => {
    const nodes = makeNodes(40);
    expect(nodes).toHaveLength(40);

    const first = measureMedian(nodes, 120);
    const steady = measureMedian(nodes, 120); // second pass = post-JIT steady state

    // Print the number, not just the verdict. Headroom is the deliverable.
    // eslint-disable-next-line no-console
    console.log(
      `[layout-path] 40-node sweep — median ${first.toFixed(4)}ms, steady-state ` +
        `${steady.toFixed(4)}ms (frame budget 16.7ms)`,
    );

    expect(first).toBeLessThanOrEqual(16.7);
    expect(steady).toBeLessThanOrEqual(16.7);
  });

  it('the measured number RESPONDS to load (proves the window times real work)', () => {
    // This is the case that would have caught the original harness: injected
    // work landed OUTSIDE the window and the median did not move. Scaling the
    // node count is work the harness cannot accidentally place outside the
    // window, because it is the thing being measured.
    const small = measureMedian(makeNodes(4), 60);
    const large = measureMedian(makeNodes(400), 60);

    expect(large).toBeGreaterThan(small);

    // eslint-disable-next-line no-console
    console.log(
      `[layout-path] responsiveness — 4 nodes ${small.toFixed(4)}ms vs ` +
        `400 nodes ${large.toFixed(4)}ms`,
    );
  });

  it('layoutBrains(400) recomputes inside one frame — it runs on EVERY status poll', () => {
    // The real shipped layout path, timed honestly: CPU only, no renderer
    // implied. A poll-time recompute that outgrows 16.7ms would jank the deck
    // before any GPU work starts.
    const median = layoutMedian(400);
    // eslint-disable-next-line no-console
    console.log(`[layout-path] layoutBrains(400) median ${median.toFixed(4)}ms (budget 16.7ms)`);
    expect(median).toBeLessThanOrEqual(16.7);
  });

  it('layout ordering and nodeRadius are pure (same input, same output)', () => {
    // Determinism is T-T1's contract but re-asserted cheaply here because the
    // cost cases above assume they re-run the SAME computation each frame.
    const nodes = makeNodes(40);
    const again = makeNodes(40);
    expect(again.map((n) => n.channelId)).toEqual(nodes.map((n) => n.channelId));
    expect(again.map((n) => n.position)).toEqual(nodes.map((n) => n.position));
    expect(nodeRadius(nodes[5].size)).toBe(nodeRadius(again[5].size));
  });

  // REMOVED 2026-09-22 (Astra 140126 D1 aux): the empty-layout deep-equality
  // "allocation" case and the invented-gate "dolly" case proved nothing about
  // the scene — one compared two EMPTY layouts, the other re-tested a local
  // boolean instead of the shipped path. Their subjects are now OBSERVED for
  // real in the browser bench (`web/bench/frame-bench.mjs`): renderer.info
  // geometry growth across repeated updates (allocation) and cameraZ across
  // the entry dolly (behaviour), each with a killed mutation — evidence at
  // `19-s5-exit-evidence.md` §4.
});
