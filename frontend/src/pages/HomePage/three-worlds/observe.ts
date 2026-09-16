/**
 * observe — host observation: size, scroll progress and pointer position.
 * @module pages/HomePage/three-worlds/observe
 *
 * WHY THIS IS SEPARATE FROM THE RUNTIME
 * Rule 4 caps files at 300 lines, and these three concerns share nothing with
 * renderer lifecycle except that they feed it. Keeping them here also makes the two
 * bugs a hostile review found in this area individually testable.
 *
 * BUG 1 — NO ResizeObserver (fixed here).
 * The runtime only listened to `window.resize`. A host whose box changes without the
 * window changing — fonts settling, a lazy image arriving, a grid reflowing, a card
 * expanding — kept its ORIGINAL drawing buffer, which the CSS then stretched. The
 * `Math.max(1, …)` clamp meant a host measured at zero area (common on first paint)
 * stayed a 1x1 buffer indefinitely: still drawing, still counting frames, still
 * producing a "unique" screenshot. A ResizeObserver is the correct instrument.
 *
 * BUG 2 — scroll progress was degenerate on short hosts (fixed here).
 * The old divisor was `rect.height - window.innerHeight`. For a host SHORTER than
 * the viewport — every card in the gallery — that is negative, the clamp forced it
 * to 1, and progress snapped 0 -> 1 the moment the host's top crossed -1px. Every
 * scene's `dolly` line multiplies this value, so all 20 variants toggled between two
 * camera positions instead of scrubbing.
 */

/** Mutable host-derived values the render loop reads each frame. */
export interface Observed {
  /** Scroll progress through the host, 0 -> 1. */
  progress: number;
  /** Normalized pointer inside the host, -1 -> 1 on both axes. */
  pointer: { x: number; y: number };
}

/**
 * Scroll progress for a host box, 0 -> 1. Pure, so it is testable without a DOM.
 *
 * THE ANCHOR IS WHERE PROGRESS REACHES ZERO, NOT AN OFFSET.
 * A first version computed `viewportHeight * 0.85 - rect.top` and called 0.85 an
 * "anchor", which was wrong in the universal case: a served front page has its host
 * at `rect.top = 0` on load, so progress started at **0.85** and the camera opened
 * 85% of the way through its dolly. Worse, progress reached 1 after only 15% of a
 * viewport of scrolling, so the entire authored camera move finished almost
 * immediately. Two hostile reviewers caught this independently; the builder's own
 * test had pinned the wrong behaviour by asserting `p(0.85*vh) == 0` and never
 * testing `p(0)`.
 *
 * The correct model, and the reason three earlier attempts each got one case wrong,
 * is that there are TWO kinds of host and each needs its own zero point:
 *
 *   'load'   — the served front page: its host sits at rect.top = 0 on load, and the
 *              camera must open on its authored pose, not mid-dolly.
 *              zero point: top = 0; span: the host height (floored at a viewport).
 *              100vh hero -> 0 at load, 0.5 after half a screen, 1 after one screen.
 *
 *   'travel' — a host the reader scrolls TO (every variant below the first on the
 *              gallery, any section mid-page). Under the load rule such a host sat at
 *              progress 0 for its ENTIRE approach — the round-3 dispute: Fable called
 *              it "at progress 0 for its whole readable life" and was right; the load
 *              rule was hero-specific but had been applied universally.
 *              zero point: the host's top entering the viewport bottom; span: the
 *              viewport plus the host height, so 0 at entry and 1 at full exit.
 *              40vh band -> 0 entering, 1 as it leaves the top of the screen.
 *
 * The span for 'load' is the host's own height because that is what `dolly` is
 * authored against. Deriving it from the viewport instead made a short hero finish at
 * its midpoint, and a span longer than the host made it never finish at all.
 */
export type ScrollAnchor = 'load' | 'travel';

/**
 * Hosts at or above this document offset count as "the page opens here" hosts.
 * Two pixels of tolerance absorbs sub-pixel layout jitter without misclassifying
 * a genuinely below-the-fold section.
 */
export const LOAD_ANCHOR_EPSILON_PX = 2;

/**
 * Classify a host by its document offset, once at attach time.
 * `docTop` is the host's document-space top (rect.top + scrollY), NOT rect.top —
 * it must be scroll-invariant or a reload mid-page would flip a hero's anchor.
 */
export function scrollAnchorFor(docTop: number): ScrollAnchor {
  return Math.abs(Number.isFinite(docTop) ? docTop : 0) <= LOAD_ANCHOR_EPSILON_PX ? 'load' : 'travel';
}

export function scrollProgressFor(
  rect: { top: number; height: number },
  viewportHeight: number,
  anchor: ScrollAnchor = 'load',
): number {
  const vh = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 1;
  const top = Number.isFinite(rect.top) ? rect.top : 0;
  const height = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : 0;

  if (anchor === 'travel') {
    // 0 when the host's top enters at the viewport bottom, 1 when its bottom leaves
    // the viewport top — the host's whole readable life, not just its exit.
    const span = Math.max(1, vh + height);
    const p = (vh - top) / span;
    return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
  }

  // Below the fold, or exactly at load, there is no progress yet.
  if (top >= 0) return 0;

  // The span is the host's OWN height, floored at 1px. Deriving it from the viewport
  // instead made a hero shorter than the screen finish its dolly half way out, and
  // anchoring it longer made the dolly never finish — both caught in hostile review.
  const span = Math.max(1, height || vh);
  const p = -top / span;
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
}

/** Normalized pointer position inside a host box. Pure. */
export function pointerFor(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  return {
    x: ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
    y: ((clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1,
  };
}

export interface ObserveHandle {
  /** Force a re-read of size and progress; used after a context restore. */
  refresh: () => void;
  disconnect: () => void;
}

/**
 * Attach the host observers.
 * @param host element whose box drives size, scroll progress and pointer
 * @param observed mutable object the render loop reads
 * @param onResize called whenever the host's box changes, including the first
 *   measurement and any layout shift
 */
export function observeHost(
  host: HTMLElement,
  observed: Observed,
  onResize: () => void,
): ObserveHandle {
  // The anchor is a property of WHERE the host sits in the document, so it is
  // decided ONCE, from the scroll-invariant document offset. Deciding it per
  // read would flip a hero to 'travel' the moment the reader scrolled.
  const anchor = scrollAnchorFor(host.getBoundingClientRect().top + (window.scrollY ?? 0));
  const readProgress = () => {
    const rect = host.getBoundingClientRect();
    observed.progress = scrollProgressFor(rect, window.innerHeight, anchor);
  };
  const onPointer = (e: PointerEvent) => {
    observed.pointer = pointerFor(e.clientX, e.clientY, host.getBoundingClientRect());
  };

  // ResizeObserver is the missing instrument: it fires on layout shifts that never
  // touch the window, which is exactly how a stale 1x1 buffer survived before.
  const ro = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => { onResize(); readProgress(); })
    : null;
  ro?.observe(host);

  window.addEventListener('scroll', readProgress, { passive: true });
  window.addEventListener('resize', onResize);
  host.addEventListener('pointermove', onPointer, { passive: true });

  readProgress();

  return {
    refresh: () => { onResize(); readProgress(); },
    disconnect: () => {
      ro?.disconnect();
      window.removeEventListener('scroll', readProgress);
      window.removeEventListener('resize', onResize);
      host.removeEventListener('pointermove', onPointer);
    },
  };
}
