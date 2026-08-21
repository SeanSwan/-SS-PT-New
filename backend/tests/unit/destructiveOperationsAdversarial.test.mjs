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
import { describe, expect, it } from 'vitest';
import {
  cancelOperation,
  prepareDestructiveOperation,
  verifyAndRetrieveOperation,
} from '../../services/ai/destructiveOperations.mjs';

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
    // NOTE ON SCOPE — this asserts the signature EXISTS and that the fields it covers
    // survive the round trip. It does NOT prove tampering is rejected, because
    // `pendingOps` is module-private and no exported seam lets a test mutate a stored
    // record between mint and verify. Rejection-on-tamper is asserted by reading
    // `verifySignature()` (timingSafeEqual, destroys the op on mismatch), and becomes
    // genuinely testable in S2 when the store moves behind an injectable adapter.
    // Do not rename this test to claim more than it checks.
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
