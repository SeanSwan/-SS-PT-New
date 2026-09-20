/**
 * ============================================================================
 * FILE: packages/creator-brains-console/lib/health.mjs
 * PURPOSE: The bridge's read-time cache for the engine's BLOCKING health probe,
 *          and the honest fallback when a fresh probe cannot be taken.
 * PART OF: Creator Brains Console (blueprint 05 §1, §3; perf budget 02 §6)
 * SLICE: S0
 * ============================================================================
 *
 * WHY THIS FILE EXISTS — a measured defect, not a guess.
 *
 * The engine's health reading is `selfCheck()` in `lib/ytdlp.mjs`. It shells out
 * to `yt-dlp --version`, and on Sean's machine that costs 1.7-3.4 SECONDS
 * (measured 2026-09-17: 3439 ms cold, 1809/1742 ms warm). The CLI pays that once
 * per invocation, which is fine — a human ran `status` and waits.
 *
 * The console does not pay it once. It pays it PER REQUEST, and from slice S4 the
 * RunConsole polls `/api/status` every 2 seconds while a run is active:
 *
 *   * every poll would block the bridge's only thread for ~2s, so the console
 *     would stutter and the p95 ≤ 50 ms budget in blueprint 02 §6 is impossible;
 *   * every poll would spawn a Python process, so a single daily pass would
 *     start ~900 yt-dlp processes to answer a question whose answer changes
 *     when Sean upgrades a tool — i.e. rarely, and never mid-poll.
 *
 * That is a design defect the bridge introduced by composing a blocking engine
 * function on a hot path. The fix is NOT to stop calling the engine (the
 * compose-don't-reimplement doctrine stands) and NOT to touch the engine (S0's
 * no-go boundary). It is to call the engine ONCE per TTL and serve the cached
 * answer in between.
 *
 * THE SHAPE OF THE CACHE, AND WHY IT IS NOT A LIE.
 *
 * A cached health value is only honest if the reader can tell it is cached. So
 * the payload always carries:
 *
 *   `ok` / `version` / `reason`   the engine's own verdict, verbatim
 *   `checkedAt`                   when that verdict was actually taken
 *   `ageMs`                       how old it is at read time
 *   `source`                      'probe' (live) or 'history' (from the store)
 *   `stale`                       true once the TTL has passed
 *
 * `stale: true` is the console's cue to render an age ("checked 4 min ago"),
 * which is strictly more informative than the CLI's unlabelled instant reading.
 *
 * WHAT HAPPENS WHEN A PROBE CANNOT BE TAKEN. `selfCheck()` can return
 * `{ok:false, reason:'yt-dlp not resolvable'}` — including transiently, e.g. a
 * spawned process refused by a confined environment. A console that renders
 * "MISSING" the moment the last-good reading ages out would be crying wolf about
 * a healthy install. So on a FAILED probe we prefer the engine's own last
 * recorded canary result from the store (`canary.json` via `readCanary`, which
 * the daily pass appends to) and label it `source: 'history'` with its real
 * timestamp. If there is no history either, we say so plainly rather than
 * inventing a date.
 *
 * The `note` field states which of these happened, in the operator's language.
 *
 * @module creator-brains-console/lib/health
 */

import { readCanary } from '../../../scripts/creator-brains/lib/store.mjs';
import { cacheKey, clearCaches, getCached, putCached } from './health-cache.mjs';
import { requestProbe, resetProbeChannel, takeProbe } from './health-probe.mjs';

/**
 * How long a taken probe is served before another is allowed.
 *
 * 60 s is chosen against the two real cadences: the S4 RunConsole polls every
 * ~2 s (so a probe runs ~30× less often), and a human watching the badge sees it
 * refresh inside a minute. It is deliberately NOT infinite — "restart the
 * console to re-check yt-dlp" is a worse answer than waiting a minute.
 */
export const PROBE_TTL_MS = 60_000;

/**
 * Test seam and reset: forget every root's reading AND close the probe channel.
 * The cache is KEYED BY CANONICAL STORE ROOT (R2-04) — see `./health-cache.mjs`,
 * which was extracted rather than grown here because this file sits against the
 * repo's 300-line cap.
 */
export function resetHealthCache() {
  clearCaches();
  resetProbeChannel();
}

