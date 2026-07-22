/**
 * leadFollowUp.mjs — P0-1 (SWA-29) speed-to-lead SLA computation (pure, DB-free).
 *
 * Single source of truth for the initial follow-up SLA a captured lead gets. Kept pure
 * (no Sequelize, no Date.now side effects when `now` is injected) so it is fully
 * unit-testable and the Lead model `beforeCreate` hook stays a one-liner.
 *
 * Tiering (speed-to-lead): a HOT lead — score >= 70, i.e. consult / booking / checkout
 * intent — must be touched in HOURS, not a day, so it gets a 2h SLA; every other lead 24h.
 */
export const HOT_SCORE_THRESHOLD = 70;
export const HOT_SLA_HOURS = 2;
export const DEFAULT_SLA_HOURS = 24;

const MS_PER_HOUR = 60 * 60 * 1000;

/** The SLA a brand-new lead of the given score should get. Invalid/missing score → cold (24h). */
export function initialFollowUpAt(score, now = new Date()) {
  const hours = Number(score) >= HOT_SCORE_THRESHOLD ? HOT_SLA_HOURS : DEFAULT_SLA_HOURS;
  return new Date(now.getTime() + hours * MS_PER_HOUR);
}

/**
 * Resolve the value the model should persist: NEVER stomp an explicit value a caller (or the
 * admin follow-up PUT) already set — only fill when it is null/undefined. This is the whole
 * decision the beforeCreate hook makes, extracted so the no-stomp guarantee is unit-tested.
 */
export function resolveFollowUpAt(currentValue, score, now = new Date()) {
  if (currentValue != null) return currentValue;
  return initialFollowUpAt(score, now);
}
