/**
 * Client Deactivation Service
 * ===========================
 *
 * Shared soft-deactivation policy for admin UI and Swan Coach command paths.
 * Keeps account access, future-session cancellation, retention deadline, and
 * paid-session preservation semantics in one audited backend service.
 */

import {
  CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES,
  normalizePaidSessionCount,
} from './sessionBillingPolicy.mjs';
import { Op } from 'sequelize';

const RETENTION_MONTHS = 6;
const DEACTIVATION_CANCEL_NOTE = 'Auto-cancelled: client account deactivated; retained for 6 months';

const buildRetentionDeadline = (accountDeactivatedAt) => {
  const accountRetentionUntil = new Date(accountDeactivatedAt);
  accountRetentionUntil.setMonth(accountRetentionUntil.getMonth() + RETENTION_MONTHS);
  return accountRetentionUntil;
};

const normalizeUpdateCount = (result) => (
  Array.isArray(result) ? Number(result[0] || 0) : Number(result || 0)
);

export const deactivateClientAccount = async ({
  client,
  Session,
  clientId = client?.id,
  transaction,
  accountDeactivatedAt = new Date(),
}) => {
  const accountRetentionUntil = buildRetentionDeadline(accountDeactivatedAt);
  const preservedAvailableSessions = normalizePaidSessionCount(client.availableSessions);

  const cancelledResult = await Session.update(
    {
      status: 'cancelled',
      notes: DEACTIVATION_CANCEL_NOTE,
    },
    {
      where: {
        userId: clientId,
        status: { [Op.in]: CLIENT_DEACTIVATION_CANCELLABLE_SESSION_STATUSES },
        sessionDate: { [Op.gt]: new Date() },
      },
      transaction,
    }
  );

  await client.update({
    isActive: false,
    accountDeactivatedAt,
    accountRetentionUntil,
  }, { transaction });

  return {
    clientId,
    accountDeactivatedAt,
    accountRetentionUntil,
    cancelledFutureSessions: normalizeUpdateCount(cancelledResult),
    preservedAvailableSessions,
  };
};
