/**
 * ============================================================================
 * FILE: adminAlertService.mjs
 * PURPOSE: Turn silent money-write failures into visible admin alerts
 * AUTHOR: Claude Fable 5 | CREATED: 2026-07-14
 * ============================================================================
 *
 * WHY THIS EXISTS: the 2026-07-14 recursive hostile review proved the
 * commission system had been failing silently in production since launch
 * (0 trainer_commissions rows ever written) — every failure was caught,
 * warn-logged, and swallowed so purchases wouldn't break. Correct posture
 * for the purchase flow, but nobody watches logs. This service raises a
 * CRITICAL AdminNotification (admin dashboard bell) whenever a trainer-pay
 * write fails, so silent non-payment is impossible to miss again.
 *
 * INVARIANTS:
 * - NEVER throws (an alert about a failure must not create a new failure).
 * - Deduped per lane: one unread alert per failure lane at a time — a
 *   settlement sweep failing on 50 sessions raises ONE alert, not 50.
 * - Column truth verified against prod 2026-07-14: admin_notifications has
 *   `metadata` (text) — NOT `data`/`createdBy`; type enum includes
 *   'system_alert'; priority enum includes 'critical'.
 */

import { getModel } from '../models/index.mjs';
import logger from '../utils/logger.mjs';

/**
 * Raise a CRITICAL admin alert for a failed money write.
 *
 * @param {Object} params
 * @param {string} params.lane - 'purchase_commission' | 'session_flat_accrual'
 * @param {Error}  params.error - the swallowed error
 * @param {Object} [params.context] - ids only (Rule 8): orderId/sessionId/trainerId/clientId
 * @returns {Object|null} created notification, or null (deduped/failed)
 */
export async function raiseMoneyWriteAlert({ lane, error, context = {} } = {}) {
  try {
    const AdminNotification = getModel('AdminNotification');
    if (!AdminNotification) {
      logger.error('[AdminAlert] AdminNotification model unavailable — alert dropped', { lane });
      return null;
    }

    const title = `Trainer pay write FAILED (${lane})`;

    // Dedupe: one unread alert per lane. Admin reading (isRead) re-arms it.
    const existing = await AdminNotification.findOne({
      where: { type: 'system_alert', title, isRead: false },
      attributes: ['id'],
    });
    if (existing) return null;

    const record = await AdminNotification.create({
      type: 'system_alert',
      priority: 'critical',
      actionRequired: true,
      title,
      message:
        `A ${lane} write failed and was swallowed to protect the checkout/completion flow. `
        + `Trainer pay is NOT being recorded until this is fixed. `
        + `Context: ${Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ') || 'none'} `
        + `Error: ${error?.message || 'unknown'}`,
      userId: Number.isInteger(Number(context.trainerId)) ? Number(context.trainerId) : null,
      metadata: JSON.stringify({
        lane,
        ...context,
        error: error?.message || 'unknown',
        raisedBy: 'adminAlertService',
      }),
    });

    logger.error('[AdminAlert] CRITICAL money-write alert raised', { lane, notificationId: record.id });
    return record;
  } catch (alertError) {
    // Never throw: log both the original failure and the alert failure.
    logger.error('[AdminAlert] failed to raise money-write alert (original failure still stands)', {
      lane,
      alertError: alertError.message,
      originalError: error?.message,
    });
    return null;
  }
}

/**
 * Strip anything that looks like a lead's identity before it reaches the DB.
 *
 * WHY THIS IS NOT OPTIONAL: the send lanes this guards (`speed_to_lead`,
 * `sendgrid`) hold the LEAD'S OWN EMAIL in scope at the call site, and an
 * AdminNotification row is admin-visible AND read by LLM tooling. One careless
 * `context: { email }` at a future call site would put a real person's address
 * into a surface Rule 8 forbids. The call sites are also written to pass IDs
 * only — this is the second layer, because the first depends on every future
 * caller remembering.
 *
 * SendGrid error strings are a live example: they routinely embed the failing
 * recipient ("...does not comply... to=lead@example.com"), so redacting only
 * `context` and trusting `error.message` would leak on the exact path that
 * fails most often.
 */
