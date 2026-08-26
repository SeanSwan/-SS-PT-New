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
export function releaseWhenSettled(reservation, work, graceMs) {
  if (!reservation) return;
  if (!work || typeof work.then !== 'function') { reservation.release(); return; }
  const grace = Math.min(30_000, Math.max(250, Number(graceMs) || 30_000));
  let released = false;
  const release = () => { if (!released) { released = true; reservation.release(); } };
  const timer = setTimeout(release, grace);
  if (typeof timer.unref === 'function') timer.unref();
  work.catch(() => {}).finally(() => { clearTimeout(timer); release(); });
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
