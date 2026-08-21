/**
 * destructiveOperationsAdversarial.test.mjs
 * =========================================
 * Locks the approval lane against regression.
 *
 * Origin: the 2026-08-20 "Jarvis Readiness Audit" claimed as its headline P0 that
 * the backend accepts a client-supplied `confirmation.confirmed === true`, letting
 * an authenticated caller skip the confirmation ceremony. A five-seat hostile review
 * (Claude Opus 5 + GLM 5.3 + Kimi K3 + Grok 4.6 + Qwen 3.8) verified that claim to
 * be FALSE at 66ffde607: `POST /confirm` accepts only an `operationId`, and this
 * module already implements HMAC two-phase commit.
 *
 * These behaviours were previously asserted by reading the source. This file makes
 * them EXECUTABLE, so they cannot silently regress — and so the upcoming S1/S2
 * slices (require OPERATION_SIGNING_KEY; move `pendingOps` to a shared store)
 * cannot weaken the contract while refactoring it.
 *
 * See: docs/ai-workflow/AI-HANDOFF/SWAN-COACH-JARVIS-READINESS-CORRECTED-2026-08-21.md
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  cancelOperation,
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

describe('approval lane — adversarial lock (S11)', () => {
  it('A1: confirm-without-mint is rejected (no forged operationId is accepted)', () => {
    const result = verifyAndRetrieveOperation('00000000-0000-4000-8000-000000000000', OWNER);

    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
    expect(result.error).toMatch(/not found/i);
  });

  it('A2: replay is rejected — a consumed operationId cannot be reused', () => {
    const pending = mint();

    const first = verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(first.verified).toBe(true);
    expect(first.operation.commandType).toBe('cancel_session');

    // One-time consumption: the same id must not verify a second time.
    const replay = verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(replay.verified).toBe(false);
    expect(replay.operation).toBeNull();
  });

  it('A3: cross-user confirm is rejected — approvals are actor-bound', () => {
    const pending = mint(OWNER);

    const stolen = verifyAndRetrieveOperation(pending.operationId, ATTACKER);
    expect(stolen.verified).toBe(false);
    expect(stolen.operation).toBeNull();
    expect(stolen.error).toMatch(/another user/i);

    cancelOperation(pending.operationId, OWNER);
  });

  it('A4: a cross-user attempt does NOT consume the owner\'s pending operation', () => {
    const pending = mint(OWNER);

    expect(verifyAndRetrieveOperation(pending.operationId, ATTACKER).verified).toBe(false);

    // The rightful owner must still be able to confirm — a failed theft is not a DoS.
    const owner = verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(owner.verified).toBe(true);
  });

  it('A5: params are frozen at mint — the caller cannot alter them at confirm time', () => {
    const pending = mint(OWNER, { commandParams: { id: 184, cascade: false } });

    // The confirm contract takes ONLY (operationId, userId). There is no parameter
    // channel at confirm time — this is the property the audit claimed was missing.
    expect(verifyAndRetrieveOperation).toHaveLength(2);

    const result = verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(true);
    expect(result.operation.params).toEqual({ id: 184, cascade: false });
  });

  it('A6: every minted operation carries an HMAC signature over its identifying fields', () => {
    // Scope note (kept): this asserts the signature EXISTS and that the fields it
    // covers survive the round trip. Tamper-REJECTION is now asserted separately in
    // A15-A17, which the S2 store seam made possible. Do not rename this test to
    // claim more than it checks.
    const pending = mint(OWNER);
    const retrieved = verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(retrieved.verified).toBe(true);
    expect(retrieved.operation.signature).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(retrieved.operation.commandType).toBe('cancel_session');
    expect(retrieved.operation.createdBy).toBe(OWNER);
  });

  it('A7: unscoped DELETE is refused at mint (no mass deletion is representable)', () => {
    expect(() =>
      prepareDestructiveOperation({
        type: 'DELETE',
        endpoint: '/api/sessions',
        commandType: 'cancel_session',
        commandParams: { reason: 'cleanup' }, // no id / clientId / userId / dateRange
        userId: OWNER,
        description: 'Delete everything',
        affectedRecords: [],
      })
    ).toThrow(/explicit scope/i);
  });

  it('A8: bulk blast radius is capped at 50 affected records', () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }));

    expect(() =>
      prepareDestructiveOperation({
        type: 'DELETE',
        endpoint: '/api/sessions/:id',
        commandType: 'cancel_session',
        commandParams: { clientId: 7 },
        userId: OWNER,
        description: 'Bulk cancel',
        affectedRecords: tooMany,
      })
    ).toThrow(/Max: 50/);
  });

  it('A9: pending operations are capped per user (memory-exhaustion guard)', () => {
    const minted = [];
    for (let i = 0; i < 5; i += 1) {
      minted.push(mint(ATTACKER, { commandParams: { id: 900 + i } }));
    }

    expect(() => mint(ATTACKER, { commandParams: { id: 999 } })).toThrow(/Too many pending/i);

    minted.forEach((op) => cancelOperation(op.operationId, ATTACKER));
  });

  it('A10: cancel is also actor-bound — one user cannot cancel another\'s operation', () => {
    const pending = mint(OWNER);

    expect(cancelOperation(pending.operationId, ATTACKER)).toBe(false);
    expect(cancelOperation(pending.operationId, OWNER)).toBe(true);
  });

  it('A11: a cancelled operation can never be confirmed', () => {
    const pending = mint(OWNER);
    expect(cancelOperation(pending.operationId, OWNER)).toBe(true);

    const result = verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
  });

  it('A12: every minted operation carries a finite TTL (no immortal approvals)', () => {
    const pending = mint(OWNER);

    const ttlMs = new Date(pending.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(120_000);
    expect(pending.requiresConfirmation).toBe(true);

    cancelOperation(pending.operationId, OWNER);
  });
});

/**
 * A15-A17 exist because of the S2 store seam. Before it, `pendingOps` was a
 * module-private Map and no test could mutate a stored record between mint and
 * verify — so tamper-rejection could only be READ, never asserted. A6 said so and
 * promised these tests. Here they are.
 */
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

  it('A21: setPendingOperationStore rejects a malformed store', () => {
    expect(() => setPendingOperationStore(null)).toThrow(/requires a store/i);
    expect(() => setPendingOperationStore({ get: () => {} })).toThrow(/requires a store/i);
  });
});

