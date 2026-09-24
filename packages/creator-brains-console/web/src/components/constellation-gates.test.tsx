/*
 * constellation-gates.test.ts — T-W7 and T-E3.
 *
 * Two plan lines, quoted:
 *
 *   T-W7 — "reduced-motion (JS gate) → constellation renders static frame + roster
 *           equivalent present; WebGL-mocked-unavailable → fallback list"
 *   T-E3 — "three chunk is fetched on idle after the first successful status poll,
 *           NOT on viewport enter; first paint ships the initial bundle with a
 *           static placeholder; reduced-motion OR WebGL-absent → the chunk is
 *           never fetched at all"
 *
 * ── WHY THESE TESTS COUNT CHUNK LOADS ───────────────────────────────────────
 *
 * "Never fetched" is a claim about a DOWNLOAD, and the only honest way to assert
 * it is to observe that the loader was not entered. Asserting on a CSS class or a
 * visible placeholder would pass even if the 1.4 MB had already been requested —
 * which is precisely the defect `14 §3` describes ("the label said lazy; the
 * behaviour did not"). So the tests spy on module entry and count calls.
 *
 * ── TWO onIdle MODES, AND WHY ───────────────────────────────────────────────
 *
 * The DECISION tests run `onIdle` synchronously so they need no timers: they are
 * about WHETHER the load happens in a gate state, not WHEN idle arrives. The
 * DELIVERY tests hold the callback instead, so they can assert the deferral
 * itself ("none before callback delivery", "cancelled after teardown") — which
 * Astra 140126 D8 found was asserted nowhere. The REAL scheduler (fallback
 * window, rIC contract, cancellation) is exercised UNMOCKED in
 * `constellation-idle.test.ts`; this file's comment used to promise that case
 * "below" while no such case existed — the promise is now a file.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import * as fx from '../adapters/fixtures';
import type { CreatorRow } from '../adapters';

// The spy must be installed BEFORE the component module is imported, so the
// component under test resolves to the counted version.
const loadSpy = vi.hoisted(() => vi.fn());
const shouldLoadReal = vi.hoisted(() => vi.fn());
const idleCtl = vi.hoisted(() => ({ mode: 'sync' as 'sync' | 'hold', held: [] as Array<() => void> }));

vi.mock('./constellation-chunk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./constellation-chunk')>();
  shouldLoadReal.mockImplementation(actual.shouldLoadChunk);
  return {
    ...actual,
    loadConstellationChunk: loadSpy,
    // 'sync' runs the callback immediately (decision tests); 'hold' parks it so
    // a test controls exactly when idle "arrives" — and the returned canceller
    // removes the parked callback, which is what makes unmount observable.
    onIdle: (fn: () => void) => {
      if (idleCtl.mode === 'sync') { fn(); return () => {}; }
      idleCtl.held.push(fn);
      return () => {
        const i = idleCtl.held.indexOf(fn);
        if (i >= 0) idleCtl.held.splice(i, 1);
      };
    },
  };
});

const { BrainConstellation } = await import('./BrainConstellation');

const rows: CreatorRow[] = [
  { channelId: 'chan-a', title: 'photographer-brain', enabled: true, videos: 979, fetched: 412 },
  { channelId: 'chan-b', title: 'seo-brain', enabled: false, videos: 979, fetched: 88 },
];

/**
 * Render and then let the chunk-load microtask settle INSIDE `act`.
 *
 * Without this the `setReady(true)` at the end of the awaited
 * `loadConstellationChunk()` lands outside React's test scheduling and React
 * warns "an update was not wrapped in act(...)". That warning is worth obeying
 * rather than muting: the same unguarded update after an unmount is a SILENT
 * no-op under React 18.3, so a test that ignored it would be blind to a real
 * class of bug. `flush()` is the barrier that makes the settling observable.
 */
const renderWith = async (over: Partial<Parameters<typeof BrainConstellation>[0]> = {}) => {
  const out = render(
    <BrainConstellation
      rows={rows}
      status={fx.healthyStatus}
      onOpenBrain={() => {}}
      {...over}
    />,
  );
  await act(async () => { await Promise.resolve(); });
  return out;
};

beforeEach(() => {
  loadSpy.mockReset();
  loadSpy.mockResolvedValue({});
  idleCtl.mode = 'sync';
  idleCtl.held.length = 0;
});
afterEach(() => { cleanup(); idleCtl.mode = 'sync'; idleCtl.held.length = 0; });

describe('T-E3 the chunk is NEVER fetched when a gate is closed', () => {
  it('reduced motion → zero chunk loads, and a static frame is still described', async () => {
    await renderWith({ reducedMotion: true, webglAvailable: true });

    expect(loadSpy).not.toHaveBeenCalled();
    // T-E3's "static placeholder" is not a blank panel: the nodes are present as
    // DOM, and the frame reports the motion mode it is in.
    expect(screen.getByTestId('brain-constellation').getAttribute('data-reduced-motion')).toBe('true');
    expect(screen.getByTestId('constellation-node-list').children.length).toBe(2);
  });

  it('WebGL absent → zero chunk loads, and the fallback list is shown', async () => {
    await renderWith({ reducedMotion: false, webglAvailable: false });

    expect(loadSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('constellation-fallback')).toBeTruthy();
    expect(screen.queryByTestId('constellation-canvas')).toBeNull();
    // T-W7: "WebGL-mocked-unavailable → fallback list", and the roster equivalent
    // must survive it.
    expect(screen.getByTestId('constellation-node-list').children.length).toBe(2);
  });

  it('BOTH gates closed → still zero, and it is the fallback not a placeholder', async () => {
    await renderWith({ reducedMotion: true, webglAvailable: false });
    expect(loadSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('constellation-fallback')).toBeTruthy();
  });
});