/**
 * Take the engine's health reading, at most once per `ttlMs`.
 *
 * @param {object}  [opts]
 * THE WINDOW IS MEASURED FROM THE LAST PROBE, NOT FROM THE LAST READ.
 *
 * These two are easy to confuse and the difference is the whole safety property:
 *
 *   window from the LAST READ  → a poll that runs every 2 s NEVER expires the
 *     cache, so the console would serve one reading from boot for the lifetime
 *     of the process. That is not a cache, it is a lie with a timer on it.
 *   window from the LAST PROBE  → a value lives at most `2 × TTL` under
 *     continuous reads regardless of how often anyone asks, so the console
 *     re-checks yt-dlp at least once a minute no matter how hard it is polled.
 *
 * The implementation enforces the second by refreshing `atMs` on every probe and
 * comparing against it, which is why a read 90 s after the first probe can still
 * be served from a probe taken at 40 s — 50 s of elapsed window, not 90.
 *
 * @param {number}  [opts.ttlMs]  override the TTL (tests use 0 to force a probe)
 * @param {number}  [opts.now]    injectable clock
 * @param {string}  [opts.r]      store root, for the history fallback
 * @param {Function}[opts.probe]  injectable `selfCheck`. WHEN OMITTED — the
 *                                production path — the probe runs OFF THIS
 *                                THREAD (A1-10); see the note on `fresh` below.
 * @returns {{ok:boolean,version:string|null,reason:string,checkedAt:string|null,
 *            ageMs:number|null,source:'probe'|'history'|'unknown',stale:boolean,note:string}}
 */
export function healthReading({
  ttlMs = PROBE_TTL_MS, now = Date.now(), r = null, probe = null,
} = {}) {
  // THE CACHE IS PER STORE ROOT (R2-04). The history fallback reads `r`'s canary,
  // so an answer is only an answer FOR THAT ROOT.
  const key = cacheKey(r);

  // COLLECT FIRST (A1-10). An off-thread result arrives asynchronously, so the
  // only moment it can enter the cache is at the top of a read. Doing this
  // BEFORE the cache check means a result that landed since the last read is
  // visible on this read, rather than after the TTL expires — otherwise a probe
  // finishing 100 ms after a cold read would stay invisible for a full minute.
  if (!probe) collect(key, r, now);

  // `cache.probeAtMs` is the moment of the LAST PROBE — the property documented
  // above depends on never writing a read time into it.
  //
  // NOTE THE TWO CLOCKS. `probeAtMs` answers "when may we probe again?" while
  // `checkedAtMs` answers "how old is the value we are showing?". They differ on
  // purpose: after a failed probe we serve store history, whose age is however
  // old that record is, while still refusing to re-probe until the TTL passes.
  // Collapsing them was the defect — see the FAILURE-CACHING note below.
  const held = getCached(key);
  const cached = held && (now - held.probeAtMs) < ttlMs ? held : null;
  if (cached) return shape(cached, now, ttlMs);

  // THE PRODUCTION PROBE DOES NOT RUN HERE (A1-10). `selfCheck()` shells out via
  // `execFileSync` with a 60 s timeout, so calling it inline freezes the whole
  // bridge: MEASURED 2026-09-20, a cold /api/status took 1709 ms of which
  // 1699 ms was the event loop being blocked. When no `probe` is injected we
  // START one on a worker and answer from what we already have. An injected
  // `probe` is a plain stub, so it is still called inline and every unit test
  // keeps its exact semantics.
  const fresh = probe ? probe() : startOffThread(now);

  // A probe that could not run is a weak answer. Prefer the engine's own last
  // recorded canary over an alarming "not resolvable" that may be transient.
  const history = !fresh.ok && r ? lastCanary(r) : null;

  // FAILURE-CACHING DEFECT (found 2026-09-18, hostile round 2). The first
  // version cached the RAW PROBE before consulting history, so a failed probe
  // was the answer for the whole TTL and the history fallback fired on exactly
  // one read. The fix is to cache the RESOLVED answer — history and failure are
  // both legitimate readings, and what must be stable is which one we show for
  // the window. `compose` is that resolution, written once for both callers.
  const entry = compose(fresh, history, now);
  putCached(key, entry);
  return shape(entry, now, ttlMs);
}

/**
 * Resolve a probe result and the history fallback into ONE cache entry.
 *
 * ONE COPY, TWO CALLERS. The inline path and the off-thread path each used to
 * carry their own copy of this decision, with a comment promising they agreed —
 * and two copies of a rule is exactly how the copies drift. That is the hazard
 * R2-01 found in a contract restated across three files, so the resolution is
 * written once and both callers share it. `atMs` is when the probe actually RAN
 * (the worker stamps it), falling back to the read time for an injected stub.
 */
