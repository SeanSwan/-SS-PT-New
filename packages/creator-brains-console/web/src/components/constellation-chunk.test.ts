/*
 * constellation-chunk.test.ts — the loader's STATE machine (adjudication of
 * Astra 140126 D7), tested against the REAL module: no top-level mock of the
 * chunk module itself, because the defect lives in ITS bookkeeping.
 *
 * D7's two prongs, both pinned here:
 *   1. `loaded` used to become true BEFORE the import settled, so an in-flight
 *      (or permanently failed) load reported isLoaded() === true.
 *   2. A rejected import stayed cached forever — every later call got the same
 *      rejection, with no recovery short of a page reload.
 *
 * The FAILURE case drives the real dynamic import through a doMock factory that
 * throws, then rebuilds the module registry (`vi.resetModules()`) so the retry
 * is a genuinely fresh import attempt — the same sequence a network or parse
 * failure followed by a recovered network would take. (Driving both phases from
 * one hoisted factory poisoned vitest's mock registry: the retry assertion blew
 * up formatting the cached namespace instead of exercising the code.)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const { isLoaded, loadConstellationChunk, __resetForTests } = await import('./constellation-chunk');

afterEach(() => {
  __resetForTests();
  vi.doUnmock('./constellation-three.js');
  vi.resetModules();
});

describe('D7 the loader reports the truth about its own state', () => {
  it('isLoaded() is FALSE while the import is in flight, and true only after fulfilment', async () => {
    __resetForTests();
    const p = loadConstellationChunk();
    // Pre-fix: `loaded = true` ran before the import settled, so this was true
    // the instant loadConstellationChunk() returned.
    expect(isLoaded()).toBe(false);
    await p;
    expect(isLoaded()).toBe(true);
  });

  it('concurrent calls share ONE import (idempotent while pending)', async () => {
    __resetForTests();
    const a = loadConstellationChunk();
    const b = loadConstellationChunk();
    expect(a).toBe(b);
    await a;
    expect(isLoaded()).toBe(true);
  });

  it('a FAILED import leaves isLoaded() false and the next call RETRIES', async () => {
    vi.resetModules();
    vi.doMock('./constellation-three.js', () => {
      throw new Error('chunk import failed (test)');
    });
    const broken = await import('./constellation-chunk');
    // The rejection is the subject, not its wording: vitest re-wraps factory
    // exceptions in its own "[vitest] There was an error when mocking" Error,
    // so pinning OUR message here would assert vitest's error taxonomy.
    await expect(broken.loadConstellationChunk()).rejects.toThrow();
    // Pre-fix: loaded stayed true and `pending` kept the rejected promise, so a
    // failure was reported as success and could never recover.
    expect(broken.isLoaded()).toBe(false);

    // Recovery: fresh registry, healthy module — the next call must be a NEW
    // attempt that can succeed, not the same cached corpse.
    vi.resetModules();
    vi.doMock('./constellation-three.js', () => ({ createScene: () => undefined }));
    const healthy = await import('./constellation-chunk');
    await expect(healthy.loadConstellationChunk()).resolves.toBeTruthy();
    expect(healthy.isLoaded()).toBe(true);
  });
});
