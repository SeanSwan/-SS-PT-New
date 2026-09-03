/**
 * Destructive Operation Manager — HMAC-Signed Two-Phase Commit
 * =============================================================
 * Manages destructive AI-initiated operations with cryptographic signing.
 * Operations are prepared (preview), then executed only after user confirmation.
 *
 * Pipeline position: ... → ConfirmationGenerator → **DestructiveOps** → Executor → Auditor
 *
 * 0.3/0.4 (2026-09-02) — the standing P0 dies here:
 *   - OPERATION_SIGNING_KEY is REQUIRED. The `|| crypto.randomBytes(32)` fallback
 *     meant a per-process secret: every deploy silently voided in-flight approvals
 *     and two instances could never verify each other. Unset/short key now refuses
 *     at boot (assertOperationSigningKey) and at first use — never a random key.
 *   - The store API is ASYNC (Redis-ready). One-time consumption is enforced on the
 *     store's delete() RETURN VALUE: whichever caller's delete returns true owns the
 *     operation; every other concurrent confirm loses. GET-then-DEL is not atomic —
 *     the DEL is (see pendingOperationStore.mjs).
 *   - The HMAC now signs `description` and a hash of the affected-records preview —
 *     the two fields the human actually READS. Signing only machine fields meant a
 *     store-level tamper could change what the approver sees while verification
 *     passed (flash review F17g/FF25, 2026-09-01).
 *   - `params` are deep-copied at mint. The shallow spread shared nested references
 *     with caller state, so post-mint mutation of a nested object was invisible to
 *     the signature.
 *   - The explicit-scope law covers EVERY destructive type, not just DELETE — an
 *     unscoped UPDATE/DEACTIVATE/LOCK with `params: {}` no longer passes prepare.
 *   - `pending_confirmed` (non-destructive) operations are HMAC-signed too; they
 *     previously carried no integrity binding at all.
 */
import crypto from 'crypto';
import logger from '../../utils/logger.mjs';
import { getPendingOperationStore } from './pendingOperationStore.mjs';
import { recordApprovalEvent, APPROVAL_EVENTS } from './approvalEvents.mjs';
import {
  assertOperationSigningKey,
  signOperation,
  verifySignature,
  signPendingConfirmation,
} from './operationSigning.mjs';

// Re-exported so core/startup.mjs, commandExecutor and the S1 tests keep ONE
// import surface — the split (Rule 4 cap) must not ripple through callers.
export { assertOperationSigningKey };
export { preparePendingConfirmation, retrievePendingConfirmation } from './pendingConfirmations.mjs';
export { countPendingForUser as getPendingCount } from './pendingOperationStore.mjs';
import { countPendingForUser as getPendingCount } from './pendingOperationStore.mjs';

const MAX_AI_BULK_DELETE = 50;
const OPERATION_TTL_SECONDS = 120;
const MAX_PENDING_PER_USER = 5;

/** Scope = one named entity (`id` / any `*Id`) or a bounded dateRange, non-empty. */
export function hasExplicitScope(params) {
  if (!params || typeof params !== 'object') return false;
  return Object.entries(params).some(([k, v]) =>
    (k === 'id' || k === 'dateRange' || /Id$/.test(k)) && v !== null && v !== undefined && v !== '');
}

// The pending-approval store lives behind an injectable seam (pendingOperationStore.mjs).
// Contract audited 2026-09-02 across all call sites in this module: get / set / delete /
// countForUser (all async), plus entries() for the in-process expiry sweep only.
const store = () => getPendingOperationStore();

// Expiry sweep: only meaningful for the in-process store — a durable store owns its
// own TTL (PSETEX). Guarded on capability, not kind, so a future store that DOES
// need sweeping can opt in by exposing entries().
const cleanupTimer = setInterval(async () => {
  try {
    const s = store();
    if (typeof s.entries !== 'function') return;
    const now = Date.now();
    for (const [id, op] of s.entries()) {
      if (new Date(op.expiresAt).getTime() < now) {
        await s.delete(id);
      }
    }
  } catch (err) {
    logger.warn('[DestructiveOps] expiry sweep failed', { error: err.message });
  }
}, 60000);
cleanupTimer.unref();

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
 * @returns {Promise<Object>} Pending operation summary
 */