function compose(fresh, history, now) {
  if (history) {
    return {
      probeAtMs: now,
      checkedAtMs: Date.parse(history.ts),
      value: history.check,
      source: 'history',
      note: 'live probe did not resolve yt-dlp — showing the last recorded canary result instead',
    };
  }
  // A STARTED-BUT-UNFINISHED PROBE IS NOT A VERDICT. Reporting it as
  // `source:'probe'` would present "we have not checked yet" as a live reading —
  // the same class of lie as the failure-caching defect, and the reason
  // `unknown` is a first-class source rather than an absence.
  if (fresh.pending) {
    return {
      probeAtMs: now, checkedAtMs: null, value: fresh, source: 'unknown', note: fresh.reason,
    };
  }
  return {
    probeAtMs: now,
    checkedAtMs: fresh.atMs ?? now,
    value: fresh,
    source: 'probe',
    note: fresh.ok ? null : 'live probe did not resolve yt-dlp',
  };
}

/**
 * Install an off-thread result, if one has arrived since the last read.
 *
 * It resolves through `compose` for the reason stated there: the reading must
 * not depend on which thread the probe happened to run on.
 */
function collect(key, r, now) {
  const done = takeProbe(now);
  if (!done) return;
  const fresh = { ...done.value, atMs: done.atMs };
  const history = !fresh.ok && r ? lastCanary(r) : null;
  putCached(key, compose(fresh, history, now));
}

/**
 * Start the production probe on the worker, and describe the wait honestly.
 *
 * `pending: true` is what marks this as "no verdict yet" rather than a failure.
 * The two reasons differ because they are different facts: the first read starts
 * the probe, a later read inside the TTL finds one already running.
 */
function startOffThread(now) {
  const started = requestProbe();
  // A WORKER THAT COULD NOT START IS A READING ON THIS READ (R2-04), not the
  // next one. A `false` because a probe is genuinely in flight leaves `takeProbe`
  // returning null, so the pending description below still wins.
  const failed = started ? null : takeProbe(now);
  if (failed) return { ...failed.value, atMs: failed.atMs };
  return {
    ok: false,
    version: null,
    reason: started
      ? 'the yt-dlp probe has been started off-thread; this reading predates its result'
      : 'the yt-dlp probe is still running off-thread; this reading predates its result',
    pending: true,
    atMs: now,
  };
}

/** The engine's most recent canary entry, mapped into a health-shaped verdict. */
function lastCanary(r) {
  let entries;
  try {
    entries = readCanary(r);
  } catch {
    return null; // a damaged canary file must not take down the status board
  }
  if (!Array.isArray(entries) || !entries.length) return null;
  const last = entries[entries.length - 1];
  if (!last || !last.ts) return null;
  return {
    ts: last.ts,
    // NOTE THE HONEST LIMIT: the canary record proves a probe+fetch SUCCEEDED at
    // that time, so `ok` is trustworthy — but it is a canary result, not a
    // `--version` reading, so `version` is genuinely unknown here. Reporting the
    // canary's cue count instead of a fabricated version string.
    check: {
      ok: last.ok === true,
      version: null,
      reason: last.ok === true
        ? `last canary ok (${last.cues ?? 0} cues, ${last.lang || 'unknown lang'})`
        : `last canary failed: ${last.error || 'no reason recorded'}`,
    },
  };
}

/**
 * Render a cache entry as the public reading.
 *
 * `ttlMs` is threaded through rather than reading PROBE_TTL_MS directly: the
 * previous version compared the cache window against an injected `ttlMs` but
 * computed `stale` against the module constant, so a test (or any caller) that
 * overrode the TTL got a window and a staleness flag that disagreed.
 */
function shape(entry, now, ttlMs = PROBE_TTL_MS) {
  const ageMs = Number.isFinite(entry.checkedAtMs) ? Math.max(0, now - entry.checkedAtMs) : null;
  return {
    ok: entry.value.ok === true,
    version: entry.value.version ?? null,
    reason: entry.value.reason || '',
    checkedAt: Number.isFinite(entry.checkedAtMs) ? new Date(entry.checkedAtMs).toISOString() : null,
    ageMs,
    source: entry.source,
    // A history reading is always stale-by-definition: it is not a live verdict
    // and must never be presented as one, however recent the record happens to be.
    stale: entry.source === 'history' ? true : ageMs === null ? true : ageMs > ttlMs,
    note: entry.note ?? null,
  };
}