describe('approval lane — write kill switch (S11)', () => {
  it('A13: a confirmed operation cannot execute once writes are paused', async () => {
    const previous = process.env.AI_COMMAND_WRITES_ENABLED;
    process.env.AI_COMMAND_WRITES_ENABLED = 'false';

    try {
      const { executeConfirmedOperation } = await import('../../services/ai/commandExecutor.mjs');

      // The kill-switch check runs before any store or DB access, so a null sequelize
      // is sufficient to prove the gate fires first. If this ever reaches the DB, the
      // gate has moved and this test must fail loudly rather than silently pass.
      const result = await executeConfirmedOperation('any-operation-id', { id: OWNER, role: 'admin' }, null);

      expect(result.success).toBe(false);
      expect(result.type).toBe('error');
      expect(result.message).toMatch(/paused/i);
    } finally {
      if (previous === undefined) delete process.env.AI_COMMAND_WRITES_ENABLED;
      else process.env.AI_COMMAND_WRITES_ENABLED = previous;
    }
  });

  it('A14: the kill switch is fail-OPEN by design — only the exact string "false" disables', async () => {
    // This is a deliberate house choice (commandLaneControls.mjs header: a missing or
    // typo'd env var must never dark-launch an outage). Locking it here so the
    // trade-off stays visible: 'FALSE', '0' and 'off' do NOT disable writes.
    const { areCommandWritesEnabled } = await import('../../services/ai/commandLaneControls.mjs');
    const previous = process.env.AI_COMMAND_WRITES_ENABLED;

    try {
      for (const value of ['FALSE', '0', 'off', 'no', '']) {
        process.env.AI_COMMAND_WRITES_ENABLED = value;
        expect(areCommandWritesEnabled()).toBe(true);
      }

      process.env.AI_COMMAND_WRITES_ENABLED = 'false';
      expect(areCommandWritesEnabled()).toBe(false);
    } finally {
      if (previous === undefined) delete process.env.AI_COMMAND_WRITES_ENABLED;
      else process.env.AI_COMMAND_WRITES_ENABLED = previous;
    }
  });
});