export async function prepareDestructiveOperation({
  type,
  endpoint,
  commandParams,
  commandType,      // exec-substrate-v9: command-lane type (e.g. 'cancel_session'); HMAC-signed
  userId,
  actorRole = null,   // card 1.0: audit rows require a role; null is skipped, not faked
  description,
  affectedRecords = [],
  /**
   * F-12: the client this operation is bound to, TOP-LEVEL. It was reachable
   * only inside `params`, so a caller reading `operation.clientId` — which the
   * confirmation sheet does, to render the chip — got undefined and rendered
   * "no client" over an operation that had one.
   */
  clientId = null,
  /**
   * F-03: the M3 verdict, decided HERE because this is where the spoken-name /
   * selection evidence exists, and enforced at /confirm because that is where
   * the channel is declared. Splitting it that way is the point: the surface
   * that could be fooled is not the surface that decides.
   */
  requiresPhysicalConfirm = false,
}) {
  // 0.4a (was V3 DELETE-only): EVERY destructive type requires explicit scope.
  // An unscoped UPDATE or DEACTIVATE with `params: {}` is the same mass-mutation
  // hazard as an unscoped DELETE — the scope law is about blast radius, not verb.
  // "Scoped" = names ONE entity: `id`, any `*Id` key (planId, postId, permissionId,
  // sessionId, clientId...), or a bounded `dateRange`. The 5.0 draft hardcoded five
  // key names and would have refused delete_workout_plan / delete_post /
  // revoke_trainer_permission at mint (Fable 5.1 hostile pass, 2026-09-02);
  // tests/unit/destructiveScopeLawRegistry.test.mjs now locks the law to the registry.
  if (!hasExplicitScope(commandParams)) {
    throw new Error(
      `CRITICAL: ${type} requires explicit scope (an entity id such as clientId/planId/postId, or a dateRange). Unscoped destructive operations are blocked.`
    );
  }

  // V3: cap on the PREVIEW the caller supplies - NOT a database row cap.
  //
  // H8 honesty (2026-08-21 hostile round 1, Sol): this only bounds
  // `affectedRecords.length`, and the executor populates that with at most the
  // one resolved client. It cannot see how many rows a dispatcher will touch.
  // It is SAFE today because every registered destructive command is
  // single-entity by construction (:clientId, :planId, :sessionId, :postId...),
  // which tests/unit/destructiveCommandsSingleEntity.test.mjs now locks. If a
  // bulk/date-range destructive command is ever registered, that test fails and
  // this cap must be replaced by a DB-side preview count over the frozen
  // predicate - do not rely on this check for that.
  if (affectedRecords.length > MAX_AI_BULK_DELETE) {
    throw new Error(
      `CRITICAL: Would affect ${affectedRecords.length} records. Max: ${MAX_AI_BULK_DELETE}. Use manual deletion for bulk operations.`
    );
  }

  // Per-user cap to prevent memory exhaustion via rapid operation creation.
  const userPendingCount = await getPendingCount(userId);
  if (userPendingCount >= MAX_PENDING_PER_USER) {
    throw new Error(`Too many pending operations (${userPendingCount}). Please confirm or cancel existing operations first.`);
  }

  const opId = crypto.randomUUID();
  const operation = {
    id: opId,
    type,
    endpoint,
    commandType: commandType ?? null,  // signed in HMAC payload — tampering detected on verify
    // 0.4a: deep copy — a shallow spread shared nested references with caller
    // state, so post-mint mutation of a nested object bypassed the signature.
    params: structuredClone(commandParams),
    clientId: Number.isSafeInteger(Number(clientId)) && Number(clientId) > 0 ? Number(clientId) : null,
    requiresPhysicalConfirm: Boolean(requiresPhysicalConfirm),
    affectedRecords: affectedRecords.slice(0, 10), // Max 10 in preview
    affectedCount: affectedRecords.length,
    createdBy: userId,
    description,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + OPERATION_TTL_SECONDS * 1000).toISOString(),
    signature: '',
  };
  operation.signature = signOperation(operation);

  await store().set(opId, operation, OPERATION_TTL_SECONDS * 1000);

  logger.info('[DestructiveOps] Operation prepared', {
    opId,
    type,
    endpoint,
    affectedCount: affectedRecords.length,
    userId,
    expiresAt: operation.expiresAt,
  });
  // Card 1.0: countable lifecycle. Best-effort by inheritance — never awaited
  // into the user's critical path beyond the audit writer's own contract.
  void recordApprovalEvent({
    event: APPROVAL_EVENTS.MINTED, userId, userRole: actorRole,
    commandType: commandType ?? null, operationId: opId, destructive: true,
  });

  return {
    operationId: opId,
    type,
    description,
    affectedRecords: operation.affectedRecords,
    affectedCount: operation.affectedCount,
    expiresAt: operation.expiresAt,
    requiresConfirmation: true,
    requiresPhysicalConfirm: operation.requiresPhysicalConfirm,
  };
}

