/**
 * The NON-destructive confirmation lane — previously untested end to end.
 * ========================================================================
 * Found while hostile-reviewing my own F-03 change: nothing in the suite
 * referenced `preparePendingConfirmation`, `retrievePendingConfirmation`, or the
 * `pending_confirmed` kind. The destructive lane has an adversarial lock and a
 * store-seam tamper file; this lane — the one MOST commands take, since most
 * confirmable commands are safe writes rather than deletes — had none of it.
 *
 * That asymmetry is how a lane rots: the scary-sounding branch attracts the
 * tests, and the ordinary branch quietly carries the same money-path guarantees
 * with nothing holding them. The signature on this kind was added late ("0.4a:
 * this kind was previously unsigned"), and the M3 `requiresPhysicalConfirm` flag
 * was added to it in this session — a security field on an unverified lane.
 *
 * These mirror the destructive lane's contract case for case, so the two cannot
 * drift apart without something going red.
 */
import { describe, it, expect, afterEach } from 'vitest';
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

const OWNER = 3001;
const ATTACKER = 4002;

async function mint(overrides = {}) {
  return preparePendingConfirmation({
    commandType: 'log_workout',
    params: { exercise: 'bench' },
    clientId: 42,
    userId: OWNER,
    actorRole: 'trainer',
    description: 'Log a workout for Client-42',
    ...overrides,
  });
}

/** A store that lets a test mutate the record between mint and verify. */
function tamperingStore(mutate) {
  const inner = createInProcessStore();
  return {
    ...inner,
    kind: 'tampering-test-double',
    durable: false,
    get: async (id) => {
      const op = await inner.get(id);
      if (!op) return op;
      mutate(op);
      return op;
    },
    get size() { return inner.size; },
  };
}

describe('pending-confirmation lane — contract', () => {
  afterEach(() => resetPendingOperationStore());

  it('mints, verifies once, and is consumed — replay does not execute twice', async () => {
    const pending = await mint();

    const first = await retrievePendingConfirmation(pending.operationId, OWNER);
    expect(first.verified).toBe(true);
    expect(first.operation.commandType).toBe('log_workout');

    const replay = await retrievePendingConfirmation(pending.operationId, OWNER);
    expect(replay.verified).toBe(false);
    expect(replay.operation).toBeNull();
  });

  it('refuses a confirmation from a different user', async () => {
    const pending = await mint();

    const result = await retrievePendingConfirmation(pending.operationId, ATTACKER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/another user/i);
    // And it must survive for the rightful owner — an attacker probing an id
    // must not be able to destroy someone else's pending approval.
    expect(await getPendingOperationStore().get(pending.operationId)).toBeTruthy();
  });

  it('binds the client: tampering with clientId is rejected and destroys the record', async () => {
    setPendingOperationStore(tamperingStore((op) => { op.clientId = 999; }));

    const pending = await mint({ clientId: 42 });
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
    expect(await getPendingOperationStore().get(pending.operationId)).toBeUndefined();
  });

  it('binds the M3 verdict: downgrading requiresPhysicalConfirm is rejected', async () => {
    // The same downgrade attack the destructive lane blocks (A23). This lane
    // carries the flag too, and it is the lane a safe-write command takes — so
    // "cross-client write confirmed by voice" lives here, not only in deletes.
    setPendingOperationStore(tamperingStore((op) => { op.requiresPhysicalConfirm = false; }));

    const pending = await mint({ requiresPhysicalConfirm: true });
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });

  it('binds the command: swapping commandType is rejected', async () => {
    setPendingOperationStore(tamperingStore((op) => { op.commandType = 'delete_client'; }));

    const pending = await mint({ commandType: 'log_workout' });
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });

  it('binds the description: the sentence the operator READ is signed', async () => {
    // The description is the entire basis on which a human approves. If it is
    // not bound, the read-back proves only that client and server agree about
    // text the server is free to change afterwards.
    setPendingOperationStore(tamperingStore((op) => { op.description = 'Something else entirely'; }));

    const pending = await mint();
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/signature invalid|tampering/i);
  });

  it('scopes params to the resolved client — the id is stamped, not taken on trust', async () => {
    const pending = await mint({ clientId: 77, params: { exercise: 'squat' } });
    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(true);
    expect(result.operation.params.clientId).toBe(77);
    expect(result.operation.clientId).toBe(77);
  });

  it('rejects an operation of the wrong KIND — a destructive id cannot enter this lane', async () => {
    const pending = await mint();
    const store = getPendingOperationStore();
    const record = await store.get(pending.operationId);
    await store.set(pending.operationId, { ...record, kind: 'DELETE' }, 120_000);

    const result = await retrievePendingConfirmation(pending.operationId, OWNER);

    expect(result.verified).toBe(false);
    expect(result.error).toMatch(/not found|already used/i);
  });
});
