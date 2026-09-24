/*
 * constellation-loop.ts — T-T2 / R10. The rAF controller, extracted so its STOP
 * CONDITIONS are testable without a WebGL context.
 *
 * ── WHY THIS IS NOT INSIDE THE COMPONENT ────────────────────────────────────
 *
 * T-T2 requires three separate stop conditions to hold and be provable:
 *
 *   "rAF controller: `document.hidden` → loop stops ≤1 frame; off-viewport
 *    (IntersectionObserver stub) → stops; remount → clean teardown (no leaked
 *    context)"
 *
 * A loop written inline in a React component can only be tested through jsdom
 * plus a mocked canvas, and jsdom has no rAF of its own — so the test would be
 * measuring the mock. Here the loop takes the clock and the rAF pair as
 * parameters, which is what lets the test drive it frame by frame and count
 * exactly how many frames elapsed after a stop condition.
 *
 * ── "STOPS ≤1 FRAME" IS THE CONTRACT, AND IT IS FAINTER THAN IT SOUNDS ──────
 *
 * A rAF callback that has ALREADY been queued when `document.hidden` flips will
 * still run. The honest guarantee is therefore "the next frame is the last one,
 * and nothing is queued after it" — hence `stopped` is set inside the callback
 * and the re-arm is skipped, rather than cancelling from outside and hoping the
 * cancel beat the queue. The test asserts a count, not a feeling.
 *
 * ── WHY `visible`, `motion` AND `webgl` ARE ALL INPUTS ──────────────────────
 *
 * They answer three different questions and are deliberately not collapsed:
 *   visible — is it on screen?      (IntersectionObserver; saves battery)
 *   motion  — may it animate?       (`prefers-reduced-motion`; accessibility)
 *   webgl   — can it render at all? (capability; a fallback path exists)
 *
 * A reduced-motion user gets a STATIC FRAME — one render, then stop — and never
 * the chunk at all (T-E3, `14 §3` item 3). Collapsing motion into `visible`
 * would animate for someone who asked us not to.
 */

export interface LoopDeps {
  /** `requestAnimationFrame`, injectable so tests drive frames synchronously. */
  requestFrame?: (cb: (t: number) => void) => number;
  cancelFrame?: (handle: number) => void;
  /** `document.hidden` at the moment of the frame. */
  isHidden?: () => boolean;
  /** `performance.now()`-alike. */
  now?: () => number;
}

export interface LoopHandle {
  /** Stop the loop. Idempotent; safe to call from an unmount. */
  stop: () => void;
  /** Frames actually rendered since start (the observable the tests assert). */
  frames: () => number;
  /** True once the loop has stopped and will not re-arm. */
  stopped: () => boolean;
  /** Pause/resume without tearing down — the viewport observer's lever. */
  setVisible: (visible: boolean) => void;
  /** Whether the loop is currently animating. */
  running: () => boolean;
}

export interface StartLoopOptions extends LoopDeps {
  /**
   * Called once per rendered frame with elapsed ms. Returns nothing; the caller
   * owns its own scene state, which keeps this module free of rendering.
   */
  onFrame: (elapsedMs: number) => void;
  /** Whether a static single frame is wanted instead of an animated loop. */
  reducedMotion?: boolean;
  /** Whether the element is in the viewport at start. */
  visible?: boolean;
}

/**
 * Start the animation loop.
 *
 * Returns a handle rather than a cancel function so a caller cannot forget the
 * frame counter, and so `remount → clean teardown` is assertable: after `stop()`
 * the frame count must not move again.
 */
export function startLoop(opts: StartLoopOptions): LoopHandle {
  // ONE CLOCK, DECLARED FIRST (D11, Astra 140126): the rAF-ABSENT fallback
  // used to timestamp frames with Date.now() while `last` was initialised from
  // `performance.now()` — an epoch-sized first delta that completed the entry
  // dolly instantly on any browser without rAF (Safari is the real population).
  const now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  const requestFrame = opts.requestFrame
    ?? (typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : ((cb) => setTimeout(() => cb(now()), 16) as unknown as number));
  const cancelFrame = opts.cancelFrame
    ?? (typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : ((h) => clearTimeout(h as unknown as ReturnType<typeof setTimeout>)));
  const isHidden = opts.isHidden ?? (() => typeof document !== 'undefined' && !!document.hidden);

  let handle: number | null = null;
  let frames = 0;
  let stopped = false;
  let visible = opts.visible !== false;
  let last = now();

  // A reduced-motion user gets exactly ONE frame: a static frame, not a loop.
  // `14 §3` item 3 — and the chunk is never even fetched for them, so this is the
  // belt to that braces.
  const staticOnly = opts.reducedMotion === true;

  const tick = (t: number) => {
    handle = null;
    if (stopped) return;

    // STOP CONDITION 1 — the tab is hidden. Checked at the TOP of the callback,
    // so the frame already in flight is the last one. See the header.
    if (isHidden()) { stopped = true; return; }

    // STOP CONDITION 2 — off-viewport. Same shape: stop, do not re-arm. A
    // `setVisible(true)` later restarts it, which is why this is not `stopped`.
    if (!visible) { stopped = false; return; }

    const elapsed = Math.max(0, t - last);
    last = t;
    frames += 1;
    opts.onFrame(elapsed);

    // STOP CONDITION 3 — reduced motion. One frame, then a terminal stop.
    if (staticOnly) { stopped = true; return; }

    handle = requestFrame(tick);
  };

  // Initial visibility is a START predicate, not a stop: an off-viewport element
  // should not pay for a first frame either.
  if (visible && !isHidden()) handle = requestFrame(tick);

  return {
    stop() {
      stopped = true;
      if (handle !== null) { cancelFrame(handle); handle = null; }
    },
    frames: () => frames,
    stopped: () => stopped,
    running: () => !stopped && visible && handle !== null,
    setVisible(next: boolean) {
      if (stopped) return;
      const was = visible;
      visible = next;
      // D3 (2026-09-22): HIDING CANCELS THE PENDING FRAME. Previously the
      // queued callback survived the flip, and setVisible(true) then armed a
      // second one — every hide/show flap left TWO independent re-arm chains,
      // multiplying until stop(). The pending tick's own `!visible` check only
      // stopped that tick from re-arming; it could not stop the resume from
      // creating a second chain, nor the stale tick from nulling the NEW
      // chain's handle (tick's first act is `handle = null`).
      if (was && !next && handle !== null) { cancelFrame(handle); handle = null; }
      // Resuming re-arms and resets the clock, so the first frame after a resume
      // reports a small elapsed rather than the whole time spent off-screen —
      // which would otherwise be one visible lurch on every scroll back.
      if (!was && next) { last = now(); handle = requestFrame(tick); }
    },
  };
}
