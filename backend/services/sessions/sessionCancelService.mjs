/**
 * ============================================================================
 * FILE: sessionCancelService.mjs
 * PURPOSE: Shared session-cancel execution path for the AI command lane
 * OWNER: Claude Sonnet 4.6 | CREATED: 2026-04-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Extracts the core cancel logic from the live route
 * PATCH /:sessionId/cancel (sessionRoutes.mjs) so the AI command lane can
 * perform cancellations with identical business semantics.
 *
 * CONTRACT:
 *   - Always chargeType: 'none' — AI lane never applies cancellation charges.
 *     Charge decisions are admin UI territory only.
 *   - restoreCredit: true — canonical idempotent restore matching the live route
 *   - Notifications sent async, non-blocking, matching route behavior
 *   - Returns flat scalars only — no nested objects — for ExecutionResultCard
 *
 * MIRRORED BEHAVIORS (keep in sync with sessionRoutes.mjs PATCH /:sessionId/cancel):
 *   - Cancellable statuses: ['scheduled', 'confirmed', 'requested']
 *   - RBAC: admin | trainer-assigned | session-owner
 *   - Late cancellation detection (< 24 hr before session): sets cancellationDecision: 'pending'
 *     for non-admins — MindBody parity, flags for admin review queue
 *   - sessionCreditRestored idempotency flag (prevents double-crediting across paths)
 *   - sessionDeducted guard (only restore if a credit was deducted at booking)
 *   - cancellationChargeType / cancellationChargeAmount stored as 'none' / 0
 *     so admin review screens see accurate data
 */

import { getSession, getUser } from '../../models/index.mjs';
import {
  sendEmailNotification,
  sendSmsNotification,
} from '../../utils/notification.mjs';
import {
  sessionCancelledEmail,
  trainerSessionNotificationEmail,
} from '../../utils/emailTemplates.mjs';
import logger from '../../utils/logger.mjs';
import sequelize from '../../database.mjs';
import { isNonDeductingClient } from '../sessionBillingPolicy.mjs';

// ── Constants ────────────────────────────────────────────────────────────────

import { getSessionCreditsToRestore } from './sessionCreditReceiptService.mjs';
const CANCELLABLE_STATUSES = ['scheduled', 'confirmed', 'requested'];

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Cancel a session via the AI command lane.
 * Mirrors PATCH /:sessionId/cancel semantics with chargeType: 'none' defaults.
 *
 * @param {number} sessionId
 * @param {{ id: number, role: string, firstName?: string }} user - Authenticated trainer/admin
 * @returns {Promise<{
 *   sessionId, status, cancellationDate, refundIssued, cancelledBy,
 *   isLateCancellation, requiresAdminReview
 * }>}
 */
