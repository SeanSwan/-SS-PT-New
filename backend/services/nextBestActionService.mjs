/**
 * ============================================================================
 * FILE: nextBestActionService.mjs
 * PURPOSE: Deterministic coach "next best action" derived from the progress
 *          pulse — the north-star question: what should this trainee do next?
 * CREATED: 2026-07-02 (Slice 8.2 — Progress Intelligence)
 * ============================================================================
 *
 * DESIGN:
 * - Rule-based and deterministic — NO LLM. Zero PII leaves the process
 *   (Rule 8 by construction), responses are instant, and every
 *   recommendation traces to a real logged-data condition a coach can audit.
 * - Consumes getProgressPulse (workout_logs / workout_sessions truth).
 * - Pure decision core (computeNextBestAction) takes the pulse + a clock so
 *   tests lock every rule without a DB or a real date.
 * - Care-first copy: no guilt language, celebrates real wins, frames volume
 *   drops neutrally (could be a planned recovery week).
 *
 * PRIORITY LADDER (first match wins as PRIMARY; up to 2 secondaries follow):
 *   1 log_first_workout   — no completed history at all
 *   2 return_after_gap    — 7+ days since the last workout
 *   3 streak_at_risk      — current week under target with <=2 days left
 *   4 balance_pull/push   — push/pull ratio outside the balanced band
 *   5 add_variety         — variety score < 40 with a real 30d sample
 *   6 volume_drop         — this week down 30%+ vs prior (neutral check-in)
 *   7 celebrate_streak    — 4+ qualifying weeks and nothing urgent
 *   8 keep_momentum       — default: keep the cadence going
 */

import getProgressPulse from './progressPulseService.mjs';
import { NAMED_MOVEMENT_PATTERNS } from './analytics/movementPatternSql.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days remaining in the ISO (Monday-start) week, inclusive of today. */
export function daysLeftInIsoWeek(now) {
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  return day === 0 ? 1 : 8 - day;
}

const action = (code, priority, title, message, cta = null) => (
  { code, priority, title, message, cta }
);

const LOG_HREF = '/dashboard/client/workouts';
const PROGRESS_HREF = '/dashboard/client/progress';

/**
 * @param {object} pulse getProgressPulse payload
 * @param {{ now?: Date }} opts injectable clock for tests
 * @returns {{ primary: object, secondary: object[] }}
 */
export function computeNextBestAction(pulse, { now = new Date() } = {}) {
  const candidates = [];
  const streak = pulse?.streak ?? {};
  const pushPull = pulse?.pushPull ?? {};
  const variety = pulse?.variety ?? {};
  const volume = pulse?.volume ?? {};
  const lastWorkout = pulse?.lastWorkout ?? {};

  const daysAgo = lastWorkout.daysAgo;
  const hasHistory = lastWorkout.date !== null && lastWorkout.date !== undefined;

  if (!hasHistory) {
    candidates.push(action('log_first_workout', 1,
      'Log your first workout',
      'Your progress story starts with one logged session. Everything on this page comes alive from your first entry.',
      { label: 'Log a workout', href: LOG_HREF }));
  }

  if (hasHistory && Number.isFinite(daysAgo) && daysAgo >= 7) {
    candidates.push(action('return_after_gap', 2,
      'Pick it back up',
      daysAgo >= 14
        ? `It has been ${daysAgo} days since your last logged session. One easy session this week restarts the engine — start light and rebuild.`
        : `It has been ${daysAgo} days since your last logged session. A single session this week keeps your momentum from resetting.`,
      { label: 'Log a workout', href: LOG_HREF }));
  }

  const daysLeft = daysLeftInIsoWeek(now);
  if (
    streak.currentWeekPending
    && Number.isFinite(streak.daysThisWeek)
    && streak.daysThisWeek < streak.weekTarget
    && daysLeft <= 3
    && (!Number.isFinite(daysAgo) || daysAgo < 7)
  ) {
    const remaining = streak.weekTarget - streak.daysThisWeek;
    candidates.push(action('streak_at_risk', 3,
      `Protect your ${streak.weeklyCurrent}-week streak`,
      `${remaining} more training ${remaining === 1 ? 'day' : 'days'} by Sunday keeps the streak alive. ${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left this week.`,
      { label: 'Log a workout', href: LOG_HREF }));
  }

  if (pushPull.label === 'push_heavy') {
    candidates.push(action('balance_pull', 4,
      'Add pulling work',
      `Your last 30 days are push-heavy (${pushPull.ratio}:1 push-to-pull). Rows, pulldowns, and face pulls this week rebalance shoulders and posture.`,
      { label: 'See balance chart', href: PROGRESS_HREF }));
  } else if (pushPull.label === 'pull_heavy') {
    candidates.push(action('balance_push', 4,
      'Add pushing work',
      `Your last 30 days lean pull-heavy (${pushPull.ratio}:1 push-to-pull). Presses and push-up variations this week even out the balance.`,
      { label: 'See balance chart', href: PROGRESS_HREF }));
  }

  if (Number.isFinite(variety.score) && variety.score !== null && variety.score < 40) {
    const covered = variety.patternsCovered ?? 0;
    const missing = NAMED_MOVEMENT_PATTERNS.length - covered;
    candidates.push(action('add_variety', 5,
      'Widen your movement menu',
      `You are training ${covered} of ${NAMED_MOVEMENT_PATTERNS.length} movement patterns. Adding ${missing === 1 ? 'one more pattern' : 'new patterns'} builds strength that carries over everywhere.`,
      { label: 'Review variety', href: PROGRESS_HREF }));
  }

  if (Number.isFinite(volume.deltaPct) && volume.deltaPct !== null && volume.deltaPct <= -30 && volume.priorWeek > 0) {
    candidates.push(action('volume_drop', 6,
      'Lighter week — intentional?',
      `This week's volume is ${Math.abs(volume.deltaPct)}% below last week. If it is a planned recovery week, ignore this. If not, one solid session closes the gap.`,
      { label: 'See volume trend', href: PROGRESS_HREF }));
  }

  if ((streak.weeklyCurrent ?? 0) >= 4) {
    candidates.push(action('celebrate_streak', 7,
      `${streak.weeklyCurrent} weeks strong`,
      `You have hit your ${streak.weekTarget}-day target ${streak.weeklyCurrent} weeks in a row. That is a real habit — worth sharing with your community.`,
      { label: 'View progress', href: PROGRESS_HREF }));
  }

  candidates.push(action('keep_momentum', 8,
    'Keep the cadence',
    Number.isFinite(streak.daysThisWeek) && streak.daysThisWeek > 0
      ? `${streak.daysThisWeek} training ${streak.daysThisWeek === 1 ? 'day' : 'days'} logged this week. Your next session writes the next data point.`
      : 'Your next logged session writes the next data point on every chart here.',
    { label: 'Log a workout', href: LOG_HREF }));

  candidates.sort((a, b) => a.priority - b.priority);
  return { primary: candidates[0], secondary: candidates.slice(1, 3) };
}

/** DB-backed entry point: pulse + decision in one call. */
export async function getNextBestAction(sequelize, userId, opts = {}) {
  const pulse = await getProgressPulse(sequelize, userId);
  return { ...computeNextBestAction(pulse, opts), pulse };
}

export default getNextBestAction;
