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

export default { raiseMoneyWriteAlert };