export async function cancelSessionForAI(sessionId, user) {
  const Session = getSession();
  const User    = getUser();

  let session = await Session.findByPk(sessionId, {
    include: [
      {
        model: User, as: 'client',
        attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'availableSessions', 'clientSource', 'sessionBillingMode'],
      },
      {
        model: User, as: 'trainer',
        attributes: ['id', 'firstName', 'lastName', 'email'],
      },
    ],
  });

  if (!session) {
    throw new Error(`Session #${sessionId} not found.`);
  }

  // ── RBAC ─────────────────────────────────────────────────────────────────

  const isAdmin   = user.role === 'admin';
  const isTrainer = user.role === 'trainer' && session.trainerId === user.id;
  const isOwner   = session.userId === user.id;

  if (!isAdmin && !isTrainer && !isOwner) {
    throw new Error('You do not have permission to cancel this session.');
  }

  // ── Status check ─────────────────────────────────────────────────────────

  if (!CANCELLABLE_STATUSES.includes(session.status)) {
    throw new Error(
      `Session #${sessionId} cannot be cancelled (current status: ${session.status}). ` +
      `Only ${CANCELLABLE_STATUSES.join(', ')} sessions can be cancelled.`
    );
  }

  // ── Late cancellation detection ───────────────────────────────────────────
  // Mirrors the live route's hoursUntilSession calculation


  // ── Update session ────────────────────────────────────────────────────────

  const transaction = await sequelize.transaction();
  let creditRestored = false;
  let isLateCancellation = false;
  let needsAdminReview = false;
  try {
    const lockedSession = await Session.findByPk(sessionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedSession || !CANCELLABLE_STATUSES.includes(lockedSession.status)) {
      throw new Error(`Session #${sessionId} is no longer available for cancellation.`);
    }
    const lockedIsTrainer = user.role === 'trainer' && lockedSession.trainerId === user.id;
    const lockedIsOwner = lockedSession.userId === user.id;
    if (!isAdmin && !lockedIsTrainer && !lockedIsOwner) {
      throw new Error('You do not have permission to cancel this session.');
    }
    // Keep the eager-loaded notification recipients while all mutable billing
    // fields come from the row-locked instance.
    lockedSession.client = session.client;
    lockedSession.trainer = session.trainer;
    session = lockedSession;
    session.status = 'cancelled';
    const hoursUntilSession = session.sessionDate
      ? (new Date(session.sessionDate).getTime() - Date.now()) / (1000 * 60 * 60)
      : null;
    isLateCancellation = hoursUntilSession !== null && hoursUntilSession < 24;

    // MindBody parity: non-admin late cancellation queued for admin review.
    needsAdminReview = isLateCancellation && !isAdmin;


  session.cancellationReason = isLateCancellation
    ? 'Late cancellation (via Swan Coach)'
    : 'Cancelled by trainer via Swan Coach';
  session.cancellationDate         = new Date();
  session.cancelledBy              = user.id;
  session.cancellationChargeType   = 'none';    // AI lane never charges
  session.cancellationChargeAmount = 0;

  if (needsAdminReview) {
    session.cancellationDecision = 'pending';   // surfaced in admin review queue
  }

  await session.save({ transaction });

  // ── Restore session credit (idempotent) ───────────────────────────────────

    creditRestored = await restoreCredit(session, User, transaction);
    await transaction.commit();
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      logger.error('[SessionCancelService] Rollback failed', { sessionId, error: rollbackError.message });
    }
    throw error;
  }

  // ── Notifications (async, non-blocking) ──────────────────────────────────

  sendCancellationNotifications(session, user, creditRestored).catch(err =>
    logger.warn('[SessionCancelService] Notification failed', {
      sessionId,
      error: err.message,
    })
  );

  logger.info(`[SessionCancelService] Session ${sessionId} cancelled by user ${user.id}`, {
    sessionId,
    cancelledBy: user.id,
    isLateCancellation,
    needsAdminReview,
    creditRestored,
  });

  return {
    sessionId:          session.id,
    status:             session.status,
    cancellationDate:   session.cancellationDate.toISOString().slice(0, 10),
    refundIssued:       creditRestored,
    cancelledBy:        user.id,
    isLateCancellation,
    requiresAdminReview: needsAdminReview,
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Idempotent session credit restore.
 * Mirrors restoreSessionCredit() in sessionRoutes.mjs for chargeType:'none' path.
 * Guards: not already restored, credit was deducted at booking, client exists.
 *
 * @param {object} session - Sequelize Session instance
 * @param {object} User    - Sequelize User model class
 * @returns {Promise<boolean>} true if credit was restored, false if skipped
 */
async function restoreCredit(session, User, transaction) {
  if (session.sessionCreditRestored === true) {
    logger.info(`[SessionCancelService] Session ${session.id} credit already restored, skipping`);
    return false;
  }

  if (!session.sessionDeducted) {
    logger.info(`[SessionCancelService] Session ${session.id} never deducted a credit, skipping`);
    return false;
  }

  if (!session.userId) return false;

  const client = await User.findByPk(session.userId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!client) return false;

  if (isNonDeductingClient(client)) {
    logger.info(`[SessionCancelService] Skipped credit restore for non-deducting client source ${client.clientSource}`, {
      sessionId: session.id,
      userId: client.id,
    });
    return false;
  }

  const creditsToRestore = await getSessionCreditsToRestore(session, {
    transaction
  });
  const newBalance = (client.availableSessions || 0) + creditsToRestore;
  if (creditsToRestore > 0) {
    await client.increment('availableSessions', { by: creditsToRestore, transaction });
    client.availableSessions = newBalance;
  }

  session.sessionCreditRestored = true;
  await session.save({ transaction });

  logger.info(`[SessionCancelService] Restored ${creditsToRestore} credits for user ${session.userId}. New balance: ${newBalance}`);
  return creditsToRestore > 0;
}

/**
 * Send cancellation notifications to client and trainer.
 * Mirrors notification behavior of PATCH /:sessionId/cancel.
 * Does NOT notify the person who initiated the cancellation.
 *
 * @param {object} session       - Sequelize Session instance (with client/trainer eagerly loaded)
 * @param {object} canceller     - User who initiated the cancel
 * @param {boolean} creditRestored
 */
async function sendCancellationNotifications(session, canceller, creditRestored) {
  const sessionDateFormatted = session.sessionDate
    ? new Date(session.sessionDate).toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : 'your scheduled session';

  // Notify client (skip if client is the canceller)
  if (session.client?.email && session.client.id !== canceller.id) {
    await sendEmailNotification({
      to: session.client.email,
      subject: 'Session Cancelled - SwanStudios',
      text: `Your session scheduled for ${sessionDateFormatted} has been cancelled. Reason: ${session.cancellationReason}${creditRestored ? '\nYour session credit has been restored to your account.' : ''}`,
      html: sessionCancelledEmail({
        clientName:    session.client.firstName,
        sessionDate:   sessionDateFormatted,
        reason:        session.cancellationReason,
        chargeType:    'none',
        chargeAmount:  0,
        creditRestored,
      }),
    });

    if (session.client.phone) {
      await sendSmsNotification({
        to: session.client.phone,
        body: `SwanStudios: Your session on ${sessionDateFormatted} has been cancelled.${creditRestored ? ' Credit restored.' : ''}`,
      });
    }
  }

  // Notify trainer (skip if trainer is the canceller)
  if (session.trainer?.email && session.trainer.id !== canceller.id) {
    const clientName = session.client
      ? `${session.client.firstName} ${session.client.lastName || ''}`.trim()
      : 'Client';

    await sendEmailNotification({
      to: session.trainer.email,
      subject: 'Session Cancelled - SwanStudios',
      text: `A session with ${clientName} scheduled for ${sessionDateFormatted} has been cancelled. Reason: ${session.cancellationReason}`,
      html: trainerSessionNotificationEmail({
        trainerName: session.trainer.firstName,
        clientName,
        sessionDate: sessionDateFormatted,
        duration:    session.duration,
        location:    session.location,
        eventType:   'cancelled',
      }),
    });
  }
}
