/**
 * destructiveOperationsStoreSeam.test.mjs
 * ======================================
 * Split out of destructiveOperationsAdversarial.test.mjs on 2026-08-21 when that
 * file crossed the 300-line cap (Rule 4). Different slice, different subject: the
 * sibling file locks the S11 approval-lane contract; this one exercises the S2
 * store seam and the production safety guard.
 *
 * WHY THE SEAM MATTERS TO TESTS: before it, `pendingOps` was a module-private Map,
 * so no test could mutate a stored record between mint and verify — tamper-rejection
 * could only be READ from the source, never asserted. A6 in the sibling file said so
 * explicitly and promised these tests once the seam existed. A15-A17 are that debt
 * paid; A18-A21 cover the boot guard; A22 covers expiry enforcement, which was also
 * unreachable before the seam.
 *
 * See: docs/ai-workflow/AI-HANDOFF/SWAN-COACH-JARVIS-READINESS-CORRECTED-2026-08-21.md
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  prepareDestructiveOperation,
  verifyAndRetrieveOperation,
} from '../../services/ai/destructiveOperations.mjs';
import {
  assertStoreIsSafeForEnvironment,
  createInProcessStore,
  getPendingOperationStore,
  resetPendingOperationStore,
  setPendingOperationStore,
} from '../../services/ai/pendingOperationStore.mjs';

const OWNER = 1001;
const ATTACKER = 2002;

/** Mint a standard scoped destructive operation owned by `userId`. */
function mint(userId = OWNER, overrides = {}) {
  return prepareDestructiveOperation({
    type: 'DELETE',
    endpoint: '/api/sessions/:id',
    commandType: 'cancel_session',
    commandParams: { id: 184 },
    userId,
    description: 'Cancel session 184',
    affectedRecords: [{ id: 184 }],
    ...overrides,
  });
}

describe('approval lane — tamper rejection (S2 seam)', () => {
  afterEach(() => resetPendingOperationStore());

  /** A store that lets a test mutate the record after it is minted. */
  function tamperingStore(mutate) {
    const inner = createInProcessStore();
    return {
      ...inner,
      kind: 'tampering-test-double',
      durable: false,
      get: (id) => {
        const op = inner.get(id);
        if (!op) return op;
        mutate(op);
        return op;
      },
      get size() { return inner.size; },
    };
  }

  it('A15: tampering with params after mint is rejected, and destroys the operation', () => {
    setPendingOperationStore(tamperingStore((op) => { op.params = { id: 999 }; }));

    const pending = mint(OWNER, { commandParams: { id: 184 } });
    const result = verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
    expect(result.error).toMatch(/signature invalid|tampering/i);

    // Destroyed on detection — a tampered operation must not survive for a retry.
    expect(getPendingOperationStore().get(pending.operationId)).toBeUndefined();
  });

  it('A16: tampering with commandType is rejected (the HMAC covers it)', () => {
    // commandType was added to the signed payload deliberately. If it ever falls out
    // of signOperation(), an attacker who could reach the store could swap a low-risk
    // command for a destructive one and keep a valid signature. This test fails if
    // that regression happens.
    setPendingOperationStore(tamperingStore((op) => { op.commandType = 'delete_client'; }));

    const pending = mint(OWNER, { commandType: 'cancel_session' });
    const result = verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });

  it('A17: tampering with createdBy is rejected (ownership cannot be reassigned)', () => {
    setPendingOperationStore(tamperingStore((op) => { op.createdBy = ATTACKER; }));

    const pending = mint(OWNER);

    // The ownership check runs before signature verification, so the attacker is
    // stopped there. Either gate is an acceptable rejection — what must never happen
    // is a verified:true.
    expect(verifyAndRetrieveOperation(pending.operationId, ATTACKER).verified).toBe(false);
    expect(verifyAndRetrieveOperation(pending.operationId, OWNER).verified).toBe(false);
  });
});

describe('store safety guard (S2)', () => {
  afterEach(() => resetPendingOperationStore());

  it('A18: the in-process store is flagged UNSAFE in production', () => {
    const logged = [];
    const result = assertStoreIsSafeForEnvironment({
      nodeEnv: 'production',
      store: createInProcessStore(),
      log: { error: (msg, meta) => logged.push({ msg, meta }) },
    });

    expect(result.safe).toBe(false);
    expect(result.reason).toMatch(/cannot be confirmed on another/i);
    expect(logged).toHaveLength(1);
    expect(logged[0].meta.durable).toBe(false);
    expect(logged[0].meta.remedy).toMatch(/REDIS_URL/);
  });

  it('A19: the in-process store is fine outside production, and never throws', () => {
    for (const nodeEnv of ['development', 'test', undefined]) {
      const result = assertStoreIsSafeForEnvironment({
        nodeEnv,
        store: createInProcessStore(),
        log: { error: () => { throw new Error('must not log in non-production'); } },
      });
      expect(result.safe).toBe(true);
    }
  });

  it('A20: a durable store passes the guard even in production', () => {
    const durable = { ...createInProcessStore(), kind: 'redis', durable: true };
    const result = assertStoreIsSafeForEnvironment({
      nodeEnv: 'production',
      store: durable,
      log: { error: () => { throw new Error('must not log for a durable store'); } },
    });

    expect(result.safe).toBe(true);
  });

  it('A22: an EXPIRED operation is rejected and destroyed', () => {
    // Gap found in the S2 hostile round: A12 asserts the TTL is finite but nothing
    // asserted that expiry is actually ENFORCED. Before the seam this could not be
    // tested without faking timers, because the stored record was unreachable.
    const inner = createInProcessStore();
    setPendingOperationStore({
      ...inner,
      get: (id) => {
        const op = inner.get(id);
        if (op) op.expiresAt = new Date(Date.now() - 1000).toISOString();
        return op;
      },
      get size() { return inner.size; },
    });

    const pending = mint(OWNER);
    const result = verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
    expect(result.error).toMatch(/expired/i);

    // An expired operation must not linger for a second attempt.
    expect(getPendingOperationStore().get(pending.operationId)).toBeUndefined();
  });

  it('A21: setPendingOperationStore rejects a malformed store', () => {
    expect(() => setPendingOperationStore(null)).toThrow(/requires a store/i);
    expect(() => setPendingOperationStore({ get: () => {} })).toThrow(/requires a store/i);
  });
});