describe('T-E3 the load trigger is the first SUCCESSFUL status poll', () => {
  it('does NOT load before a status reading exists', async () => {
    await renderWith({ reducedMotion: false, webglAvailable: true, status: null });
    expect(loadSpy).not.toHaveBeenCalled();
    // The placeholder is what first paint ships — not a spinner over an empty 1.4 MB.
    expect(screen.getByTestId('constellation-placeholder')).toBeTruthy();
  });

  it('LOADS once the first reading arrives', async () => {
    const { rerender } = await renderWith({ reducedMotion: false, webglAvailable: true, status: null });
    expect(loadSpy).not.toHaveBeenCalled();

    // ── the barrier: the first successful poll lands. Wrapped in `act` because
    // the successful load resolves a promise and then sets state — the settling
    // has to be observed, not raced.
    await act(async () => {
      rerender(
        <BrainConstellation rows={rows} status={fx.healthyStatus} onOpenBrain={() => {}} reducedMotion={false} webglAvailable />,
      );
      await Promise.resolve();
    });
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('a re-render does not re-fetch — the load is once per page', async () => {
    const { rerender } = await renderWith({ reducedMotion: false, webglAvailable: true });
    await act(async () => {
      rerender(<BrainConstellation rows={rows} status={fx.healthyStatus} onOpenBrain={() => {}} reducedMotion={false} webglAvailable />);
      rerender(<BrainConstellation rows={rows} status={fx.healthyStatus} onOpenBrain={() => {}} reducedMotion={false} webglAvailable />);
      await Promise.resolve();
    });
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });
});

// ── D8 (Astra 140126): idle DELIVERY is deferred and cancellable — the queue
// between "status arrived" and "chunk requested". Held-callback mode makes the
// queue observable; these were the assertions missing entirely.
describe('D8 idle delivery: no load before the callback, none after cancellation', () => {
  it('status arrived but idle has NOT delivered → zero loads; delivering loads exactly once', async () => {
    idleCtl.mode = 'hold';
    await renderWith({ reducedMotion: false, webglAvailable: true });
    expect(idleCtl.held.length).toBe(1); // the callback is parked, not run
    expect(loadSpy).not.toHaveBeenCalled();

    await act(async () => {
      idleCtl.held[0]?.();
      await Promise.resolve();
    });
    expect(loadSpy).toHaveBeenCalledTimes(1);
  });

  it('unmount cancels the parked callback — nothing loads after teardown', async () => {
    idleCtl.mode = 'hold';
    const { unmount } = await renderWith({ reducedMotion: false, webglAvailable: true });
    expect(idleCtl.held.length).toBe(1);
    unmount();
    expect(idleCtl.held.length).toBe(0); // cleanup ran the canceller
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('losing eligibility (status back to null) cancels the parked callback too', async () => {
    idleCtl.mode = 'hold';
    const { rerender } = await renderWith({ reducedMotion: false, webglAvailable: true });
    expect(idleCtl.held.length).toBe(1);
    rerender(<BrainConstellation rows={rows} status={null} onOpenBrain={() => {}} reducedMotion={false} webglAvailable />);
    expect(idleCtl.held.length).toBe(0);
    expect(loadSpy).not.toHaveBeenCalled();
  });
});

describe('T-W7 the roster equivalent is present in every gate state', () => {
  it.each([
    ['animated', { reducedMotion: false, webglAvailable: true }],
    ['reduced', { reducedMotion: true, webglAvailable: true }],
    ['no-webgl', { reducedMotion: false, webglAvailable: false }],
  ])('%s — every node is a labelled, focusable DOM control', async (_name, gates) => {
    // Awaited (Astra 140126 D8): the async case must observe renderWith's own
    // act-flush, not race it — unawaited it passed only because render() is
    // synchronous before its first await.
    await renderWith(gates as Partial<Parameters<typeof BrainConstellation>[0]>);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(2);
    // `03 §a11y`: "Node focus shows the same tooltip as hover; every action also
    // exists as a DOM control (never hover-only)".
    expect(buttons[0].getAttribute('aria-label')).toMatch(/photographer-brain/);
    expect(buttons[1].getAttribute('aria-label')).toMatch(/off/);
  });

  it('an empty roster says so rather than rendering nothing', async () => {
    await renderWith({ rows: [], reducedMotion: true, webglAvailable: true });
    // `03 §state matrix` empty row: "empty-space message + CTA to roster".
    expect(screen.getByTestId('constellation-placeholder').textContent).toMatch(/No brains yet/);
  });
});

describe('shouldLoadChunk is the whole gate, in one predicate', () => {
  it('is false when either input is false, true only when both are true', () => {
    expect(shouldLoadReal({ reduced: false, webgl: true })).toBe(true);
    expect(shouldLoadReal({ reduced: true, webgl: true })).toBe(false);
    expect(shouldLoadReal({ reduced: false, webgl: false })).toBe(false);
    expect(shouldLoadReal({ reduced: true, webgl: false })).toBe(false);
  });
});
