/**
 * SWA-105 Slices 9+10 — offline pre-cache and the Floor Card.
 */
import { describe, expect, it } from 'vitest';

import {
  collectMedia, precache, preflightStatus, resolveMedia,
  type CacheLike, type SlotMedia, type PrecacheManifest,
} from './runnerPrecache';
import {
  createFloorCardModel, makeCommand, trackSend, onStateFrame, onTick, linkBanner,
  DELIVERY_TIMEOUT_MS, STALE_LINK_MS,
} from './floorCard';
import { createRunnerState } from './runnerProtocol';

const memCache = (): CacheLike & { stored: string[] } => {
  const stored: string[] = [];
  return {
    stored,
    put: async (url) => { stored.push(url); },
    has: async (url) => stored.includes(url),
  };
};

const slots: SlotMedia[] = [
  { slotId: 'a', videoUrl: '/v/a.mp4', imageUrl: '/i/a.jpg' },
  { slotId: 'b', videoUrl: '/v/b.mp4', imageUrl: '/i/b.jpg' },
  { slotId: 'c', videoUrl: null, imageUrl: '/i/c.jpg' },
];

describe('slice 9 — pre-cache with a budget and a ladder', () => {
  it('caches IMAGES FIRST so the degradation target always exists', async () => {
    const cache = memCache();
    // Budget fits all images (3 x 100) + one video (5000), not the second.
    const sizes: Record<string, number> = {
      '/i/a.jpg': 100, '/i/b.jpg': 100, '/i/c.jpg': 100, '/v/a.mp4': 5000, '/v/b.mp4': 5000,
    };
    const manifest = await precache({
      slots, cache, probe: async (u) => sizes[u], budgetBytes: 5400,
    });
    expect(cache.stored).toEqual(['/i/a.jpg', '/i/b.jpg', '/i/c.jpg', '/v/a.mp4']);
    expect(manifest.skippedForBudget).toEqual(['/v/b.mp4']); // reported, never silent
    expect(manifest.complete).toBe(false);
  });

  it('a network failure on one asset fails THAT asset, not the class', async () => {
    const cache = memCache();
    const manifest = await precache({
      slots,
      cache,
      probe: async (u) => { if (u === '/v/a.mp4') throw new Error('net'); return 10; },
      budgetBytes: 10_000,
    });
    expect(manifest.failed).toEqual(['/v/a.mp4']);
    expect(manifest.cached).toContain('/v/b.mp4');
  });

  it('the pre-flight gate: ready / partial / not_cached', async () => {
    expect(preflightStatus(null)).toBe('not_cached');
    const cache = memCache();
    const full = await precache({ slots, cache, probe: async () => 10, budgetBytes: 10_000 });
    expect(preflightStatus(full)).toBe('ready');
    const partial: PrecacheManifest = { ...full, complete: false, skippedForBudget: ['/v/b.mp4'] };
    expect(preflightStatus(partial)).toBe('partial');
  });

  it('the ladder resolves per slot against what is ACTUALLY cached: video -> image -> text', async () => {
    const manifest: PrecacheManifest = {
      cached: ['/i/a.jpg', '/v/b.mp4'], failed: [], skippedForBudget: [], totalBytes: 0, complete: false,
    };
    expect(resolveMedia(slots[0], manifest)).toEqual({ kind: 'image', url: '/i/a.jpg' }); // video missing
    expect(resolveMedia(slots[1], manifest)).toEqual({ kind: 'video', url: '/v/b.mp4' });
    expect(resolveMedia({ slotId: 'x' }, manifest)).toEqual({ kind: 'text' }); // the floor: names alone
  });

  it('collectMedia dedups shared assets', () => {
    const media = collectMedia([
      { slotId: 'a', videoUrl: '/v/same.mp4' },
      { slotId: 'b', videoUrl: '/v/same.mp4' },
    ]);
    expect(media.videos).toEqual(['/v/same.mp4']);
  });
});

describe('slice 10 — the Floor Card never lies and never leaks to the TV', () => {
  const T0 = 1_785_000_000_000;

  it('cannot command before it has heard a state (nothing to base seq on)', () => {
    expect(makeCommand(createFloorCardModel(), 'PAUSE', T0)).toBeNull();
  });

  it('optimistic echo: pending -> delivered when a newer seq arrives', () => {
    let model = onStateFrame(createFloorCardModel(), { ...createRunnerState('p', T0), seq: 3 });
    const cmd = makeCommand(model, 'PAUSE', T0 + 100)!;
    expect(cmd.baseSeq).toBe(3);
    model = trackSend(model, cmd, T0 + 100);
    expect(model.pending[0].status).toBe('pending');

    model = onStateFrame(model, { ...createRunnerState('p', T0), seq: 4 });
    expect(model.pending[0].status).toBe('delivered');
    expect(linkBanner(model)).toBeNull();
  });

  it('an unanswered command goes UNDELIVERED after the timeout — banner says check the TV', () => {
    let model = onStateFrame(createFloorCardModel(), { ...createRunnerState('p', T0), seq: 3 });
    model = trackSend(model, makeCommand(model, 'SKIP', T0)!, T0);
    model = onTick(model, T0 + DELIVERY_TIMEOUT_MS + 1, T0);
    expect(model.pending[0].status).toBe('undelivered');
    expect(linkBanner(model)).toContain('check the TV');
  });

  it('a silent link goes degraded — and the message says the TV keeps running', () => {
    let model = onStateFrame(createFloorCardModel(), { ...createRunnerState('p', T0), seq: 3 });
    model = onTick(model, T0 + STALE_LINK_MS + 1, T0);
    expect(model.degradedSinceEpochMs).not.toBeNull();
    expect(linkBanner(model)).toContain('the class continues on the TV');
  });

  it('a fresh frame is proof of life: degradation clears', () => {
    let model = onStateFrame(createFloorCardModel(), { ...createRunnerState('p', T0), seq: 3 });
    model = onTick(model, T0 + STALE_LINK_MS + 1, T0);
    model = onStateFrame(model, { ...createRunnerState('p', T0), seq: 5 });
    expect(model.degradedSinceEpochMs).toBeNull();
  });

  it('stale frames never rewind what the card knows', () => {
    let model = onStateFrame(createFloorCardModel(), { ...createRunnerState('p', T0), seq: 5 });
    model = onStateFrame(model, { ...createRunnerState('p', T0), seq: 2 });
    expect(model.lastKnown?.seq).toBe(5);
  });
});
