/**
 * composeGpu.mjs — when the card is ours, and when it goes back.
 *
 * Split out of composeGuards, which had become a grab-bag: refusals about the REQUEST and
 * rules about the HARDWARE are different concerns and drifted into one file because both
 * were "guards".
 *
 * The rule here has exactly two ways to be wrong and they are opposite — release on the
 * WAIT and two batches share a card; release only on the WORK and a hung render holds it
 * forever. Both mistakes were made in this review, an hour apart, on two lanes. One
 * function is the only reason a third cannot happen.
 */

/**
 * Give the GPU back when the WORK stops — never when the WAIT stops.
 *
 * `Promise.race([watchdog, work])` ends the wait. The work keeps running, and it is the
 * work that owns the card, so releasing on the watchdog hands the GPU to a new batch
 * while the old render is still mid-frame.
 *
 * Waiting unconditionally is the opposite mistake: a genuinely HUNG render would hold the
 * card forever, which is the exact failure the watchdog exists to end. So this waits for
 * the work, bounded by a grace — a render that has not finished within it is not going to.
 *
 * It lives here, called by BOTH lanes, because the async lane got this right first and the
 * sync watchdog added later reproduced the original bug within the hour. Two copies of a
 * subtle release rule is how that happens; one function is how it stops.
 */
/**
 * How long to keep holding the card after the wait has been abandoned.
 *
 * This is NOT the watchdog. The watchdog bounds how long we WAIT for a batch; this bounds
 * how long we keep the card after deciding the batch is lost. The two were the same value
 * for one round and a reviewer caught what that costs: the call sites passed `watchdogMs`
 * into `graceMs`, and the clamp below silently turned 20 minutes into 30 seconds — so the
 * card was released 30s after the watchdog fired whether or not a frame was still on it.
 *
 * The basis is ONE FRAME, not a whole batch. The runner checks its abort flag between
 * frames, so once abandoned the loop exits after at most the frame already in flight —
 * ~27s on the 5090. 90s is that with room for a heavier model or a slower card.
 */
export const GPU_RELEASE_GRACE_MS = 90_000;

/**
 * Give the GPU back when the WORK stops — never when the WAIT stops.
 *
 * `Promise.race([watchdog, work])` ends the wait. The work keeps running, and it is the
 * work that owns the card, so releasing on the watchdog hands the GPU to a new batch
 * while the old render is still mid-frame.
 *
 * Waiting unconditionally is the opposite mistake: a genuinely HUNG render would hold the
 * card forever, which is the exact failure the watchdog exists to end. So this waits for
 * the work, bounded by a grace — a render that has not finished within one frame's worth
 * of grace, after already being abandoned, is not going to.
 *
 * It lives here, called by BOTH lanes, because the async lane got this right first and the
 * sync watchdog added later reproduced the original bug within the hour. Two copies of a
 * subtle release rule is how that happens; one function is how it stops.
 */
export function releaseWhenSettled(reservation, work, graceMs) {
  if (!reservation) return;
  // A release that throws must not take the process with it. Both call paths below are a
  // timer callback and a `.finally` — an exception in either is an uncaught exception or
  // an unhandled rejection, and Node exits on both. Losing one card is survivable; losing
  // the process mid-render is not.
  const releaseOnce = (() => {
    let released = false;
    return () => {
      if (released) return;
      released = true;
      try { reservation.release(); } catch { /* the card is lost, the process is not */ }
    };
  })();
  if (!work || typeof work.then !== 'function') { releaseOnce(); return; }
  const grace = Math.max(50, Number(graceMs) > 0 ? Number(graceMs) : GPU_RELEASE_GRACE_MS);
  const timer = setTimeout(releaseOnce, grace);
  if (typeof timer.unref === 'function') timer.unref();
  work.catch(() => {}).finally(() => { clearTimeout(timer); releaseOnce(); });
}

/** The synchronous local path's watchdog. Same bound as the batch runner's, and the same
 *  reason: a render that hangs must not hold the card — or, here, the request — forever. */
const SYNC_WATCHDOG_MS = 20 * 60 * 1000;
export function syncWatchdog(ms = SYNC_WATCHDOG_MS) {
  return new Promise((_, rej) => {
    const t = setTimeout(() => rej(Object.assign(
      new Error(`The render did not finish within ${Math.round((ms || SYNC_WATCHDOG_MS) / 60000)} minutes and was abandoned.`),
      { code: 'E_BATCH_TIMEOUT' },
    )), ms || SYNC_WATCHDOG_MS);
    if (typeof t.unref === 'function') t.unref();
  });
}