/**
 * Execute a previously prepared destructive operation.
 * Verifies: ownership, expiration, HMAC signature — then CONSUMES atomically:
 * only the caller whose store.delete() returns true owns the operation.
 *
 * @param {string} operationId - The operation ID from prepare()
 * @param {number} userId - ID of user confirming (must match creator)
 * @returns {Promise<{ verified: boolean, operation: Object|null, error: string|null }>}
 */
export async function verifyAndRetrieveOperation(operationId, userId, actorRole = null) {
  const operation = await store().get(operationId);

  if (!operation || operation.kind === 'pending_confirmed') {
    return { verified: false, operation: null, error: 'Operation expired or not found. Please re-issue the command.' };
  }

  // Check expiration
  if (new Date(operation.expiresAt).getTime() < Date.now()) {
    await store().delete(operationId);
    void recordApprovalEvent({
      event: APPROVAL_EVENTS.EXPIRED, userId, userRole: actorRole,
      commandType: operation.commandType, operationId, destructive: true,
    });
    return { verified: false, operation: null, error: 'Operation expired (120s). Please re-issue the command.' };
  }

  // Check ownership BEFORE any consumption — a wrong user must never be able to
  // consume (grief) someone else's pending approval (GLM 2.4).
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
      await store().delete(operationId);
      return { verified: false, operation: null, error: 'Operation signature invalid. Possible tampering detected.' };
    }
  } catch (err) {
    logger.error('[DestructiveOps] Signature verification error', { error: err.message });
    return { verified: false, operation: null, error: 'Signature verification failed.' };
  }

  // ATOMIC one-time consumption: the delete's return value is the ownership token.
  // Two racing confirms both pass the checks above; exactly one delete returns true.
  const consumed = await store().delete(operationId);
  if (!consumed) {
    void recordApprovalEvent({
      event: APPROVAL_EVENTS.ALREADY_CONFIRMED, userId, userRole: actorRole,
      commandType: operation.commandType, operationId, destructive: true,
    });
    return { verified: false, operation: null, error: 'Operation was already confirmed. It only executes once.' };
  }

  void recordApprovalEvent({
    event: APPROVAL_EVENTS.CONSUMED, userId, userRole: actorRole,
    commandType: operation.commandType, operationId, destructive: true,
  });
  return { verified: true, operation, error: null };
}

/**
 * Read a pending operation WITHOUT consuming it — the source of truth the
 * confirmation UI renders (card 1.1 / M1). Before this existed the UI rendered
 * the REQUEST (`ctx.intent.params`) while the executor ran the STORED op, so the
 * two could differ by construction (the server injects clientId at mint) and
 * nothing detected it.
 *
 * Ownership and expiry are enforced here. The signature is NEVER returned: it is
 * the server's proof, and a client that holds it could forge a matching payload.
 * Not-found and not-owner return the SAME shape so this cannot become an
 * existence oracle for another user's operation ids.
 *
 * @returns {Promise<{ found: boolean, operation: Object|null }>}
 */
export async function peekOperation(operationId, userId) {
  const operation = await store().get(operationId);
  if (!operation) return { found: false, operation: null };
  if (operation.createdBy !== userId) return { found: false, operation: null };
  if (new Date(operation.expiresAt).getTime() < Date.now()) return { found: false, operation: null };

  const { signature, ...safe } = operation;
  return { found: true, operation: safe };
}

/**
 * Cancel a pending operation.
 *
 * @param {string} operationId
 * @param {number} userId
 * @returns {Promise<boolean>}
 */
export async function cancelOperation(operationId, userId, actorRole = null) {
  const operation = await store().get(operationId);
  if (!operation) return false;
  if (operation.createdBy !== userId) return false;

  const removed = await store().delete(operationId);
  if (removed) {
    logger.info('[DestructiveOps] Operation cancelled', { opId: operationId, userId });
    void recordApprovalEvent({
      event: APPROVAL_EVENTS.CANCELLED, userId, userRole: actorRole,
      commandType: operation.commandType, operationId,
    });
  }
  return removed;
}

