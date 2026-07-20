/**
 * Durable session-credit receipt helpers.
 *
 * New deductions persist the exact number of credits charged on the Session.
 * Legacy rows fall back to the historical session type, including soft-deleted
 * types, so cancellation never guesses from the current UI configuration.
 */
import { getSessionType } from '../../models/index.mjs';

const normalizeNonNegativeInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const resolveSessionTypeModel = (providedModel) => {
  if (providedModel?.findByPk) return providedModel;
  const model = getSessionType();
  if (!model?.findByPk) {
    throw new Error('Session type lookup is unavailable');
  }
  return model;
};

export async function resolveSessionCreditCost(session, {
  SessionType,
  transaction,
} = {}) {
  if (!session?.sessionTypeId) return 1;

  const SessionTypeModel = resolveSessionTypeModel(SessionType);
  const sessionType = await SessionTypeModel.findByPk(session.sessionTypeId, {
    attributes: ['id', 'creditsRequired'],
    transaction,
    paranoid: false,
  });
  if (!sessionType) {
    throw new Error(`Session type ${session.sessionTypeId} is unavailable for credit reconciliation`);
  }

  const creditsRequired = normalizeNonNegativeInteger(sessionType.creditsRequired);
  if (creditsRequired === null) {
    throw new Error(`Session type ${session.sessionTypeId} has an invalid credit cost`);
  }
  return creditsRequired;
}

export function stampSessionCreditsDeducted(session, amount) {
  const normalizedAmount = normalizeNonNegativeInteger(amount);
  if (normalizedAmount === null) {
    throw new Error('Invalid deducted session credit amount');
  }
  session.creditsDeducted = normalizedAmount;
  return normalizedAmount;
}

export async function getSessionCreditsToRestore(session, options = {}) {
  if (!session?.sessionDeducted) return 0;

  if (session.creditsDeducted !== null && session.creditsDeducted !== undefined) {
    const receiptAmount = normalizeNonNegativeInteger(session.creditsDeducted);
    if (receiptAmount === null) {
      throw new Error('Session has an invalid deducted-credit receipt');
    }
    return receiptAmount;
  }

  return resolveSessionCreditCost(session, options);
}