const REDACT_EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/**
 * Each branch carries the input that defeated its previous form — do not
 * "simplify" one back open (same discipline as fuzzyClauseGuards).
 *
 * The first form here was `/\+?\d[\d\s().-]{7,}\d/g`. It redacted the things
 * this alert exists to show: `2026-08-14 10:30:00` became `<redacted-phone>`,
 * and so did the request id `7f3a-1122-3344-5566`. A guard that eats the
 * timestamp and the correlation id out of a delivery-failure alert has
 * destroyed the alert while appearing to protect it.
 *
 * Branch 1 — international, `+`-anchored and permissive. Safe to be loose
 *   precisely BECAUSE of the `+`: no timestamp, UUID, duration, or order
 *   number starts with one. Defeated the strict E.164 form on `+44 20 7946 0958`.
 * Branch 2 — North American, structure-required (3-3-4 with optional
 *   separators or a parenthesised area code). The structure is what keeps
 *   `2026-08-14`, `12345678 ms`, and hyphenated ids intact.
 *
 * Input is capped before matching: both branches use bounded quantifiers, so
 * backtracking is linear, but an unbounded error string is still not worth
 * scanning.
 */
const REDACT_PHONE = /\+\d[\d\s.()-]{5,17}\d|(?:\(\d{3}\)|\b\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g;
const SCRUB_MAX_CHARS = 2000;
const scrubIdentity = (value) => String(value ?? '')
  .slice(0, SCRUB_MAX_CHARS)
  .replace(REDACT_EMAIL, '<redacted-email>')
  .replace(REDACT_PHONE, '<redacted-phone>');

/**
 * Raise an admin alert for a lead-email send failure.
 *
 * WHY: `speedToLeadService` and `sendgridService` swallow every failure by
 * design so a broken email provider can never lose a lead — correct posture,
 * but it means an expired key, a blown quota, or a bounce storm produces
 * `logger.warn` and nothing else. Nobody watches logs. After the
 * SPEED_TO_LEAD_REPLY_ENABLED flag is armed, silence is indistinguishable from
 * success, which is the failure mode this closes.
 *
 * Priority is 'high', not 'critical': a missed acknowledgment costs a lead's
 * first impression, not a trainer's pay. 'critical' is reserved for money.
 *
 * @param {Object} params
 * @param {string} params.lane - 'speed_to_lead' | 'sendgrid'
 * @param {Error|string} params.error - the swallowed failure
 * @param {Object} [params.context] - IDs ONLY (Rule 8): leadId / source
 * @returns {Object|null} created notification, or null (deduped/unavailable/failed)
 */
export async function raiseSendFailureAlert({ lane, error, context = {} } = {}) {
  try {
    const AdminNotification = getModel('AdminNotification');
    if (!AdminNotification) {
      logger.error('[AdminAlert] AdminNotification model unavailable — send alert dropped', { lane });
      return null;
    }

    const title = `Lead email send FAILED (${lane})`;

    // Dedupe per lane, same contract as the money lane: a bounce storm across
    // 200 leads raises ONE alert, not 200. Admin reading it re-arms the lane.
    const existing = await AdminNotification.findOne({
      where: { type: 'system_alert', title, isRead: false },
      attributes: ['id'],
    });
    if (existing) return null;

    const reason = scrubIdentity(error?.message ?? error ?? 'unknown');
    const safeContext = Object.fromEntries(
      Object.entries(context).map(([k, v]) => [k, scrubIdentity(v)]),
    );

    const record = await AdminNotification.create({
      type: 'system_alert',
      priority: 'high',
      actionRequired: true,
      title,
      message:
        `A ${lane} send failed and was swallowed so lead capture could not break. `
        + `The lead was captured; the acknowledgment email was NOT delivered. `
        + `Check the sender key, quota, and domain authentication. `
        + `Context: ${Object.entries(safeContext).map(([k, v]) => `${k}=${v}`).join(' ') || 'none'} `
        + `Error: ${reason}`,
      userId: null, // a lead is not a User; never guess an id here
      metadata: JSON.stringify({
        lane,
        ...safeContext,
        error: reason,
        raisedBy: 'adminAlertService',
      }),
    });

    logger.error('[AdminAlert] send-failure alert raised', { lane, notificationId: record.id });
    return record;
  } catch (alertError) {
    // Same invariant as the money lane: an alert about a failure must never
    // create a new failure.
    logger.error('[AdminAlert] failed to raise send-failure alert (original failure still stands)', {
      lane,
      alertError: alertError.message,
    });
    return null;
  }
}

export default { raiseMoneyWriteAlert, raiseSendFailureAlert };
