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
 *   1   log_first_workout — no completed history at all
 *   2   return_after_gap  — 7+ days since the last workout
 *   2.5 rest_day          — 3+ consecutive trained days incl. today, or
 *                           active pain >= 7/10 (recovery beats streak pressure)
 *   3   streak_at_risk    — current week under target with <=2 days left
 *   3.5 plan_next         — active coach plan has a loggable day today
 *                           (coach-guided default: the plan WINS over 4-6)
 *   4   balance_pull/push — push/pull ratio outside the balanced band
 *   5   add_variety       — variety score < 40 with a real 30d sample
 *   6   volume_drop       — this week down 30%+ vs prior (neutral check-in)
 *   7   celebrate_streak  — 4+ qualifying weeks and nothing urgent
 *   8   keep_momentum     — default: keep the cadence going
 *   9   credit_nudge      — client role only, secondary-only: balance <= 2
 *
 * Phase 1.5a additions ride an optional `context` (see
 * nextBestActionContext.mjs); missing context degrades to the pulse-only
 * ladder. Pain copy is comfort-modification framing only — never
 * treatment/medical language (FDA general-wellness posture).
 */

import getProgressPulse from './progressPulseService.mjs';
import getNextBestActionContext from './nextBestActionContext.mjs';
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
const STORE_HREF = '/store';

/** D1 (Sean 2026-07-06): the only rungs un-gated for the free tier. */
export const LITE_RUNG_CODES = new Set(['log_first_workout', 'return_after_gap', 'streak_at_risk']);

/** Consecutive trained calendar days ending today (UTC date strings). */
export function countConsecutiveTrainedDays(recentDays, now) {
  const trained = new Set(Array.isArray(recentDays) ? recentDays : []);
  let count = 0;
  const cursor = new Date(now);
  while (trained.has(cursor.toISOString().slice(0, 10))) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}

/**
 * @param {object} pulse getProgressPulse payload
 * @param {{ now?: Date, audience?: 'coach', role?: 'user'|'client' }} opts
 * @param {object} context getNextBestActionContext payload (optional)
 * @returns {{ primary: object, secondary: object[], constraints, meta }}
 */
