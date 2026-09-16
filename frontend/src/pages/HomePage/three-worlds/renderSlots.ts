/**
 * renderSlots — a hard cap on live WebGL contexts per document.
 * @module pages/HomePage/three-worlds/renderSlots
 *
 * THE PROBLEM THIS SOLVES IS ARITHMETIC, NOT A MYSTERY
 * Browsers cap live WebGL contexts (roughly 8–16 in Chrome) and silently evict the
 * oldest, firing `webglcontextlost` on whatever held it. Once a context is lost,
 * `getActiveUniform` can return null and Three's `parseUniform` dereferences it —
 * which is the exact crash this workstream spent two rounds attributing to the
 * software renderer before a reviewer pointed out that a page wanting 20 co-mounted
 * variants plus a probe is simply above the cap by construction.
 *
 * A previous fix stopped the LEAK (the probe released its context, cleanup called
 * `forceContextLoss`) but left the DEMAND unbounded. Releasing contexts you no longer
 * need does not help if you need more than exist at once.
 *
 * THE POLICY: at most `MAX_LIVE_WORLDS` worlds render simultaneously. A world that
 * cannot get a slot shows its committed poster instead — which is already built and
 * already the reduced-motion path, so nothing new is required of a variant. Off-screen
 * worlds release their slot for the ones on screen.
 *
 * The cap is deliberately well under the browser limit rather than at it: leaving
 * headroom means the page degrades by choosing WHICH world is live instead of being
 * told by the browser which one just died.
 */

/** Maximum simultaneously live WebGL worlds per document. */
export const MAX_LIVE_WORLDS = 4;

let inUse = 0;
const waiters = new Set<() => void>();

/** Subscribe to "a slot freed up". Returns an unsubscribe function. */
export function onSlotFreed(fn: () => void): () => void {
  waiters.add(fn);
  return () => waiters.delete(fn);
}

/** Try to take a slot. Returns false when the budget is full. */
export function acquireSlot(): boolean {
  if (inUse >= MAX_LIVE_WORLDS) return false;
  inUse += 1;
  publishSlotStats();
  return true;
}

/** Release a slot and wake anyone waiting for one. */
export function releaseSlot(): void {
  if (inUse > 0) inUse -= 1;
  publishSlotStats();
  for (const fn of [...waiters]) {
    try {
      fn();
    } catch {
      /* a broken waiter must not block the others */
    }
  }
}

/** Diagnostics for QA: how many worlds are live right now, and the cap. */
export function slotStats(): { inUse: number; cap: number } {
  return { inUse, cap: MAX_LIVE_WORLDS };
}

/**
 * Publish the pool state on the document root so a verifier can assert the cap.
 *
 * Without this the budget is invisible: the page would simply render fewer live
 * canvases and nothing would distinguish "respecting the cap" from "most variants
 * happened to be off-screen".
 */
export function publishSlotStats(): void {
  if (typeof document === 'undefined' || !document.documentElement) return;
  document.documentElement.dataset.liveWorlds = String(inUse);
  document.documentElement.dataset.liveWorldCap = String(MAX_LIVE_WORLDS);
}

/** Test helper: reset the pool between cases. */
export function __resetSlots(): void {
  inUse = 0;
  waiters.clear();
}
