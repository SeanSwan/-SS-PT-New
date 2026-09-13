/**
 * Coach fact purge scheduler (G09-R1 / T35 residual)
 * ===================================================
 *
 * WHY THIS EXISTS. `forgetFact` (services/coachFactMemoryPolicy.mjs:41) stamps a
 * 24 h purge deadline (`purgeAfterAt`) and `purgeDueFacts` (:66) hard-destroys every
 * row whose deadline has passed — but until this file there was **no production
 * caller anywhere**. No route, worker or cron invoked it, so a user's "forget" was a
 * soft invalidation that kept the fact text in the database indefinitely. The policy
 * was complete and unit-tested; the promise was simply never kept.
 *
 * WHAT IT DOES. On a fixed interval it calls `purgeDueFacts` and logs the number of
 * rows destroyed. It destroys ONLY rows already marked forgotten whose deadline has
 * passed, so the blast radius is exactly the set a human explicitly asked to delete.
 *
 * KILL SWITCH, AND THE HONEST TRADEOFF. `ENABLE_COACH_FACT_PURGE=true` is required —
 * default OFF, matching every other scheduler in this repo (see
 * coachProactiveNudgeCron.mjs:67 and nutritionLogNudgeCron.mjs). The consequence must
 * be stated plainly rather than buried: **while the switch is off, the 24 h purge
 * still does not happen**, so this file removes the *code* gap, not the *operational*
 * one. Flipping the variable is an operator decision, and because this job destroys
 * rows it should be turned on only after the disposable-Postgres gate has actually
 * run (see the open-findings register section F1). Do not report G09-R1 as closed
 * merely because this file exists.
 *
 * PRIVACY. Only a count is ever logged. Fact text is user content and is never
 * written to logs (rule 8).
 *
 * Rule 4 note: kept well under the 300-line cap on purpose.
 */
import logger from '../utils/logger.mjs';
import { purgeDueFacts } from './coachFactMemoryPolicy.mjs';

const START_DELAY_MS = 90 * 1000;
/** Hourly. The deadline is 24 h, so an hourly sweep bounds lateness to ~1 h. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Master switch. OFF unless the process was explicitly switched on. */
export function isCoachFactPurgeEnabled(env = process.env) {
  return env.ENABLE_COACH_FACT_PURGE === 'true';
}

let tickInFlight = false;
let purgeInterval = null;
let purgeStartupTimeout = null;
let lastPurgeResult = null;

/**
 * One purge sweep. Injectable `now` and `purge` keep this testable without a clock
 * or a database. Never throws: a scheduler tick that rejects is a logged failure,
 * not an unhandled rejection that can take the process down.
 */
export async function runCoachFactPurgeTick({ now = new Date(), purge = purgeDueFacts } = {}) {
  if (tickInFlight) {
    logger.warn('[CoachFactPurge] tick skipped: a previous purge is still running');
    return { purged: 0, skipped: true };
  }
  tickInFlight = true;
  try {
    const result = await purge({ now });
    const purged = Number(result?.purged) || 0;
    lastPurgeResult = { purged, at: now instanceof Date ? now.toISOString() : String(now) };
    if (purged > 0) {
      // Count only. Fact text is user content and must never reach a log.
      logger.info(`[CoachFactPurge] destroyed ${purged} forgotten fact row(s) past the 24h deadline`);
    }
    return { purged, skipped: false };
  } catch (err) {
    logger.error(`[CoachFactPurge] tick failed: ${err?.message}`);
    return { purged: 0, error: err?.message };
  } finally {
    tickInFlight = false;
  }
}

/** Test/ops visibility into the most recent sweep. Contains no fact content. */
export function readCoachFactPurgeStatus() {
  return lastPurgeResult ? { ...lastPurgeResult } : null;
}

const guardTick = (fn) => fn().catch((err) => logger.error(`[CoachFactPurge] tick rejected: ${err?.message}`));

export function startCoachFactPurgeScheduler(env = process.env) {
  if (!isCoachFactPurgeEnabled(env)) {
    logger.info('[CoachFactPurge] disabled (ENABLE_COACH_FACT_PURGE != "true") — forgotten facts are NOT being destroyed');
    return false;
  }
  if (purgeInterval) return true;
  purgeStartupTimeout = setTimeout(() => guardTick(() => runCoachFactPurgeTick()), START_DELAY_MS);
  purgeInterval = setInterval(() => guardTick(() => runCoachFactPurgeTick()), CHECK_INTERVAL_MS);
  logger.info('[CoachFactPurge] scheduler started (hourly sweep of rows past their 24h forget deadline)');
  return true;
}

export function stopCoachFactPurgeScheduler() {
  if (purgeStartupTimeout) { clearTimeout(purgeStartupTimeout); purgeStartupTimeout = null; }
  if (purgeInterval) { clearInterval(purgeInterval); purgeInterval = null; }
}
