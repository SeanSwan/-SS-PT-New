/**
 * G10/S10 — opt-in proactive nudge engine (deterministic core).
 *
 * Composes for the EXISTING in-app worker (services/notificationService.mjs;
 * nutritionLogNudgeCron.mjs is the deployed worker precedent). This module is
 * PURE scheduling/consent logic — the notification writer is dependency-
 * injected, so the engine can never send by itself.
 *
 * Contract (packet 31 G10 row, contract 32 T38/T39):
 * - EXPLICIT opt-in only: default OFF; a master disable beats everything.
 * - Quiet hours 20:00–08:00 in the CLIENT's local time. DST is handled by the
 *   caller passing the UTC offset (minutes) in effect AT the candidate
 *   instant — the engine never guesses DST transitions.
 * - At most ONE nudge per local day.
 * - Weekly dedupe: the same category may not repeat within 7 clear days.
 * - Snooze: a snoozedUntil in the future blocks delivery.
 * - DELIVERY-TIME RECHECK: consent, target access and evidence freshness are
 *   re-verified at the delivery instant. A queued nudge whose owner opted out
 *   mid-queue delivers NOTHING (T38); the writer fires only after the recheck
 *   passes.
 */

export const QUIET_HOURS = { start: 20, end: 8 };
export const WEEKLY_DEDUPE_DAYS = 7;

export const DELIVERY_DECISIONS = {
  DISABLED: 'disabled',
  NOT_CONSENTED: 'not_consented',
  SNOOZED: 'snoozed',
  QUIET_HOURS: 'quiet_hours',
  DAILY_CAP: 'daily_cap',
  WEEKLY_DEDUPE: 'weekly_dedupe',
  DUE: 'due',
};

function localHour(now, timezoneOffsetMinutes) {
  const offsetMs = (Number(timezoneOffsetMinutes) || 0) * 60 * 1000;
  return new Date(now.getTime() + offsetMs).getUTCHours();
}

function isQuietHour(now, timezoneOffsetMinutes) {
  const hour = localHour(now, timezoneOffsetMinutes);
  return hour >= QUIET_HOURS.start || hour < QUIET_HOURS.end;
}

function sameLocalDay(a, b, timezoneOffsetMinutes) {
  const offsetMs = (Number(timezoneOffsetMinutes) || 0) * 60 * 1000;
  const localA = new Date(a.getTime() + offsetMs);
  const localB = new Date(b.getTime() + offsetMs);
  return localA.getUTCFullYear() === localB.getUTCFullYear()
    && localA.getUTCMonth() === localB.getUTCMonth()
    && localA.getUTCDate() === localB.getUTCDate();
}

function clearDaysBetween(a, b, timezoneOffsetMinutes) {
  const offsetMs = (Number(timezoneOffsetMinutes) || 0) * 60 * 1000;
  const localA = new Date(a.getTime() + offsetMs);
  const localB = new Date(b.getTime() + offsetMs);
  const dayA = Date.UTC(localA.getUTCFullYear(), localA.getUTCMonth(), localA.getUTCDate());
  const dayB = Date.UTC(localB.getUTCFullYear(), localB.getUTCMonth(), localB.getUTCDate());
  return Math.round((dayB - dayA) / (24 * 60 * 60 * 1000));
}

/**
 * Decide whether a nudge may be delivered at `now`. Pure: no writes, no I/O.
 * All staleness inputs are timestamps (Date or ISO string).
 */
export function planNudgeDelivery({
  now,
  timezoneOffsetMinutes = 0,
  enabled = true,
  consented = false,
  snoozedUntil = null,
  lastDeliveredAt = null,
  lastCategoryAt = null,
  category = 'general',
} = {}) {
  const instant = now instanceof Date ? now : new Date(now);
  if (!enabled) return { decision: DELIVERY_DECISIONS.DISABLED, reason: 'nudges_disabled' };
  if (!consented) return { decision: DELIVERY_DECISIONS.NOT_CONSENTED, reason: 'no_active_consent' };

  if (snoozedUntil) {
    const snoozeUntil = snoozedUntil instanceof Date ? snoozedUntil : new Date(snoozedUntil);
    if (snoozeUntil.getTime() > instant.getTime()) {
      return { decision: DELIVERY_DECISIONS.SNOOZED, reason: 'snoozed_until_future' };
    }
  }

  if (isQuietHour(instant, timezoneOffsetMinutes)) {
    return { decision: DELIVERY_DECISIONS.QUIET_HOURS, reason: 'local_quiet_hours_20_08' };
  }

  if (lastDeliveredAt) {
    const last = lastDeliveredAt instanceof Date ? lastDeliveredAt : new Date(lastDeliveredAt);
    if (sameLocalDay(last, instant, timezoneOffsetMinutes)) {
      return { decision: DELIVERY_DECISIONS.DAILY_CAP, reason: 'one_per_local_day' };
    }
  }

  if (lastCategoryAt?.[category]) {
    const lastForCategory = lastCategoryAt[category] instanceof Date
      ? lastCategoryAt[category]
      : new Date(lastCategoryAt[category]);
    const days = clearDaysBetween(lastForCategory, instant, timezoneOffsetMinutes);
    if (days < WEEKLY_DEDUPE_DAYS) {
      return { decision: DELIVERY_DECISIONS.WEEKLY_DEDUPE, reason: `same_category_within_${WEEKLY_DEDUPE_DAYS}_days` };
    }
  }

  return { decision: DELIVERY_DECISIONS.DUE, reason: 'opted_in_and_due' };
}

/**
 * Deliver a queued nudge: the plan must be DUE and the delivery-time recheck
 * must pass (consent, access, freshness). The writer is invoked exactly once
 * only when everything passes — an opt-out between queueing and delivery
 * produces zero delivered cards (T38).
 */
export async function deliverNudge({
  plan,
  recheck = {},
  writer = null,
  nudge = null,
} = {}) {
  if (!plan || plan.decision !== DELIVERY_DECISIONS.DUE) {
    return { delivered: false, reason: plan?.reason || 'not_due' };
  }
  if (recheck.consented !== true) return { delivered: false, reason: 'consent_recheck_failed' };
  if (recheck.accessValid !== true) return { delivered: false, reason: 'access_recheck_failed' };
  if (recheck.evidenceFresh !== true) return { delivered: false, reason: 'freshness_recheck_failed' };
  if (typeof writer !== 'function') return { delivered: false, reason: 'no_writer' };

  const receipt = await writer(nudge);
  return { delivered: true, reason: 'delivered_after_recheck', receipt };
}
