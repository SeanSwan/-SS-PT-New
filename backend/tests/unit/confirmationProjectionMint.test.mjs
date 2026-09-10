/**
 * SCU G02 / T08-policy + T10 — RED. The stored confirmation projection must be
 * (a) STAMPED at both mints, (b) BOUND INTO the HMAC signature, and (c) the
 * registry must own reversibility so the sheet never needs a client-side
 * fallback list.
 *
 * Today both mints store only `requiresPhysicalConfirm`; the signature binds
 * description + affected-records hash + physical + expiry; and the command
 * registry declares `reversibility: 'none'` for EVERY command via
 * commandPolicy.mjs — which is a blanket, not a declaration. So every
 * projection assertion below fails until S2 stamps the signed projection.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  prepareDestructiveOperation,
  verifyAndRetrieveOperation,
  peekOperation,
} from '../../services/ai/destructiveOperations.mjs';
import {
  preparePendingConfirmation,
  retrievePendingConfirmation,
} from '../../services/ai/pendingConfirmations.mjs';
import {
  createInProcessStore,
  getPendingOperationStore,
  resetPendingOperationStore,
  setPendingOperationStore,
} from '../../services/ai/pendingOperationStore.mjs';
import { initializeRegistry, getAllCommands, getCommand } from '../../services/ai/commandRegistry/index.mjs';

const OWNER = 5001;

beforeEach(() => { resetPendingOperationStore(); initializeRegistry(); });
afterEach(() => resetPendingOperationStore());

function tamperingStore(mutate) {
  const inner = createInProcessStore();
  return {
    ...inner,
    kind: 'tampering-test-double',
    durable: false,
    get: async (id) => { const op = await inner.get(id); if (op) mutate(op); return op; },
    get size() { return inner.size; },
  };
}

describe('T08/T09 — destructive mint stamps a signed v2 projection', () => {
  it('the stored record carries a policyVersion-2 projection with the full field set', async () => {
    const pending = await prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/:id',
      commandType: 'cancel_session',
      commandParams: { sessionId: 184, clientId: 61 },
      userId: OWNER,
      actorRole: 'trainer',
      description: 'Cancel session 184',
      affectedRecords: [{ id: 184 }],
      clientId: 61,
      requiresPhysicalConfirm: true,
    });

    const op = await getPendingOperationStore().get(pending.operationId);
    expect(op).toBeTruthy();
    expect(op.projection).toBeTruthy();
    expect(op.projection.policyVersion).toBe(2);
    expect(typeof op.projection.tier).toBe('string');
    expect(typeof op.projection.isDestructive).toBe('boolean');
    expect(op.projection.isDestructive).toBe(true);
    expect(op.projection.requiresPhysicalConfirm).toBe(true);
    expect(op.projection.affectedCount).toBe(1);
    expect(op.projection.targetUserId).toBe(61);
    expect(op.projection.entityRevision).toBeTruthy();
    expect(['none', 'inverse', 'compensation']).toContain(op.projection.reversibility);
    expect(typeof op.projection.expiresAt).toBe('string');
    expect(op.projection.displayFields).toMatchObject({
      commandType: 'cancel_session',
      affectedCount: 1,
      targetUser: 61,
    });
    expect(op.projection.displayFields.description).toMatch(/Cancel session 184/);
  });

  it('GET /pending exposes the projection (peekOperation strips only the signature)', async () => {
    const pending = await prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/:id',
      commandType: 'cancel_session',
      commandParams: { sessionId: 184, clientId: 61 },
      userId: OWNER,
      actorRole: 'trainer',
      description: 'Cancel session 184',
      affectedRecords: [{ id: 184 }],
      clientId: 61,
    });
    const peek = await peekOperation(pending.operationId, OWNER);
    expect(peek.found).toBe(true);
    expect(peek.operation.projection).toBeTruthy();
    expect(peek.operation.projection.policyVersion).toBe(2);
    expect(peek.operation.signature).toBeUndefined();
  });

  it('tampering with a projection field fails the signature and destroys the record', async () => {
    setPendingOperationStore(tamperingStore((op) => {
      if (op.projection) { op.projection.tier = 'fire_and_forget'; }
      else { op.projection = { policyVersion: 2, tier: 'fire_and_forget' }; }
    }));
    const pending = await prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/sessions/:id',
      commandType: 'cancel_session',
      commandParams: { sessionId: 184, clientId: 61 },
      userId: OWNER,
      actorRole: 'trainer',
      description: 'Cancel session 184',
      affectedRecords: [{ id: 184 }],
      clientId: 61,
    });
    const result = await verifyAndRetrieveOperation(pending.operationId, OWNER);
    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
    expect(await getPendingOperationStore().get(pending.operationId)).toBeUndefined();
  });
});

describe('T08/T09 — pending-confirmation mint stamps a signed v2 projection', () => {
  it('the stored record carries a policyVersion-2 projection (non-destructive lane)', async () => {
    const pending = await preparePendingConfirmation({
      commandType: 'log_workout',
      params: { exercise: 'bench' },
      clientId: 42,
      userId: OWNER,
      actorRole: 'trainer',
      description: 'Log a workout for Client-42',
    });
    const op = await getPendingOperationStore().get(pending.operationId);
    expect(op).toBeTruthy();
    expect(op.projection).toBeTruthy();
    expect(op.projection.policyVersion).toBe(2);
    expect(op.projection.isDestructive).toBe(false);
    expect(op.projection.targetUserId).toBe(42);
    expect(op.projection.affectedCount).toBeGreaterThanOrEqual(0);
    expect(typeof op.projection.tier).toBe('string');
    expect(['none', 'inverse', 'compensation']).toContain(op.projection.reversibility);
  });

  it('tampering with a projection field on the pending lane fails the signature', async () => {
    setPendingOperationStore(tamperingStore((op) => {
      if (op.projection) { op.projection.requiresPhysicalConfirm = true; }
      else { op.projection = { policyVersion: 2, requiresPhysicalConfirm: true }; }
    }));
    const pending = await preparePendingConfirmation({
      commandType: 'log_workout',
      params: { exercise: 'bench' },
      clientId: 42,
      userId: OWNER,
      actorRole: 'trainer',
      description: 'Log a workout for Client-42',
    });
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);
    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });
});

describe('T10 — the registry owns reversibility; no blanket default', () => {
  it('every mutating command declares an EXPLICIT reversibility (not the blanket policyVersion-1 "none")', () => {
    const mutating = getAllCommands().filter((c) => ['POST', 'PUT', 'PATCH', 'DELETE', 'FRONTEND_DISPATCH'].includes(c.method));
    expect(mutating.length).toBeGreaterThan(0);
    for (const command of mutating) {
      // The flag must exist on the registry entry itself. A value the adapter
      // invents for everyone is a blanket, not a declaration.
      expect(
        command.reversibility !== undefined || command.inverseCommand !== undefined,
        `registry entry ${command.type} declares no reversibility — the sheet would fall back to a client-side list`,
      ).toBe(true);
    }
  });

  it('at least one registry command declares an actual inverse (the blanket "none-for-all" is dead)', () => {
    const withInverse = getAllCommands().filter((c) => c.inverseCommand && typeof c.inverseCommand === 'string' && c.inverseCommand.length > 0);
    expect(withInverse.length).toBeGreaterThanOrEqual(1);
  });

  it('an irreversible command (e.g. notify_client) is declared as such in the registry', () => {
    const notify = getCommand('notify_client');
    expect(notify).toBeTruthy();
    const declared = notify.reversibility ?? notify.policy?.reversibility;
    expect(['none', 'inverse', 'compensation']).toContain(declared);
    // notify_client has no undo — the badge must come from THIS declaration,
    // not from the client-side IRREVERSIBLE_FALLBACK list.
    expect(notify.reversibility).toBe('none');
  });
});
