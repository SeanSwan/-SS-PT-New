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

/** Below this a grace cannot outlast even a trivial frame, so it would abandon live work. */
export const MIN_RELEASE_GRACE_MS = 50;

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
const defaultOnReleaseError = (err) => {
  console.error('[atelier] GPU reservation release FAILED — the card may be stranded:', err?.message || err);
};

export function releaseWhenSettled(reservation, work, graceMs, onReleaseError) {
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
      try { reservation.release(); } catch (err) {
        // NOT SILENT. A release that throws systematically strands one card per batch with
        // no signal at all, until the pool is empty and every request parks behind a
        // 20-minute watchdog. Swallowing the throw keeps the process alive, which is right;
        // swallowing the FACT is how the pool drains invisibly. Both seats said so.
        try { (onReleaseError || defaultOnReleaseError)(err); } catch { /* never twice */ }
      }
    };
  })();
  if (!work || typeof work.then !== 'function') { releaseOnce(); return; }
  // ONE REPAIR FOR BAD INPUT, AND IT IS NOT SILENT.
  //
  // The clamp here is the same instrument that hid the original bug — a wrong quantity
  // passed in and quietly accepted — so it does not get to be quiet a second time. The
  // previous shape repaired invalid input two different ways: NaN or negative fell to the
  // 90s default, while a small positive was clamped UP to 50ms, four orders of magnitude
  // under one frame. A reviewer pointed out that a clamp with no telemetry cannot tell
  // "tuned deliberately" from "misconfigured and hidden".
  //
  // So: anything not a usable duration takes the default, anything outside the sane band
  // is clamped AND SAID OUT LOUD, naming both numbers.
  const asked = Number(graceMs);
  let grace = Number.isFinite(asked) && asked > 0 ? asked : GPU_RELEASE_GRACE_MS;
  if (grace < MIN_RELEASE_GRACE_MS || grace > GPU_RELEASE_GRACE_MS) {
    const clamped = Math.min(GPU_RELEASE_GRACE_MS, Math.max(MIN_RELEASE_GRACE_MS, grace));
    console.warn(`[atelier] release grace ${grace}ms is outside ${MIN_RELEASE_GRACE_MS}-${GPU_RELEASE_GRACE_MS}ms; using ${clamped}ms`);
    grace = clamped;
  }
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
