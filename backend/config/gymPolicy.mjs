/**
 * ============================================================================
 * FILE: gymPolicy.mjs
 * PURPOSE: Business-policy constants for the gym-operations spine, in ONE place.
 * ADDED: 2026-07-28 (SWA-74, gym-ops spine S0)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Centralizes the money/policy decisions that are the gym owner's call, not
 * an engineering call — cancellation windows, credit forfeiture, billing behaviour.
 *
 * WHY IT EXISTS: these values get argued about, and they change per gym. Scattering them through
 * services means changing a refund rule becomes a code hunt. Here, each is one line with a stated
 * default and an env override.
 *
 * ⚠ THESE ARE DEFAULTS AWAITING SEAN'S CONFIRMATION. They were applied so the build could proceed,
 * not because they are known-correct for the target gym. The highest-risk one is
 * CLASS_CONSUMES_SESSION_CREDIT — see its note.
 *
 * Blueprint: docs/ai-workflow/AI-HANDOFF/GYM-OPS-SPINE-BUILD-BLUEPRINT-V2-2026-07-28.md §1
 */

/** Parse an env integer, falling back when unset/blank/non-numeric. Never returns NaN. */
function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Parse an env boolean. Only 'true'/'1' enable; anything else falls back. */
function envBool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return fallback;
}

/** Hours before class start after which a cancellation counts as "late". */
export const LATE_CANCEL_HOURS = envInt('LATE_CANCEL_HOURS', 12);

/**
 * Does a late cancel cost the member a session credit?
 * Default NO — the cancellation is recorded and the seat is freed, but nothing is charged.
 */
export const LATE_CANCEL_FORFEITS_CREDIT = envBool('LATE_CANCEL_FORFEITS_CREDIT', false);

/**
 * Do class bookings decrement a PT package's SessionPackage credits?
 *
 * ⚠ HIGHEST-RISK DEFAULT IN THIS FILE. Default NO — class attendance and personal-training session
 * credits are separate ledgers. If the gym intends a PT package to *pay for* class attendance,
 * flipping this alone is NOT sufficient: the enforcement path (which ledger decrements, what
 * happens at zero, refund on cancel) is deliberately unbuilt. Flipping this without that slice
 * gives away revenue silently.
 */
export const CLASS_CONSUMES_SESSION_CREDIT = envBool('CLASS_CONSUMES_SESSION_CREDIT', false);

/** Does freezing a membership also pause Stripe collection? Default YES — billing a frozen member is indefensible. */
export const FREEZE_PAUSES_BILLING = envBool('FREEZE_PAUSES_BILLING', true);

/** Notice period, in days, between a cancellation request and the end of paid access. */
export const CANCELLATION_NOTICE_DAYS = envInt('CANCELLATION_NOTICE_DAYS', 30);

/** Days after the first failed payment before a membership is suspended. */
export const DUNNING_SUSPEND_DAY = envInt('DUNNING_SUSPEND_DAY', 10);

/** Window, in minutes, in which a check-in attaches to a booked class. */
export const CHECKIN_CLASS_WINDOW_MINUTES = envInt('CHECKIN_CLASS_WINDOW_MINUTES', 30);

/** Repeat check-ins for the same member+location inside this window are treated as one. */
export const CHECKIN_IDEMPOTENCY_MINUTES = envInt('CHECKIN_IDEMPOTENCY_MINUTES', 5);

/** How far ahead concrete class occurrences are materialized. */
export const CLASS_SLOT_HORIZON_DAYS = envInt('CLASS_SLOT_HORIZON_DAYS', 90);

export default {
  LATE_CANCEL_HOURS,
  LATE_CANCEL_FORFEITS_CREDIT,
  CLASS_CONSUMES_SESSION_CREDIT,
  FREEZE_PAUSES_BILLING,
  CANCELLATION_NOTICE_DAYS,
  DUNNING_SUSPEND_DAY,
  CHECKIN_CLASS_WINDOW_MINUTES,
  CHECKIN_IDEMPOTENCY_MINUTES,
  CLASS_SLOT_HORIZON_DAYS,
};
