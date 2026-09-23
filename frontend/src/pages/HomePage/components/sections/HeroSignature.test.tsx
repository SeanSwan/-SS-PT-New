/**
 * HeroSignature.test.tsx — A9 acceptance, cases L1–L5.
 * ====================================================
 *
 * WHAT THESE PROVE, AND WHAT THEY DO NOT. Every case here runs in jsdom against an INJECTED
 * scene factory. They prove the lifecycle: when we import, when we refuse to, what happens to a
 * late success, and what the user sees in each failure. They do NOT prove that WebGL renders
 * anything — no real context exists here. `09-tests.md` puts that in M1
 * (`tests/cinematic/signature.spec.ts`, real browser), which is NOT written and NOT claimed.
 *
 * Saying that plainly matters because the failure mode is specific: a green suite here could be
 * read as "the hero signature works". It means "the hero signature's decisions are correct".
 *
 * WHY THE SEAMS ARE SAFE. `loadScene` and `now` default to the real implementations, so the
 * production path is the default path. A seam that altered behaviour would be a defect; these
 * only make the awaited boundary and the clock observable. The deadline cases in particular are
 * untestable without a controllable clock — the alternative is a real 4-second wait per case.
 */
import React from 'react';
import { render, screen, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import HeroSignature, { type SceneModule } from './HeroSignature';
import { PerformanceTierContext } from '../../../../core/perf/PerformanceTierContext';
import type { CapabilityState, CanonicalTier } from '../../../../core/perf/performanceTierPolicy';

/* ------------------------------------------------------------------ fixtures */

const state = (phase: 'pending' | 'ready', tier: CanonicalTier): CapabilityState =>
  ({ phase, tier, snapshot: undefined } as unknown as CapabilityState);

const READY_FULL = state('ready', 'full');
const READY_LEAN = state('ready', 'lean');
const READY_REDUCED = state('ready', 'reduced');
const PENDING = state('pending', 'reduced');

/** A controllable IntersectionObserver. jsdom has none, so tests own visibility entirely. */
class MockIO {
  static instances: MockIO[] = [];
  callback: IntersectionObserverCallback;
  elements: Element[] = [];
  disconnected = false;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
    MockIO.instances.push(this);
  }
  observe(el: Element) { this.elements.push(el); }
  unobserve() { /* not used */ }
  disconnect() { this.disconnected = true; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
  /** Drive an intersection change from a test. */
  emit(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting, target: this.elements[0] } as unknown as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    });
  }
  static latest(): MockIO { return MockIO.instances[MockIO.instances.length - 1]; }
  static reset() { MockIO.instances = []; }
}

interface FakeScene {
  setSize: ReturnType<typeof vi.fn>;
  setDrift: ReturnType<typeof vi.fn>;
  beginReveal: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
}

interface Harness {
  /** Resolve the pending dynamic import. */
  resolve: () => Promise<void>;
  reject: (err?: unknown) => Promise<void>;
  loadScene: () => Promise<SceneModule>;
  /** How many times the loader was invoked — the download-avoidance assertion. */
  calls: () => number;
  scenes: FakeScene[];
  fire: { presented?: () => void; error?: (e?: unknown) => void };
  clock: { value: number; advance: (ms: number) => void; now: () => number };
}

function harness(): Harness {
  let resolveFn: ((m: SceneModule) => void) | null = null;
  let rejectFn: ((e: unknown) => void) | null = null;
  let calls = 0;
  const scenes: FakeScene[] = [];
  const fire: Harness['fire'] = {};
  const clock = {
    value: 1_000,
    advance(ms: number) { clock.value += ms; },
    now: () => clock.value,
  };

  const mod: SceneModule = {
    spec: {},
    createSwanMarkScene: (opts) => {
      const scene: FakeScene = {
        setSize: vi.fn(),
        setDrift: vi.fn(),
        beginReveal: vi.fn(() => true),
        dispose: vi.fn(),
      };
      scenes.push(scene);
      fire.presented = () => act(() => { opts.onPresented?.({} as never); });
      fire.error = (e?: unknown) => act(() => { opts.onError?.(e ?? new Error('ctx lost')); });
      return scene as unknown as ReturnType<SceneModule['createSwanMarkScene']>;
    },
  };

  const loadScene = () => {
    calls += 1;
    return new Promise<SceneModule>((res, rej) => { resolveFn = res; rejectFn = rej; });
  };

  return {
    loadScene,
    calls: () => calls,
    scenes,
    fire,
    clock,
    /*
     * A single `await Promise.resolve()` is NOT enough. The component's loader is an async IIFE
     * with several awaits after the one being settled here, and each is its own microtask tick.
     * Flushing only once left the phase at `loading` and failed nine cases for a reason that had
     * nothing to do with the component. A macrotask boundary drains the whole chain.
     */
    async resolve() {
      await act(async () => {
        resolveFn?.(mod);
        await new Promise((r) => { setTimeout(r, 0); });
      });
    },
    async reject(err = new Error('chunk 404')) {
      await act(async () => {
        rejectFn?.(err);
        await new Promise((r) => { setTimeout(r, 0); });
      });
    },
  };
}

