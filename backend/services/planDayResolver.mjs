/**
 * planDayResolver — the ONE date-truth authority (Plan Surfacing S0).
 * ===================================================================
 * Two different questions used to be collapsed into one, answered by THREE
 * competing algorithms (cursor reader, projection basis chain, and the
 * logger's unsound weekday-name matcher — now deleted):
 *
 *   resolveNextDay(plan)              → "what is my NEXT workout?"
 *     CURSOR truth. Delegates to the shipped extractCurrentSession — its
 *     shape-precedence rules (days[] before sessions[], top-level legacy,
 *     weeklySchedule-with-exercises-only) are battle-tested and MUST NOT
 *     be re-implemented. Parity is test-locked in planDayResolver.test.
 *
 *   resolveDayForDate(plan, date, ctx) → "what workout belongs to date D?"
 *     CALENDAR truth. Same basis chain the live schedule projection layer
 *     ships (explicit day date → plan-start offset → cursor offset), via
 *     the contract's exported internals — one implementation, two callers.
 *
 * The two agree only when D is the date the cursor day projects onto —
 * callers that hold both answers must DISCLOSE a mismatch, never silently
 * pick one (master plan S5: "Scheduled W3·D2; you're on W2·D5 — load
 * scheduled instead?").
 *
 * RESOLVER_VERSION stamps downstream artifacts (receipt v2 carries it —
 * folded into the S3 billingLinkage migration, one migration not two).
 */
import { extractCurrentSession } from './workoutPlanShapeService.mjs';
import {
  buildAssignmentRows,
  resolveScheduledDate,
} from './trainingPlanProjectionContract.mjs';

export const RESOLVER_VERSION = 1;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const plain = (value) => (value?.get ? value.get({ plain: true }) : value);

const NONE = Object.freeze({
  basis: 'none',
  resolverVersion: RESOLVER_VERSION,
  weekNumber: null,
  dayNumber: null,
  day: null,
  session: null,
  exercises: [],
  scheduledDate: null,
});

/** Cursor truth — the next unfinished plan day, never a calendar guess. */
export function resolveNextDay(planInput) {
  const plan = plain(planInput);
  if (!plan) return NONE;
  const current = extractCurrentSession(plan);
  if (!current) return NONE;
  return {
    basis: 'cursor',
    resolverVersion: RESOLVER_VERSION,
    weekNumber: current.weekNumber,
    dayNumber: current.dayNumber,
    dayLabel: current.dayLabel,
    day: current.session,
    session: current.session,
    exercises: current.exercises,
    scheduledDate: null,
    weekFocus: current.weekFocus,
    totalWeeks: current.totalWeeks,
    isLastWeek: current.isLastWeek,
  };
}

/**
 * Calendar truth — which plan day (if any) is scheduled on `dateISO`.
 * `context.localDate` feeds the cursor-offset basis exactly as the
 * projection layer's client date context does; without it, cursor-offset
 * resolution is unavailable (basis chain simply ends).
 */
export function resolveDayForDate(planInput, dateISO, context = {}) {
  const plan = plain(planInput);
  if (!plan || typeof dateISO !== 'string' || !DATE_ONLY.test(dateISO)) return NONE;
  const rows = buildAssignmentRows(plan);
  for (const row of rows) {
    const resolution = resolveScheduledDate(plan, row, context);
    if (!resolution || resolution.scheduledDate !== dateISO) continue;
    return {
      basis: resolution.dateBasis,
      resolverVersion: RESOLVER_VERSION,
      weekNumber: row.weekNumber,
      dayNumber: row.dayNumber,
      dayLabel: row.day?.name || row.day?.dayLabel || `Day ${row.dayNumber}`,
      day: row.day,
      session: row.day,
      exercises: Array.isArray(row.day?.exercises) ? row.day.exercises : [],
      scheduledDate: resolution.scheduledDate,
      weekFocus: row.weekFocus || row.day?.focus || null,
    };
  }
  return NONE;
}
