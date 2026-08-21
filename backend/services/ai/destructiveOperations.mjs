/**
 * Destructive Operation Manager — HMAC-Signed Two-Phase Commit
 * =============================================================
 * Manages destructive AI-initiated operations with cryptographic signing.
 * Operations are prepared (preview), then executed only after user confirmation.
 *
 * Pipeline position: ... → ConfirmationGenerator → **DestructiveOps** → Executor → Auditor
 */
import crypto from 'crypto';
import logger from '../../utils/logger.mjs';
import { getPendingOperationStore } from './pendingOperationStore.mjs';

const OPERATION_SECRET = process.env.OPERATION_SIGNING_KEY || crypto.randomBytes(32).toString('hex');
const MAX_AI_BULK_DELETE = 50;
const OPERATION_TTL_SECONDS = 120;

// The pending-approval store now lives behind an injectable seam.
//
// This is a PARTIAL Map facade, not a Map. It exposes exactly the five methods this
// module calls — audited 2026-08-21 across all 14 call sites: get x3, set x2,
// delete x7, entries x1, values x1. It deliberately does NOT expose size, has,
// clear, forEach or [Symbol.iterator]. An earlier comment here claimed the facade
// was "byte-for-byte the previous in-process Map", which was false and was caught in
// review; three seats independently asked whether a dropped method broke a call site.
// It does not — but the claim was wider than the evidence, which is the exact failure
// this workstream exists to correct.
//
// If you add a call site needing another Map method, add it here AND to every store
// implementation, or it will be undefined at runtime rather than a clean error.
// See pendingOperationStore.mjs for WHY the seam exists and what S2b must still do.
const pendingOps = {
  get: (id) => getPendingOperationStore().get(id),
  set: (id, op) => getPendingOperationStore().set(id, op),
  delete: (id) => getPendingOperationStore().delete(id),
  entries: () => getPendingOperationStore().entries(),
  values: () => getPendingOperationStore().values(),
};

// Cleanup expired ops every 60s — unref() allows Node to exit cleanly in tests
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [id, op] of pendingOps.entries()) {
    if (new Date(op.expiresAt).getTime() < now) {
      pendingOps.delete(id);
    }
  }
}, 60000);
cleanupTimer.unref();

function signOperation(op) {
  const payload = JSON.stringify({
    id: op.id,
    type: op.type,
    endpoint: op.endpoint,
    commandType: op.commandType,  // exec-substrate-v9: included so tampering with commandType fails verification
    params: op.params,
    createdBy: op.createdBy,
  });
  return crypto.createHmac('sha256', OPERATION_SECRET).update(payload).digest('hex');
}

function verifySignature(op) {
  const expected = signOperation(op);
  return crypto.timingSafeEqual(Buffer.from(op.signature, 'hex'), Buffer.from(expected, 'hex'));
}

/**
 * Prepare a destructive operation for user confirmation.
 *
 * @param {Object} params
 * @param {string} params.type - 'DELETE' | 'UPDATE' | 'DEACTIVATE' | 'LOCK'
 * @param {string} params.endpoint - API endpoint path
 * @param {Object} params.commandParams - Command parameters
 * @param {number} params.userId - ID of user requesting the operation
 * @param {string} params.description - Human-readable description of the operation
 * @param {Object[]} [params.affectedRecords] - Preview of affected records
 * @returns {Object} Pending operation with signature
 */
export function prepareDestructiveOperation({
  type,
  endpoint,
  commandParams,
  commandType,      // exec-substrate-v9: command-lane type (e.g. 'cancel_session'); HMAC-signed
  userId,
  description,
  affectedRecords = [],
}) {
  // V3: Require explicit scope on DELETE (no unscoped mass deletions)
  if (
    type === 'DELETE'
    && !commandParams.id
    && !commandParams.clientId
    && !commandParams.userId
    && !commandParams.dateRange
  ) {
    throw new Error('CRITICAL: DELETE requires explicit scope (id, clientId, userId, or dateRange). Mass unscoped deletions are blocked.');
  }

  // V3: Hard cap on affected records
  if (affectedRecords.length > MAX_AI_BULK_DELETE) {
    throw new Error(
      `CRITICAL: Would affect ${affectedRecords.length} records. Max: ${MAX_AI_BULK_DELETE}. Use manual deletion for bulk operations.`
    );
  }

  // Per-user cap to prevent memory exhaustion via rapid operation creation
  const MAX_PENDING_PER_USER = 5;
  const userPendingCount = getPendingCount(userId);
  if (userPendingCount >= MAX_PENDING_PER_USER) {
    throw new Error(`Too many pending operations (${userPendingCount}). Please confirm or cancel existing operations first.`);
  }

  const opId = crypto.randomUUID();
  const operation = {
    id: opId,
    type,
    endpoint,
    commandType: commandType ?? null,  // signed in HMAC payload — tampering detected on verify
    params: commandParams,
    affectedRecords: affectedRecords.slice(0, 10), // Max 10 in preview
    affectedCount: affectedRecords.length,
    createdBy: userId,
    description,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OPERATION_TTL_SECONDS * 1000).toISOString(),
    signature: '',
  };
  operation.signature = signOperation(operation);

  // Store in-memory (or Redis when available)
  pendingOps.set(opId, operation);

  logger.info('[DestructiveOps] Operation prepared', {
    opId,
    type,
    endpoint,
    affectedCount: affectedRecords.length,
    userId,
    expiresAt: operation.expiresAt,
  });

  return {
    operationId: opId,
    type,
    description,
    affectedRecords: operation.affectedRecords,
    affectedCount: operation.affectedCount,
    expiresAt: operation.expiresAt,
    requiresConfirmation: true,
  };
}

