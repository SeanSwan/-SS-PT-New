/**
 * pendingConfirmations.mjs — the NON-destructive half of the approval lane
 * ========================================================================
 * Split from destructiveOperations.mjs (2026-09-02, Rule 4 cap) along the real
 * domain boundary: destructive ops carry type/endpoint/affected-preview and the
 * strong ceremony; pending confirmations are the softer single-confirm tier.
 * Same store seam, same signing module, same atomic-consumption discipline
 * (delete()'s return value is the one-time token). HMAC-signed as of 0.4a —
 * this kind previously carried no integrity binding at all.
 */
import crypto from 'crypto';
import logger from '../../utils/logger.mjs';
import { getPendingOperationStore, countPendingForUser } from './pendingOperationStore.mjs';
import { signPendingConfirmation } from './operationSigning.mjs';

const OPERATION_TTL_SECONDS = 120;
const MAX_PENDING_PER_USER = 5;
const store = () => getPendingOperationStore();

/**
 * Prepare a non-destructive pending confirmation. HMAC-signed as of 0.4a —
 * previously this kind carried no integrity binding at all.
 *
 * @param {Object} params
 * @param {string} params.commandType  - Registry command type (e.g. 'log_workout')
 * @param {Object} params.params       - Validated command params
 * @param {number|null} params.clientId - Resolved client ID
 * @param {number} params.userId       - ID of user requesting confirmation
 * @param {string} params.description  - Human-readable description for audit log
 * @param {string} [params.frontendEvent] - Browser event for confirmed frontend dispatches
 * @returns {Promise<{ operationId: string, description: string, expiresAt: string }>}
 */
export async function preparePendingConfirmation({ commandType, params, clientId, userId, description, frontendEvent = null }) {
  const userCount = await countPendingForUser(userId);
  if (userCount >= MAX_PENDING_PER_USER) {
    throw new Error(`Too many pending operations (${userCount}). Please confirm or cancel existing operations first.`);
  }

  const opId = crypto.randomUUID();
  const resolvedClientId = Number(clientId);
  const baseParams = params && typeof params === 'object' && !Array.isArray(params) ? structuredClone(params) : {};
  const scopedClientId = Number.isSafeInteger(resolvedClientId) && resolvedClientId > 0 ? resolvedClientId : null;
  if (scopedClientId) baseParams.clientId = scopedClientId;

  const operation = {
    id: opId,
    kind: 'pending_confirmed',  // distinguishes from destructive ops
    commandType,
    params: baseParams,
    frontendEvent,
    clientId: scopedClientId,
    createdBy: userId,
    description,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OPERATION_TTL_SECONDS * 1000).toISOString(),
    signature: '',
  };
  operation.signature = signPendingConfirmation(operation);

  await store().set(opId, operation, OPERATION_TTL_SECONDS * 1000);

  logger.info('[DestructiveOps] Pending confirmation prepared', {
    opId,
    commandType,
    userId,
    expiresAt: operation.expiresAt,
  });

  return { operationId: opId, description, expiresAt: operation.expiresAt };
}

/**
 * Retrieve a non-destructive pending confirmation. Same discipline as the
 * destructive path: checks first, then atomic consumption on delete()'s return.
 *
 * @param {string} operationId
 * @param {number} userId
 * @returns {Promise<{ verified: boolean, operation: Object|null, error: string|null }>}
 */
export async function retrievePendingConfirmation(operationId, userId) {
  const operation = await store().get(operationId);

  if (!operation || operation.kind !== 'pending_confirmed') {
    return { verified: false, operation: null, error: 'Pending confirmation not found or already used.' };
  }

  if (new Date(operation.expiresAt).getTime() < Date.now()) {
    await store().delete(operationId);
    return { verified: false, operation: null, error: 'Operation expired (120s). Please re-issue the command.' };
  }

  if (operation.createdBy !== userId) {
    logger.warn('[DestructiveOps] Ownership mismatch on pending confirmation', {
      opId: operationId,
      expectedUserId: operation.createdBy,
      actualUserId: userId,
    });
    return { verified: false, operation: null, error: 'You cannot confirm another user\'s operation.' };
  }

  // 0.4a: signature check (this kind was previously unsigned).
  try {
    const expected = signPendingConfirmation({ ...operation, signature: undefined });
    if (!crypto.timingSafeEqual(Buffer.from(operation.signature, 'hex'), Buffer.from(expected, 'hex'))) {
      logger.error('[DestructiveOps] PENDING-CONFIRMATION TAMPERING DETECTED', { opId: operationId, userId });
      await store().delete(operationId);
      return { verified: false, operation: null, error: 'Operation signature invalid. Possible tampering detected.' };
    }
  } catch (err) {
    logger.error('[DestructiveOps] Pending-confirmation signature error', { error: err.message });
    return { verified: false, operation: null, error: 'Signature verification failed.' };
  }

  const consumed = await store().delete(operationId);
  if (!consumed) {
    return { verified: false, operation: null, error: 'Operation was already confirmed. It only executes once.' };
  }
  return { verified: true, operation, error: null };
}

