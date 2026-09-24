/*
 * constellation-three.ts — the ONE place `three` is imported, and the gate that
 * decides whether it is imported at all (T-E3, `14 §3`).
 *
 * ── WHY THE IMPORT IS DYNAMIC AND THE GATE IS HERE ──────────────────────────
 *
 * `14 §3` decision D-C1: the three.js chunk is "not 'lazy', it is 'eager with
 * extra steps'" unless the load trigger actually defers it. Under CD3 the
 * constellation is in the ENTRY split view, so viewport-enter fires at first
 * paint — the old trigger was eager wearing a lazy label.
 *
 * The corrected contract, item by item:
 *
 *   1. First paint ships the initial bundle only; the panel renders a static,
 *      non-WebGL placeholder immediately and the ops deck is interactive first.
 *   2. The chunk is fetched on IDLE AFTER THE FIRST SUCCESSFUL STATUS POLL.
 *   3. Under `prefers-reduced-motion` OR absent WebGL the chunk is NEVER FETCHED.
 *   4. The entry dolly waits on the chunk; if it arrives after the idle window it
 *      is SKIPPED rather than janking in late.
 *
 * A dynamic `import()` inside a module that is only reached through these gates
 * is what makes item 3 true rather than aspirational: an unreached `import()` is
 * a chunk the bundler emits and the browser never requests. A static import at
 * the top of a component would ship the weight to everyone regardless of the
 * gate, and the gate would be decoration.
 *
 * ── WHY THE GATES ARE FUNCTIONS AND NOT READ INLINE ─────────────────────────
 *
 * `prefers-reduced-motion` and WebGL support are both ambient, and reading them
 * inline makes them untestable without mutating the test environment. Passing
 * them in means T-E3 can assert the negative case directly: with either gate
 * closed, the loader is never called — and the test can prove that by counting
 * calls, which is a fact, rather than by checking that a CSS class is absent,
 * which is a symptom.
 */

/** Module-level so a second mount cannot trigger a second chunk request. */
let pending: Promise<unknown> | null = null;
let loaded = false;

/** True when this page has already fetched the chunk. */
export function isLoaded(): boolean {
  return loaded;
}

/** Test seam only — the loader is otherwise write-once per page. */
export function __resetForTests(): void {
  pending = null;
  loaded = false;
}

/**
 * Should the chunk be fetched at all?
 *
 * BOTH gates refuse, and that is the part with the real payoff (`14 §3` item 3):
 * a reduced-motion user or a machine without WebGL pays ZERO rather than ~1.4 MB
 * for a scene that will not animate.
 *
 * `reduced` is passed explicitly rather than read from `matchMedia` here so the
 * caller owns the media query and its listener, and this stays a pure predicate.
 */
export function shouldLoadChunk({ reduced, webgl }: { reduced: boolean; webgl: boolean }): boolean {
  return !reduced && webgl;
}

/** WebGL capability, feature-detected without throwing on a headless jsdom. */
export function hasWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    // A context request that THROWS is a "no", not an error worth surfacing: the
    // fallback list is a first-class path (`03 §state matrix`), not a crash.
    return false;
  }
}

/**
 * Fetch the chunk, once per page.
 *
 * Idempotent by construction: `pending` is assigned before the first `await`, so
 * two mounts racing cannot both start a download — the same check-then-act
 * discipline `admission.mjs` uses, and for the same reason.
 *
 * D7 (Astra 140126) — the state now tells the TRUTH:
 *   - `loaded` flips only when the import FULFILS. An in-flight or failed load
 *     reports isLoaded() === false, which is what those states mean.
 *   - a rejection CLEARS `pending`, so the next call is a fresh attempt. The
 *     old code kept the rejected promise cached forever — the failure was
 *     reported as success and no short-of-reload recovery existed.
 * Callers keep their own rejection (the first one propagates unchanged); what
 * changes is that a LATER caller gets a new attempt instead of the same corpse.
 */
export function loadConstellationChunk(): Promise<unknown> {
  if (pending) return pending;
  pending = import('./constellation-three.js')
    .then((m) => { loaded = true; return m; })
    .catch((e) => { pending = null; throw e; });
  return pending;
}

/**
 * Run `fn` when the browser is idle, or after a bounded delay if `rIC` is absent.
 *
 * `requestIdleCallback` is not in Safari, so the fallback is a real requirement
 * rather than defensive padding. The timeout bounds the wait for a browser that
 * has `rIC` but never goes idle, which is what keeps item 2 ("idle after the
 * first successful poll") from becoming "never" on a busy machine.
 */
export function onIdle(fn: () => void, timeoutMs = 2000): () => void {
  if (typeof window === 'undefined') return () => {};
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (h: number) => void;
  };
  if (typeof w.requestIdleCallback === 'function') {
    const h = w.requestIdleCallback(fn, { timeout: timeoutMs });
    return () => w.cancelIdleCallback && w.cancelIdleCallback(h);
  }
  const h = setTimeout(fn, Math.min(timeoutMs, 200));
  return () => clearTimeout(h);
}
