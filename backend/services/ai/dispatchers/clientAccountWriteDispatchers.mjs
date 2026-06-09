/**
 * Client Account Write Dispatchers
 * ================================
 *
 * Swan Coach admin write commands for client account state. Results stay
 * ID-based and do not echo client PII or service internals.
 */

import { deactivateClientAccount } from '../../clientDeactivationService.mjs';
import defaultSequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import logger from '../../../utils/logger.mjs';
import { resolveCommandClientId } from './clientScope.mjs';

const sequelizeFrom = (ctx = {}) => ctx.options?.sequelize || ctx.sequelize || defaultSequelize;

const buildLockNotFound = (clientId) => ({
  clientId,
  found: false,
  locked: false,
});

const buildLockSuccess = (clientId) => ({
  clientId,
  found: true,
  locked: true,
});

const buildDeactivateNotFound = (clientId) => ({
  clientId,
  found: false,
  deactivated: false,
});

const buildDeactivateSuccess = ({ clientId, deactivation }) => ({
  clientId,
  found: true,
  deactivated: true,
  accountDeactivatedAt: deactivation.accountDeactivatedAt.toISOString(),
  accountRetentionUntil: deactivation.accountRetentionUntil.toISOString(),
  cancelledFutureSessions: deactivation.cancelledFutureSessions,
  preservedAvailableSessions: deactivation.preservedAvailableSessions,
});

const findClient = ({ User, clientId, transaction }) => (
  User.findOne({
    where: { id: clientId, role: 'client' },
    transaction,
  })
);

const runClientTransaction = async ({ User, clientId, ctx, onMissing, onFound, onError }) => {
  const sequelize = sequelizeFrom(ctx);
  const transaction = await sequelize.transaction();

  try {
    const client = await findClient({ User, clientId, transaction });

    if (!client) {
      await transaction.rollback();
      return onMissing();
    }

    const result = await onFound({ client, transaction });
    await transaction.commit();
    return result;
  } catch (error) {
    await transaction.rollback();
    if (onError) onError(error);
    throw error;
  }
};

const logLockFailure = (clientId) => (error) => {
  logger.error('[CommandDispatcher] lock_client failed', {
    clientId,
    error: error.message,
  });
};

export const dispatchLockClient = async (params = {}, ctx = {}) => {
  const { User } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);

  return runClientTransaction({
    User,
    clientId,
    ctx,
    onMissing: () => buildLockNotFound(clientId),
    onFound: async ({ client, transaction }) => {
      await client.update({ isLocked: true }, { transaction });
      return buildLockSuccess(clientId);
    },
    onError: logLockFailure(clientId),
  });
};

export const dispatchDeactivateClient = async (params = {}, ctx = {}) => {
  const { User, Session } = getAllModels();
  const clientId = resolveCommandClientId(params, ctx);

  return runClientTransaction({
    User,
    clientId,
    ctx,
    onMissing: () => buildDeactivateNotFound(clientId),
    onFound: async ({ client, transaction }) => {
      const deactivation = await deactivateClientAccount({
        client,
        Session,
        clientId,
        transaction,
      });
      return buildDeactivateSuccess({ clientId, deactivation });
    },
  });
};
