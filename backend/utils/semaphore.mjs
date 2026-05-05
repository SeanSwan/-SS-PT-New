/**
 * semaphore.mjs
 * ==============
 * Tiny in-process counting semaphore. Used by the PLAUD Applaud webhook
 * controller (Phase 5 Slice 5.4) to cap concurrent webhook ingests at
 * `PLAUD_APPLAUD_MAX_CONCURRENCY` (default 5) per Codex CR-6.
 *
 * Why we need it: synchronous audio fetch in the webhook handler can
 * block for up to 30s on a slow upstream. Without a concurrency cap,
 * a hostile or runaway Applaud could exhaust Render's worker pool by
 * sending 60 simultaneous requests (60 RPM rate limit) — each blocking
 * its handler for 30s. Semaphore bounds the in-flight count.
 *
 * API:
 *   const sem = new Semaphore(5);
 *   const release = await sem.tryAcquire();
 *   if (!release) {
 *     return jsonError(res, 429, 'WEBHOOK_CONCURRENCY_LIMIT', '...');
 *   }
 *   try { ... } finally { release(); }
 *
 * tryAcquire returns null when at capacity (caller must respond 429),
 * or a release function when a slot was acquired. The release function
 * is idempotent — calling it twice is a no-op.
 */
export class Semaphore {
  constructor(maxConcurrent) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new Error('Semaphore: maxConcurrent must be a positive integer');
    }
    this._max = maxConcurrent;
    this._inFlight = 0;
  }

  /**
   * Non-blocking acquire. Returns a release function on success, or null
   * if at capacity. Callers MUST handle the null case (return 429).
   */
  tryAcquire() {
    if (this._inFlight >= this._max) {
      return null;
    }
    this._inFlight += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this._inFlight -= 1;
    };
  }

  /** Current in-flight count. Exposed for tests + telemetry. */
  get inFlight() {
    return this._inFlight;
  }

  /** Configured max. */
  get max() {
    return this._max;
  }
}
