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
 * SPLIT 2026-08-21: the S2 store-seam cases (tamper rejection A15-A17, store
 * safety guard A18-A22) moved to destructiveOperationsStoreSeam.test.mjs when this
 * file crossed the 300-line cap (Rule 4). They are a different slice testing a
 * different subject; this file stays the S11 approval-lane lock.
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
async function mint(userId = OWNER, overrides = {}) {
  return await prepareDestructiveOperation({
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
  it('A1: confirm-without-mint is rejected (no forged operationId is accepted)', async () => {
    const result = await verifyAndRetrieveOperation('00000000-0000-4000-8000-000000000000', OWNER);

    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
    expect(result.error).toMatch(/not found/i);
  });

  it('A2: replay is rejected — a consumed operationId cannot be reused', async () => {
    const pending = await mint();

    const first = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(first.verified).toBe(true);
    expect(first.operation.commandType).toBe('cancel_session');

    // One-time consumption: the same id must not verify a second time.
    const replay = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(replay.verified).toBe(false);
    expect(replay.operation).toBeNull();
  });

  it('A3: cross-user confirm is rejected — approvals are actor-bound', async () => {
    const pending = await mint(OWNER);

    const stolen = await verifyAndRetrieveOperation(pending.operationId, ATTACKER);
    expect(stolen.verified).toBe(false);
    expect(stolen.operation).toBeNull();
    expect(stolen.error).toMatch(/another user/i);

    await cancelOperation(pending.operationId, OWNER);
  });

  it('A4: a cross-user attempt does NOT consume the owner\'s pending operation', async () => {
    const pending = await mint(OWNER);

    expect((await verifyAndRetrieveOperation(pending.operationId, ATTACKER)).verified).toBe(false);

    // The rightful owner must still be able to confirm — a failed theft is not a DoS.
    const owner = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(owner.verified).toBe(true);
  });

  it('A5: params are frozen at mint — the caller cannot alter them at confirm time', async () => {
    const pending = await mint(OWNER, { commandParams: { id: 184, cascade: false } });

    // WHAT THIS DOES AND DOES NOT PROVE. `Function.length` stops counting at the
    // first parameter with a default, so a third OPTIONAL argument — the most likely
    // shape for a regression that reintroduced a confirm-time params channel — would
    // sail past this. It is a cheap tripwire on the service helper's shape, nothing
    // more. The load-bearing assertion is the stored-params check below: params come
    // from the record minted earlier, never from the confirm call.
    //
    // Neither assertion reaches the HTTP layer. A route handler could still read a
    // body flag and skip the ceremony; only an API-level test of POST /confirm would
    // rule that out, and this file does not have one. Tracked in SWA-142.
    expect(verifyAndRetrieveOperation).toHaveLength(2);

    const result = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(true);
    expect(result.operation.params).toEqual({ id: 184, cascade: false });
  });

  it('A6: every minted operation carries an HMAC signature over its identifying fields', async () => {
    // Scope note (kept): this asserts the signature EXISTS and that the fields it
    // covers survive the round trip. Tamper-REJECTION is now asserted separately in
    // A15-A17, which the S2 store seam made possible. Do not rename this test to
    // claim more than it checks.
    const pending = await mint(OWNER);
    const retrieved = await verifyAndRetrieveOperation(pending.operationId, OWNER);

    expect(retrieved.verified).toBe(true);
    expect(retrieved.operation.signature).toMatch(/^[0-9a-f]{64}$/); // sha256 hex
    expect(retrieved.operation.commandType).toBe('cancel_session');
    expect(retrieved.operation.createdBy).toBe(OWNER);
  });

  it('A7: unscoped DELETE is refused at mint (no mass deletion is representable)', async () => {
    await expect(prepareDestructiveOperation({
        type: 'DELETE',
        endpoint: '/api/sessions',
        commandType: 'cancel_session',
        commandParams: { reason: 'cleanup' }, // no id / clientId / userId / dateRange
        userId: OWNER,
        description: 'Delete everything',
        affectedRecords: [],
      })).rejects.toThrow(/explicit scope/i);
  });

  it('A8: bulk blast radius is capped at 50 affected records', async () => {
    const tooMany = Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }));

    await expect(prepareDestructiveOperation({
        type: 'DELETE',
        endpoint: '/api/sessions/:id',
        commandType: 'cancel_session',
        commandParams: { clientId: 7 },
        userId: OWNER,
        description: 'Bulk cancel',
        affectedRecords: tooMany,
      })).rejects.toThrow(/Max: 50/);
  });

  it('A9: pending operations are capped per user (memory-exhaustion guard)', async () => {
    const minted = [];
    for (let i = 0; i < 5; i += 1) {
      minted.push(await mint(ATTACKER, { commandParams: { id: 900 + i } }));
    }

    await expect(mint(ATTACKER, { commandParams: { id: 999 } })).rejects.toThrow(/Too many pending/i);

    for (const op of minted) await cancelOperation(op.operationId, ATTACKER);
  });

  it('A10: cancel is also actor-bound — one user cannot cancel another\'s operation', async () => {
    const pending = await mint(OWNER);

    expect(await cancelOperation(pending.operationId, ATTACKER)).toBe(false);
    expect(await cancelOperation(pending.operationId, OWNER)).toBe(true);
  });

  it('A11: a cancelled operation can never be confirmed', async () => {
    const pending = await mint(OWNER);
    expect(await cancelOperation(pending.operationId, OWNER)).toBe(true);

    const result = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(false);
    expect(result.operation).toBeNull();
  });

  it('A12: every minted operation carries a finite TTL (no immortal approvals)', async () => {
    const pending = await mint(OWNER);

    const ttlMs = new Date(pending.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(120_000);
    expect(pending.requiresConfirmation).toBe(true);

    await cancelOperation(pending.operationId, OWNER);
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

  it('A14: the kill switch disables on what an operator actually types, and fails OPEN only on garbage', async () => {
    // CONTRACT CHANGE (card 1.5, finding FF23 — GLM 5.3-flash, 2026-09-01).
    //
    // This case previously asserted the opposite: that 'FALSE', '0' and 'off' do
    // NOT disable writes, locked in as "a deliberate house choice" so a typo'd
    // env var could never dark-launch an outage. The inverted property is the
    // dangerous one — a typo could never STOP one. An operator reaching for the
    // kill switch mid-incident types whatever their fingers produce, and every
    // one of those values left the lane hot while they believed writes were
    // paused. For a kill switch, availability-of-DISABLE dominates.
    //
    // What is preserved: unset, empty, and unrecognised values still fail OPEN,
    // so a missing variable cannot take the lane down. Unrecognised values are
    // now REPORTED (describeLaneControls) rather than silently read as "on".
    const { areCommandWritesEnabled, isNonCanonicalFlagValue } =
      await import('../../services/ai/commandLaneControls.mjs');
    const previous = process.env.AI_COMMAND_WRITES_ENABLED;

    try {
      for (const value of ['false', 'FALSE', 'False', ' false ', '0', 'no', 'off']) {
        process.env.AI_COMMAND_WRITES_ENABLED = value;
        expect(areCommandWritesEnabled(), `${JSON.stringify(value)} must disable writes`).toBe(false);
      }

      for (const value of ['', 'true', 'on', '1']) {
        process.env.AI_COMMAND_WRITES_ENABLED = value;
        expect(areCommandWritesEnabled(), `${JSON.stringify(value)} must leave writes enabled`).toBe(true);
      }

      // Garbage fails OPEN — but loudly, so the operator finds out from the logs
      // rather than from an incident that would not stop.
      process.env.AI_COMMAND_WRITES_ENABLED = 'flase';
      expect(areCommandWritesEnabled()).toBe(true);
      expect(isNonCanonicalFlagValue('flase')).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.AI_COMMAND_WRITES_ENABLED;
      else process.env.AI_COMMAND_WRITES_ENABLED = previous;
    }
  });
});