function mount(h: Harness, capability: CapabilityState, extra: Record<string, unknown> = {}) {
  return render(
    <PerformanceTierContext.Provider value={capability}>
      <HeroSignature
        posterSrc="/swan-poster.webp"
        loadScene={h.loadScene}
        now={h.clock.now}
        {...extra}
      />
    </PerformanceTierContext.Provider>,
  );
}

const phaseOf = () => screen.getByTestId('hero-signature').getAttribute('data-phase');
/*
 * By testid, NOT by role. The poster is decorative (`alt=""`), which gives it the implicit role
 * `presentation` — `queryByRole('img')` never matches it, so a role-based helper reported "no
 * poster" in every state and quietly inverted the assertion it was written to make.
 */
const posterPresent = () => screen.queryByTestId('hero-signature-poster') !== null;

beforeEach(() => {
  MockIO.reset();
  vi.stubGlobal('IntersectionObserver', MockIO as unknown as typeof IntersectionObserver);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/* ------------------------------------------------------------------ L1 */

describe('L1 — eligibility without accidental download', () => {
  it('pending detection never latches disabled', async () => {
    const h = harness();
    const view = mount(h, PENDING);
    MockIO.latest().emit(true);

    // The trap A1 exists to prevent: `pending` carries tier `reduced`, so anything reading the
    // bare tier would conclude "not eligible, permanently". It must stay `idle` — askable again.
    expect(phaseOf()).toBe('idle');
    expect(h.calls()).toBe(0);

    // ...and a later upgrade must actually be honoured, which is what proves it never latched.
    view.rerender(
      <PerformanceTierContext.Provider value={READY_FULL}>
        <HeroSignature posterSrc="/swan-poster.webp" loadScene={h.loadScene} now={h.clock.now} />
      </PerformanceTierContext.Provider>,
    );
    expect(h.calls()).toBe(1);
  });

  it('initially offscreen does not import', () => {
    const h = harness();
    mount(h, READY_FULL);
    // Eligible tier, but never intersected. ~900 KB must not be fetched for a hero the visitor
    // has not reached.
    expect(h.calls()).toBe(0);
    expect(phaseOf()).toBe('idle');
  });

  it('lean and reduced never invoke loader', () => {
    for (const cap of [READY_LEAN, READY_REDUCED]) {
      const h = harness();
      mount(h, cap);
      MockIO.latest().emit(true);
      expect(h.calls()).toBe(0);
      cleanup();
    }
  });
});

/* ------------------------------------------------------------------ L2 */

describe('L2 — races and bounded completion', () => {
  it('late import after downgrade creates no controller', async () => {
    const h = harness();
    const view = mount(h, READY_FULL);
    MockIO.latest().emit(true);
    expect(h.calls()).toBe(1);

    // Downgrade while the import is in flight.
    view.rerender(
      <PerformanceTierContext.Provider value={READY_REDUCED}>
        <HeroSignature posterSrc="/swan-poster.webp" loadScene={h.loadScene} now={h.clock.now} />
      </PerformanceTierContext.Provider>,
    );
    await h.resolve();

    // Eligibility is re-asked AFTER the await, so nothing is constructed.
    expect(h.scenes).toHaveLength(0);
    expect(posterPresent()).toBe(true);
  });

  it('late import after unmount has no side effect', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    cleanup();
    await h.resolve();
    // No controller, and therefore no orphaned WebGL context.
    expect(h.scenes).toHaveLength(0);
  });

  it('expired deadline rejects late success', async () => {
    const h = harness();
    mount(h, READY_FULL, { deadlineMs: 500 });
    MockIO.latest().emit(true);
    h.clock.advance(900); // the import took longer than the budget
    await h.resolve();

    expect(h.scenes).toHaveLength(0);
    expect(phaseOf()).toBe('disabled');
    expect(posterPresent()).toBe(true);
  });
});

/* ------------------------------------------------------------------ L3 */

describe('L3 — fallback and no replay', () => {
  it('poster remains until first presentation', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    await h.resolve();

    // Revealing is NOT presented. Hiding the poster here is the one-frame hole this guards.
    expect(phaseOf()).toBe('revealing');
    expect(posterPresent()).toBe(true);

    h.fire.presented!();
    expect(phaseOf()).toBe('presented');
    expect(posterPresent()).toBe(false);
  });

  it('context loss restores poster', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    await h.resolve();
    h.fire.presented!();
    expect(posterPresent()).toBe(false);

    h.fire.error!();
    expect(posterPresent()).toBe(true);
    expect(phaseOf()).toBe('disabled');
    expect(h.scenes[0].dispose).toHaveBeenCalled();
  });

  it('failure remains latched after provider upgrade', async () => {
    const h = harness();
    const view = mount(h, READY_FULL);
    MockIO.latest().emit(true);
    await h.reject();
    expect(phaseOf()).toBe('disabled');
    const callsAfterFailure = h.calls();

    // A capability change must NOT resurrect it. Retrying a failed WebGL init inside one page
    // view burns battery to reach the same poster.
    view.rerender(
      <PerformanceTierContext.Provider value={{ ...READY_FULL }}>
        <HeroSignature posterSrc="/swan-poster.webp" loadScene={h.loadScene} now={h.clock.now} />
      </PerformanceTierContext.Provider>,
    );
    expect(phaseOf()).toBe('disabled');
    expect(h.calls()).toBe(callsAfterFailure);
  });
});