/**
 * Execute a previously prepared destructive operation.
 * Verifies: ownership, expiration, HMAC signature.
 *
 * @param {string} operationId - The operation ID from prepare()
 * @param {number} userId - ID of user confirming (must match creator)
 * @returns {{ verified: boolean, operation: Object|null, error: string|null }}
 */
export function verifyAndRetrieveOperation(operationId, userId) {
  const operation = pendingOps.get(operationId);

  if (!operation) {
    return { verified: false, operation: null, error: 'Operation expired or not found. Please re-issue the command.' };
  }

  // Check expiration
  if (new Date(operation.expiresAt).getTime() < Date.now()) {
    pendingOps.delete(operationId);
    return { verified: false, operation: null, error: 'Operation expired (120s). Please re-issue the command.' };
  }

  // Check ownership
  if (operation.createdBy !== userId) {
    logger.warn('[DestructiveOps] Ownership mismatch', {
      opId: operationId,
      expectedUserId: operation.createdBy,
      actualUserId: userId,
    });
    return { verified: false, operation: null, error: 'You cannot confirm another user\'s operation.' };
  }

  // Verify HMAC signature
  try {
    if (!verifySignature(operation)) {
      logger.error('[DestructiveOps] SIGNATURE TAMPERING DETECTED', {
        opId: operationId,
        userId,
      });
      pendingOps.delete(operationId);
      return { verified: false, operation: null, error: 'Operation signature invalid. Possible tampering detected.' };
    }
  } catch (err) {
    logger.error('[DestructiveOps] Signature verification error', { error: err.message });
    return { verified: false, operation: null, error: 'Signature verification failed.' };
  }

  // Clean up — operation can only be executed once
  pendingOps.delete(operationId);

  return { verified: true, operation, error: null };
}

/**
 * Prepare a non-destructive pending confirmation.
 *
 * @param {Object} params
 * @param {string} params.commandType  - Registry command type (e.g. 'log_workout')
 * @param {Object} params.params       - Validated command params
 * @param {number|null} params.clientId - Resolved client ID
 * @param {number} params.userId       - ID of user requesting confirmation
 * @param {string} params.description  - Human-readable description for audit log
 * @param {string} [params.frontendEvent] - Browser event for confirmed frontend dispatches
 * @returns {{ operationId: string, description: string, expiresAt: string }}
 */
export function preparePendingConfirmation({ commandType, params, clientId, userId, description, frontendEvent = null }) {
  // Apply the same per-user cap as destructive ops
  const MAX_PENDING_PER_USER = 5;
  const userCount = getPendingCount(userId);
  if (userCount >= MAX_PENDING_PER_USER) {
    throw new Error(`Too many pending operations (${userCount}). Please confirm or cancel existing operations first.`);
  }

  const opId = crypto.randomUUID();
  const resolvedClientId = Number(clientId);
  const confirmedParams = params && typeof params === 'object' && !Array.isArray(params) ? { ...params } : {};
  const scopedClientId = Number.isSafeInteger(resolvedClientId) && resolvedClientId > 0 ? resolvedClientId : null;
  if (scopedClientId) confirmedParams.clientId = scopedClientId;

  const operation = {
    id: opId,
    kind: 'pending_confirmed',  // distinguishes from HMAC-signed destructive ops
    commandType,
    params: confirmedParams,
    frontendEvent,
    clientId: scopedClientId,
    createdBy: userId,
    description,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OPERATION_TTL_SECONDS * 1000).toISOString(),
  };

  pendingOps.set(opId, operation);

  logger.info('[DestructiveOps] Pending confirmation prepared', {
    opId,
    commandType,
    userId,
    expiresAt: operation.expiresAt,
  });

  return { operationId: opId, description, expiresAt: operation.expiresAt };
}

/**
 * Retrieve a non-destructive pending confirmation.
 *
 * @param {string} operationId
 * @param {number} userId
 * @returns {{ verified: boolean, operation: Object|null, error: string|null }}
 */
export function retrievePendingConfirmation(operationId, userId) {
  const operation = pendingOps.get(operationId);

  if (!operation || operation.kind !== 'pending_confirmed') {
    return { verified: false, operation: null, error: 'Pending confirmation not found or already used.' };
  }

  if (new Date(operation.expiresAt).getTime() < Date.now()) {
    pendingOps.delete(operationId);
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

  // Single-use — delete immediately on successful retrieval
  pendingOps.delete(operationId);
  return { verified: true, operation, error: null };
}

/**
 * Cancel a pending operation.
 *
 * @param {string} operationId
 * @param {number} userId
 * @returns {boolean}
 */
export function cancelOperation(operationId, userId) {
  const operation = pendingOps.get(operationId);
  if (!operation) return false;
  if (operation.createdBy !== userId) return false;

  pendingOps.delete(operationId);
  logger.info('[DestructiveOps] Operation cancelled', { opId: operationId, userId });
  return true;
}

/**
 * Get count of pending operations for a user.
 * @param {number} userId
 * @returns {number}
 */
export function getPendingCount(userId) {
  let count = 0;
  const now = Date.now();
  for (const op of pendingOps.values()) {
    if (op.createdBy === userId && new Date(op.expiresAt).getTime() > now) {
      count++;
    }
  }
  return count;
}