export function computeNextBestAction(pulse, opts = {}, context = {}) {
  const { now = new Date() } = opts;
  const candidates = [];
  const streak = pulse?.streak ?? {};
  const pushPull = pulse?.pushPull ?? {};
  const variety = pulse?.variety ?? {};
  const volume = pulse?.volume ?? {};
  const lastWorkout = pulse?.lastWorkout ?? {};
  const pain = context?.pain ?? null;
  const plan = context?.plan ?? null;

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

  const consecutiveDays = countConsecutiveTrainedDays(context?.recentDays, now);
  const severePain = Number.isFinite(pain?.maxLevel) && pain.maxLevel >= 7;
  if (consecutiveDays >= 3 || severePain) {
    candidates.push(action('rest_day', 2.5,
      'Recovery day',
      severePain
        ? 'You have active discomfort logged at a high level. Today is a good day for rest or gentle movement in comfortable ranges — recovery is training too.'
        : `You have trained ${consecutiveDays} days in a row. A recovery day lets the adaptation catch up — rest is where the gains land.`,
      // 4B.5: the rung now lands somewhere actionable — the Recovery Board
      // lives on the client home rail ("Today's recovery").
      { label: "Open today's recovery plan", href: '/dashboard/client/overview' }));
  }

  // Charter v3 P1 (COACH audience only): the plan-runway watchdog. A trainer
  // should never discover an empty queue by accident — this fires when the
  // active plan's estimated calendar runway drops below the 14-day threshold
  // (urgent < 7) or when no active plan exists. Copy is third-person coach
  // voice by construction (coachify preserves it; CTA stays null per the
  // coach-surface contract).
  const planQueue = context?.planQueue ?? null;
  if (opts.audience === 'coach' && planQueue && (planQueue.hasActivePlan === false || planQueue.belowThreshold)) {
    const days = Number(planQueue.estimatedCalendarDaysLeft) || 0;
    candidates.push(action('plan_queue_low', 1.5,
      'Plan queue low',
      planQueue.hasActivePlan === false
        ? 'No active program on file — queue the next training block so the client always has two weeks programmed ahead.'
        : `About ${days} estimated day${days === 1 ? '' : 's'} of programmed work remain${days === 1 ? 's' : ''}${planQueue.urgent ? ' — queue the next block now.' : ' — plan the next block soon.'}`,
      null));
  }

  const trainedToday = Number.isFinite(daysAgo) && daysAgo === 0;
  if (plan?.isLoggable && !trainedToday) {
    const extraCount = Math.max(0, (plan.exerciseCount ?? 0) - 1);
    const lead = plan.firstExerciseName
      ? `${plan.firstExerciseName}${extraCount > 0 ? ` + ${extraCount} more` : ''} is on your plan for today.`
      : 'Your coach-assigned session is on the plan for today.';
    candidates.push(action('plan_next', 3.5,
      `Today: ${plan.dayLabel || plan.title || 'your planned session'}`,
      `${lead} Logging it keeps your program on schedule.`,
      { label: 'Start today\'s workout', href: LOG_HREF }));
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

  // D1 free-tier lite: rungs 1-3 only; analytics-free fallback; no context
  // enrichments, no coach voice, no nudges (rich guidance stays paid).
  if (opts.tier === 'lite') {
    const lite = candidates.filter((c) => LITE_RUNG_CODES.has(c.code));
    const fallback = action('keep_momentum', 8,
      'Keep the cadence',
      'Your next logged session writes the next data point on every chart here.',
      { label: 'Log a workout', href: LOG_HREF });
    return {
      primary: lite[0] ?? fallback,
      secondary: lite.slice(1, 2),
      constraints: null,
      meta: { engine: 'rules', version: 2, tier: 'lite' },
    };
  }

  let secondary = candidates.slice(1, 3);

  // Client-role, secondary-only: low balance nudge (never a primary, never
  // shown to role-less users, never in coach voice).
  if (
    opts.role === 'client'
    && opts.audience !== 'coach'
    && context?.hasTrainer
    && Number.isFinite(context?.credits?.availableSessions)
    && context.credits.availableSessions <= 2
  ) {
    const n = context.credits.availableSessions;
    const nudge = action('credit_nudge', 9,
      'Sessions running low',
      `${n} session credit${n === 1 ? '' : 's'} left. Topping up now keeps your training schedule unbroken.`,
      { label: 'View packages', href: STORE_HREF });
    secondary = [secondary[0], nudge].filter(Boolean);
  }

  // Comfort-modification framing only (FDA general-wellness posture) —
  // never treatment/medical language.
  const constraints = pain && pain.activeCount > 0
    ? {
      regions: pain.regions ?? [],
      note: `Active discomfort noted${pain.regions?.length ? ` (${pain.regions.join(', ')})` : ''}. Choose comfortable ranges and skip movements that aggravate it today.`,
    }
    : null;
  const meta = { engine: 'rules', version: 2 };

  const ranked = { primary: candidates[0], secondary, constraints, meta };
  if (opts.audience === 'coach') {
    return {
      ...ranked,
      primary: coachify(ranked.primary, pulse),
      secondary: ranked.secondary.map((a) => coachify(a, pulse)),
    };
  }
  return ranked;
}

/**
 * Coach-facing voice for the trainer/admin per-client surface: third-person,
 * factual, no CTA (decisions happen in the existing coach workflows).
 * Same ladder, same data — only the voice changes (never the ranking).
 */
export function coachify(a, pulse) {
  const streak = pulse?.streak ?? {};
  const pushPull = pulse?.pushPull ?? {};
  const variety = pulse?.variety ?? {};
  const volume = pulse?.volume ?? {};
  const daysAgo = pulse?.lastWorkout?.daysAgo;
  const remaining = Math.max(0, (streak.weekTarget ?? 0) - (streak.daysThisWeek ?? 0));
  const COACH_COPY = {
    log_first_workout: ['No workouts logged yet',
      'This client has no logged sessions. The progress record starts with the first logged workout.'],
    return_after_gap: [`${Number.isFinite(daysAgo) ? daysAgo : 'Several'} days since last session`,
      'Consider a check-in — a light restart session this week protects momentum.'],
    streak_at_risk: ['Weekly streak at risk',
      `${remaining} more training ${remaining === 1 ? 'day' : 'days'} by Sunday keeps the ${streak.weeklyCurrent}-week streak alive.`],
    balance_pull: [`Push-heavy month (${pushPull.ratio}:1)`,
      'Program more pulling work (rows, pulldowns, face pulls) over the next sessions.'],
    balance_push: [`Pull-heavy month (${pushPull.ratio}:1)`,
      'Program more pressing work over the next sessions to even the balance.'],
    add_variety: ['Low movement variety',
      `Training ${variety.patternsCovered ?? 0} of ${variety.patternsTotal ?? 6} movement patterns — add new patterns for transferable strength.`],
    volume_drop: [`Volume down ${Math.abs(volume.deltaPct ?? 0)}% vs last week`,
      'Could be a planned recovery week — confirm the intent at the next touchpoint.'],
    celebrate_streak: [`${streak.weeklyCurrent}-week streak — worth celebrating`,
      'A real habit has formed. A shout-out or share nudge reinforces it.'],
    keep_momentum: ['On track',
      'Cadence is healthy. Next best action: keep the current plan rolling.'],
    rest_day: ['Recovery day indicated',
      'Consecutive training days or active discomfort suggest programming a recovery day before the next loaded session.'],
    plan_next: ['Planned session due today',
      'The active program has a loggable session today — logging it keeps the plan cursor advancing.'],
  };
  const [title, message] = COACH_COPY[a.code] ?? [a.title, a.message];
  return { ...a, title, message, cta: null };
}

/** DB-backed entry point: pulse + coach-guided context + decision in one call. */
export async function getNextBestAction(sequelize, userId, opts = {}) {
  const [pulse, context] = await Promise.all([
    getProgressPulse(sequelize, userId),
    getNextBestActionContext(sequelize, userId, { now: opts.now }),
  ]);
  return { ...computeNextBestAction(pulse, opts, context), pulse };
}

export default getNextBestAction;