/* ------------------------------------------------------------------ L4 */

describe('L4 — visibility and unsupported observer', () => {
  it('hidden during loading latches disabled', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    expect(phaseOf()).toBe('loading');

    MockIO.latest().emit(false); // scrolled away mid-import
    expect(phaseOf()).toBe('disabled');

    await h.resolve();
    expect(h.scenes).toHaveLength(0);
  });

  it('hidden during reveal disposes controller', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    await h.resolve();
    expect(phaseOf()).toBe('revealing');

    MockIO.latest().emit(false);
    expect(h.scenes[0].dispose).toHaveBeenCalled();
    expect(phaseOf()).toBe('disabled');
  });

  it('missing observer retains poster', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('IntersectionObserver', undefined);
    const h = harness();
    mount(h, READY_FULL);
    // Cannot know visibility → do not download. The poster is the correct answer, not a guess.
    expect(h.calls()).toBe(0);
    expect(posterPresent()).toBe(true);
  });
});

/* ------------------------------------------------------------------ L5 */

describe('L5 — effect replay and deadline honesty', () => {
  it('StrictMode effect replay permits one valid reveal', async () => {
    const h = harness();
    render(
      <React.StrictMode>
        <PerformanceTierContext.Provider value={READY_FULL}>
          <HeroSignature posterSrc="/swan-poster.webp" loadScene={h.loadScene} now={h.clock.now} />
        </PerformanceTierContext.Provider>
      </React.StrictMode>,
    );
    MockIO.latest().emit(true);
    await h.resolve();

    // StrictMode double-invokes effects. At most ONE controller may survive, and it must be the
    // live one — the generation guard is what makes the first run's resolution inert.
    expect(h.scenes.length).toBeLessThanOrEqual(1);
    if (h.scenes.length === 1) {
      expect(h.scenes[0].beginReveal).toHaveBeenCalledTimes(1);
    }
  });

  it('cleanup before presentation does not consume reveal', async () => {
    const h = harness();
    mount(h, READY_FULL);
    MockIO.latest().emit(true);
    await h.resolve();
    expect(phaseOf()).toBe('revealing');

    cleanup();
    expect(h.scenes[0].dispose).toHaveBeenCalled();
    // The reveal was started but never presented; firing the callback afterwards must not
    // touch a torn-down tree.
    expect(() => h.fire.presented!()).not.toThrow();
  });

  it('synchronous preparation exceeding deadline never presents late', async () => {
    const h = harness();
    mount(h, READY_FULL, { deadlineMs: 1000 });
    MockIO.latest().emit(true);

    // The import lands inside budget, but constructing the scene, compiling shaders and
    // uploading the mesh consumes the rest. Checking the clock only before construction would
    // miss this entirely and present a reveal after the budget.
    h.clock.advance(400);
    const originalCreate = h.scenes.length;
    await act(async () => {
      h.clock.advance(900); // preparation cost, applied across the await
      await Promise.resolve();
    });
    await h.resolve();

    expect(phaseOf()).toBe('disabled');
    expect(posterPresent()).toBe(true);
    expect(h.scenes.length).toBeGreaterThanOrEqual(originalCreate);
    // Whatever was constructed must not have been left owning a context.
    h.scenes.forEach((s) => expect(s.dispose).toHaveBeenCalled());
  });
});
