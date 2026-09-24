/*
 * constellation-walk.test.ts — the keyboard contract, which previously had NO
 * test file of its own (adjudication of Astra 140126 D9: the walk is a pure
 * function precisely so this is testable without React or WebGL — it just never
 * got the test).
 *
 * D9's defect: `Enter` used the `focused` STRING and ignored the membership
 * index computed one line above, so a focus left stale by a roster removal
 * activated a creator that no longer exists.
 */
import { describe, expect, it } from 'vitest';
import { walk } from './constellation-walk';
import type { BrainNode } from './constellation-layout';

const node = (channelId: string): BrainNode => ({
  channelId,
  title: channelId,
  size: 0.5,
  coverage: null,
  arc: 0,
  state: 'on',
  position: { x: 0, y: 0, z: 0 },
  enabled: true,
  videos: null,
  fetched: null,
});

const roster = [node('a'), node('b'), node('c')];

describe('the arrow walk wraps deterministically at both ends', () => {
  it('Down from nothing lands on the first node', () => {
    expect(walk(roster, null, 'ArrowDown')).toEqual({ kind: 'focus', channelId: 'a' });
  });

  it('Up from nothing lands on the LAST node (same direction asked for)', () => {
    expect(walk(roster, null, 'ArrowUp')).toEqual({ kind: 'focus', channelId: 'c' });
  });

  it('Down from the last wraps to the first; Up from the first wraps to the last', () => {
    expect(walk(roster, 'c', 'ArrowRight')).toEqual({ kind: 'focus', channelId: 'a' });
    expect(walk(roster, 'a', 'ArrowLeft')).toEqual({ kind: 'focus', channelId: 'c' });
  });

  it('Escape always clears, and unknown keys are none', () => {
    expect(walk(roster, 'b', 'Escape')).toEqual({ kind: 'clear' });
    expect(walk(roster, 'b', 'x')).toEqual({ kind: 'none' });
  });
});

describe('D9 Enter activates a node that IS in the roster — never a stale one', () => {
  it('Enter with a live focus activates that node', () => {
    expect(walk(roster, 'b', 'Enter')).toEqual({ kind: 'activate', channelId: 'b' });
  });

  it('Enter with a REMOVED focus clears the stale focus instead of activating a ghost', () => {
    // Pre-fix: returns { kind: 'activate', channelId: 'removed-x' } — a keystroke
    // routed to a creator that no longer exists (Astra 140126 D9).
    expect(walk(roster, 'removed-x', 'Enter')).toEqual({ kind: 'clear' });
  });

  it('Enter with nothing focused is a none', () => {
    expect(walk(roster, null, 'Enter')).toEqual({ kind: 'none' });
  });

  it('empty roster: every key is none, including Enter on a stale focus', () => {
    expect(walk([], 'ghost', 'Enter')).toEqual({ kind: 'none' });
    expect(walk([], 'ghost', 'ArrowDown')).toEqual({ kind: 'none' });
  });
});
