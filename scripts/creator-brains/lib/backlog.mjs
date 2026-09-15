#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/backlog.mjs
 * PURPOSE: What is still owed, how old it is, and when it will be done — the
 *          operator's answer to "is this keeping up?"
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR23)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHAT THE REVIEW FOUND (HR23):
 *   "Provide operator-visible backlog age, oldest pending/newest processed,
 *    expected completion at the actual cadence and retry exhaustion/repair
 *    actions."
 *
 *   The engine could say how many videos it had (coverage %) and nothing about
 *   the QUEUE. "4,000 videos takes roughly 200 daily runs" was the reviewer's own
 *   arithmetic, done from the outside because the engine would not do it. A
 *   backlog number with no AGE and no PROJECTION cannot answer the only question
 *   that matters: is this install falling behind, and by how much?
 *
 * THE PROJECTION IS DELIBERATELY PESSIMISTIC AND LABELLED AS ARITHMETIC:
 *   readiness ÷ (cap × runs per day) is not a prediction — retries, failures and
 *   a tripped throttle all make it worse, never better, and nothing in this file
 *   reads a clock it was not given. It is stated as an estimate at the cadence
 *   the operator says they run, so a wrong cadence produces a visibly wrong
 *   estimate rather than a silent one.
 *
 * WHY EXHAUSTION IS REPORTED SEPARATELY FROM WAITING:
 *   A transient failure that will be retried after its backoff is normal. A row
 *   at the attempt ceiling is one failure away from being TERMINAL, which is a
 *   decision point, and it must not be buried in the same number.
 *
 * @module creator-brains/backlog
 */

import { STATES, shouldAttempt, MAX_ATTEMPTS } from './fsm.mjs';
import { publishedMs } from './schedule.mjs';
import { DAY_MS } from './paths.mjs';

/** The documented cadence: the daily job, once a day. Hourly runs are NOT
 *  registered anywhere, so assuming more than one would overstate progress. */
export const DEFAULT_RUNS_PER_DAY = 1;

/** A video normally costs a probe and a fetch. Used only for the estimate. */
export const OPS_PER_VIDEO = 2;

const ageDays = (ms, now) => (ms === null ? null : Math.floor((now - ms) / DAY_MS));

function describeAt(ms) {
  return ms === null ? null : new Date(ms).toISOString().slice(0, 10);
}

/**
 * Summarize the queue. Pure: it reads the state map and the clock it is given.
 *
 * Returns counts, ages and a projection. Every field is present even when empty,
 * so a caller never has to branch to render a full report.
 */
export function backlogReport({
  state, perHour = 60, runsPerDay = DEFAULT_RUNS_PER_DAY, now = Date.now(),
} = {}) {
  const videos = Object.values((state && state.videos) || {});
  const ready = [];
  const waiting = [];
  const exhausted = [];
  let newestProcessed = null;
  let oldestReady = null;

  for (const v of videos) {
    if (v.state === STATES.FETCHED) {
      const at = publishedMs(v.updatedAt) ?? publishedMs(v.fetchedAt);
      if (at !== null && (newestProcessed === null || at > newestProcessed)) newestProcessed = at;
      continue;
    }
    if ((v.attempts || 0) >= MAX_ATTEMPTS) exhausted.push(v);
    const { work } = shouldAttempt(v, { now });
    if (work) {
      ready.push(v);
      // Age is the PUBLISH date when we know it: a three-year-old upload that we
      // only discovered yesterday is still three years of missing coverage.
      const at = publishedMs(v.publishedAt) ?? publishedMs(v.discoveredAt);
      if (at !== null && (oldestReady === null || at < oldestReady)) oldestReady = at;
    } else {
      waiting.push(v);
    }
  }

  const perDay = Math.max(1, Math.floor(perHour * Math.max(1, runsPerDay)));
  const estimatedOps = ready.length * OPS_PER_VIDEO;
  return {
    tracked: videos.length,
    ready: ready.length,
    waiting: waiting.length,
    exhausted: exhausted.length,
    exhaustedIds: exhausted.slice(0, 5).map((v) => v.videoId),
    oldestReadyAt: describeAt(oldestReady),
    oldestReadyDays: ageDays(oldestReady, now),
    newestProcessedAt: describeAt(newestProcessed),
    newestProcessedDays: ageDays(newestProcessed, now),
    estimatedOps,
    perDay,
    runsPerDay: Math.max(1, runsPerDay),
    perHour,
    estimatedDays: ready.length === 0 ? 0 : Math.ceil(estimatedOps / perDay),
    now,
  };
}

/**
 * The report as lines for a terminal. Kept next to the arithmetic so the two
 * cannot drift, and always at least one line — an ABSENT backlog line and a
 * zero backlog must not look the same.
 */
export function formatBacklog(report) {
  const r = report;
  if (!r.tracked) {
    return ['backlog:    nothing ready — no videos are tracked yet'];
  }
  const lines = [
    `backlog:    ${r.ready} ready · ${r.waiting} waiting on backoff or a retry window`
      + ` · ${r.tracked} tracked`,
  ];
  if (r.ready === 0) {
    lines.push('            oldest ready: nothing queued — every tracked video is fetched or parked');
  } else {
    lines.push(`            oldest ready: ${r.oldestReadyAt} (${r.oldestReadyDays}d old)`
      + ` · newest processed: ${r.newestProcessedAt
        ? `${r.newestProcessedAt} (${r.newestProcessedDays}d ago)` : 'never'}`);
    lines.push(`            projection: ~${r.estimatedOps} transport ops ÷ ${r.perHour}/hour `
      + `= ${Math.ceil(r.estimatedOps / Math.max(1, r.perHour))} hourly runs; at ${r.runsPerDay} run/day `
      + `≈ ${r.estimatedDays} day(s) to clear (arithmetic at the stated cadence, not a promise)`);
  }
  lines.push(r.exhausted
    ? `            exhausted: ${r.exhausted} row(s) at the ${MAX_ATTEMPTS}-attempt ceiling — the NEXT failure is`
      + ` terminal (${r.exhaustedIds.join(', ')}${r.exhausted > 5 ? ', …' : ''}); repair: `
      + 'cli.mjs fetch --retry forces one more attempt, and cli.mjs throttle --clear resumes after a 429'
    : `            exhausted: none at the ${MAX_ATTEMPTS}-attempt ceiling`);
  return lines;
}
