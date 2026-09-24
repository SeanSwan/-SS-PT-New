/*
 * constellation-layout.test.ts — T-T1.
 *
 * The plan's wording is the acceptance bar and is quoted rather than paraphrased:
 *
 *   "`layoutBrains(brains)` pure: same input → same positions/sizes/colors;
 *    size ∝ videos, arc ∝ coverage, color per state map"
 *
 * Three clauses, three groups below. The determinism clause is the one with teeth:
 * it is easy to write a layout that looks right in one screenshot and reshuffles
 * on the next render, and the failure is invisible in review because both frames
 * are individually plausible.
 */
import { describe, expect, it } from 'vitest';
import { layoutBrains, nodeLabel, nodeRadius, nodeState, STATE_COLOR } from './constellation-layout';
import type { CreatorRow, StatusInstrument } from '../adapters';
import * as fx from '../adapters/fixtures';

const row = (over: Partial<CreatorRow> = {}): CreatorRow => ({
  channelId: 'chan-a',
  title: 'A',
  enabled: true,
  videos: 100,
  fetched: 50,
  ...over,
});

describe('T-T1 layoutBrains is pure and deterministic', () => {
  it('same input → byte-identical output', () => {
    const rows = [row(), row({ channelId: 'chan-b', title: 'B', videos: 40, fetched: 10 })];
    const a = layoutBrains(rows, null);
    const b = layoutBrains(rows, null);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('same input → same positions, even when the input array ORDER differs', () => {
    // This is the clause that a naive "index in the array" implementation fails:
    // the engine serialises a MAP, so row order is not stable across reads, and a
    // layout keyed on arrival order would reshuffle the sky every poll.
    const one = [row({ channelId: 'chan-a', videos: 100 }), row({ channelId: 'chan-b', videos: 40 })];
    const two = [row({ channelId: 'chan-b', videos: 40 }), row({ channelId: 'chan-a', videos: 100 })];
    expect(JSON.stringify(layoutBrains(one, null))).toBe(JSON.stringify(layoutBrains(two, null)));
  });

  it('does not mutate its input', () => {
    const rows = [row({ channelId: 'b' }), row({ channelId: 'a' })];
    const before = JSON.stringify(rows);
    layoutBrains(rows, null);
    expect(JSON.stringify(rows)).toBe(before);
  });

  it('is total — an empty roster and a damaged roster do not throw', () => {
    expect(layoutBrains([], null)).toEqual([]);
    // `videos: null` is the S1-H9 damaged shape: "must be rendered as absent,
    // never as 0".
    expect(() => layoutBrains([row({ videos: null, fetched: null })], null)).not.toThrow();
  });
});

describe('T-T1 size ∝ videos', () => {
  it('the widest creator is size 1 and the ratio holds', () => {
    const out = layoutBrains([
      row({ channelId: 'big', videos: 400 }),
      row({ channelId: 'small', videos: 100 }),
    ], null);
    const big = out.find((n) => n.channelId === 'big')!;
    const small = out.find((n) => n.channelId === 'small')!;
    expect(big.size).toBe(1);
    expect(small.size).toBeCloseTo(0.25, 5);
  });

  it('a null count is the FLOOR, not a zero-size hole and not a max', () => {
    // A damaged count must not be silently read as "this creator has no videos"
    // (that is 0, and would be wrong) nor as the largest (also wrong).
    const out = layoutBrains([row({ channelId: 'x', videos: null })], null);
    expect(out[0].size).toBe(0);
  });

  it('nodeRadius grows monotonically with size and never inverts', () => {
    expect(nodeRadius(0)).toBeLessThan(nodeRadius(0.5));
    expect(nodeRadius(0.5)).toBeLessThan(nodeRadius(1));
  });
});

describe('T-T1 arc ∝ coverage', () => {
  it('a half-fetched creator is a full turn of PI', () => {
    const out = layoutBrains([row({ videos: 100, fetched: 50 })], null);
    expect(out[0].coverage).toBeCloseTo(0.5, 5);
    expect(out[0].arc).toBeCloseTo(Math.PI, 5);
  });

  it('a fully fetched creator is a full circle', () => {
    const out = layoutBrains([row({ videos: 100, fetched: 100 })], null);
    expect(out[0].arc).toBeCloseTo(Math.PI * 2, 5);
  });

  it('an UNMEASURABLE coverage is null, not 0 — the two render differently', () => {
    // 0% and "we could not tell" look identical as an arc, which is exactly why
    // the distinction is carried in the value and surfaced in the label.
    const damaged = layoutBrains([row({ videos: null, fetched: null })], null);
    expect(damaged[0].coverage).toBeNull();
    const zero = layoutBrains([row({ videos: 100, fetched: 0 })], null);
    expect(zero[0].coverage).toBe(0);
    expect(nodeLabel(damaged[0])).toMatch(/counts unavailable/);
    expect(nodeLabel(zero[0])).not.toMatch(/counts unavailable/);
  });
});

describe('T-T1 color per state map', () => {
  it('maps enabled/disabled to ice and lavender', () => {
    expect(nodeState(row({ enabled: true }), null)).toBe('on');
    expect(nodeState(row({ enabled: false }), null)).toBe('off');
  });

  it('throttle outranks the enable toggle', () => {
    const throttle = { active: true, text: 'throttled' } as StatusInstrument['throttle'];
    const status = { ...fx.healthyStatus, throttle };
    expect(nodeState(row({ enabled: true }), status)).toBe('throttle');
  });

  it('staleness outranks everything — it is the state that needs a human', () => {
    const status = {
      ...fx.healthyStatus,
      throttle: { active: true, text: 'throttled' } as StatusInstrument['throttle'],
      lastGood: { at: new Date().toISOString(), staleDays: 9 },
    };
    expect(nodeState(row({ enabled: false }), status)).toBe('stale');
  });

  it('every state has a colour, and colour is never the only signal', () => {
    for (const state of Object.keys(STATE_COLOR) as Array<keyof typeof STATE_COLOR>) {
      expect(STATE_COLOR[state]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    // `03 §a11y`: "color never sole signal (ON/off/throttle carry text labels)".
    expect(nodeLabel(layoutBrains([row({ enabled: false })], null)[0])).toMatch(/off/);
  });
});

describe('D10 damaged numeric input cannot contaminate the scene', () => {
  it('Infinity counts degrade to the floor instead of NaN positions', () => {
    const rows = [
      row({ enabled: true, videos: 10, fetched: 5 }),
      row({ enabled: true, videos: Infinity, fetched: 1 }),
    ];
    const nodes = layoutBrains(rows, null);
    // Pre-fix: widest = Infinity, so the poisoned row computes Infinity/Infinity
    // = NaN for its own size and every finite row collapses toward 0; the NaN
    // size flows into spherePoint and then into the scene extent (D5's fit).
    for (const n of nodes) {
      expect(Number.isFinite(n.size)).toBe(true);
      expect(Number.isFinite(n.position.x)).toBe(true);
      expect(Number.isFinite(n.position.y)).toBe(true);
      expect(Number.isFinite(n.position.z)).toBe(true);
      expect(n.size).toBeGreaterThanOrEqual(0);
      expect(n.size).toBeLessThanOrEqual(1);
    }
  });

  it('negative counts are unavailable, not a negative size', () => {
    const nodes = layoutBrains([row({ enabled: true, videos: -5, fetched: -1 })], null);
    expect(nodes[0].size).toBe(0);
    expect(Number.isFinite(nodes[0].position.x)).toBe(true);
    expect(layoutBrains([row({ enabled: true, videos: 7, fetched: -2 })], null)[0].coverage).toBe(null);
  });
});
