/**
 * aiCommandConfirmLaneOwnership.contract.test.mjs
 * ===============================================
 * The Swan Coach pipeline is not the only caller of `dispatch`. When a command needs
 * confirmation the pipeline mints an operationId and returns; the user then redeems it,
 * and `executeConfirmedOperation` dispatches from STORED params. That is two further call
 * sites — a non-destructive path and a destructive one — and neither re-checks role.
 *
 * They are gated by OWNERSHIP instead: the operation belongs to the user who minted it,
 * expires in 120s, and is single-use. The destructive path adds HMAC verification, because
 * a destructive operation is replayed from stored params rather than re-derived from the
 * request, so nothing else would notice if those params were altered in flight.
 *
 * Role IS checked — once, when the operation is minted, by the pipeline gate that
 * `aiCommandDispatcherAuthorization.contract.test.mjs` proves exhaustively. This file
 * asserts the redemption side of that bargain.
 *
 * NOT PROVEN: a role revoked between mint and redeem. Ownership still holds, so the caller
 * is the same person, but they may no longer hold the role the command requires. The 120s
 * expiry bounds it. Nothing asserts it.
 *
 * These assertions are structural because the lane holds pending operations in module
 * state that a test cannot mint into without going through the very pipeline it is meant
 * to be independent of. Each was mutation-tested; two earlier drafts were VACUOUS and are
 * described where they failed, so the next reader does not reintroduce them.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import sliceBetween from '../helpers/sliceBetween.mjs';
import { stripComments } from '../helpers/sourceScan.mjs';
import { EXECUTOR_FILE, DESTRUCTIVE_OPS_FILE } from '../helpers/dispatcherReachability.mjs';

describe('Swan Coach confirmation lane', () => {
  // The pipeline's second door. Role is checked when the operation is MINTED; redeeming
  // it is gated by ownership instead. These assertions are structural because the lane
  // holds pending operations in module state that a unit test cannot mint into without
  // going through the pipeline it is meant to be independent of.
  const executorSource = () => stripComments(fs.readFileSync(EXECUTOR_FILE, 'utf8'));

/**
 * Assert the operation is consumed on the straight-line path to success.
 *
 * Two weaker forms of this were shipped and both were vacuous:
 *   `toMatch(/pendingOps.delete/)` — the EXPIRY branch deletes, so it stayed green with
 *     single-use deletion removed (mutation MUT-15b).
 *   "a delete somewhere between the ownership check and the success return" — the
 *     SIGNATURE-TAMPERING branch deletes too, so the destructive path stayed green
 *     (mutation MUT-15c).
 * Both failed in the safe-looking direction. The invariant that actually holds is
 * narrower: after the LAST early return, and before the success return, lies the only
 * code guaranteed to run when the operation is handed back — the consume must be there.
 */
const expectConsumedBeforeSuccess = (window, label) => {
  const successReturn = window.indexOf('return { verified: true');
  expect(successReturn, `${label}: no success return found — anchor drift`).toBeGreaterThan(-1);
  const lastEarlyReturn = window.slice(0, successReturn).lastIndexOf('return ');
  expect(lastEarlyReturn, `${label}: no early return found — anchor drift`).toBeGreaterThan(-1);
  expect(
    window.slice(lastEarlyReturn, successReturn),
    `${label}: an operation is returned as verified without being consumed on the success path`,
  ).toContain('pendingOps.delete(operationId)');
};


  it('scopes a pending confirmation to the user who minted it', () => {
    const window = sliceBetween(
      executorSource(),
      'export async function executeConfirmedOperation(',
      'export function checkForConfirmation(',
      { label: 'executeConfirmedOperation' },
    );
    const retrievals = [...window.matchAll(/retrievePendingConfirmation\(([^)]*)\)/g)];
    expect(retrievals.length, 'the confirm lane no longer retrieves a pending confirmation').toBeGreaterThan(0);
    for (const call of retrievals) {
      expect(
        call[1].replace(/\s+/g, ''),
        'a pending confirmation was retrieved without scoping it to the calling user',
      ).toContain('user.id');
    }
  });

  it('refuses an operation minted by a different user', () => {
    const source = stripComments(
      fs.readFileSync(DESTRUCTIVE_OPS_FILE, 'utf8'),
    );
    const window = sliceBetween(
      source,
      'export function retrievePendingConfirmation(',
      'export function cancelOperation(',
      { label: 'retrievePendingConfirmation' },
    );
    // Structural, not by message text: the guard is the comparison, not the copy.
    expect(window).toMatch(/operation\.createdBy\s*!==\s*userId/);
    expect(window, 'a pending operation must expire').toMatch(/expiresAt/);
    expectConsumedBeforeSuccess(window, 'non-destructive confirm');
  });

  it('gates the destructive path on ownership, expiry, single use, and a signature', () => {
    // The highest-stakes door: `verifyAndRetrieveOperation` guards the destructive
    // confirm path, which is a THIRD call site of `dispatch`. It carries everything the
    // non-destructive path does plus HMAC verification, because a destructive operation
    // is replayed from stored params rather than re-derived from the request.
    const source = stripComments(
      fs.readFileSync(DESTRUCTIVE_OPS_FILE, 'utf8'),
    );
    const window = sliceBetween(
      source,
      'export function verifyAndRetrieveOperation(',
      'export function retrievePendingConfirmation(',
      { label: 'verifyAndRetrieveOperation' },
    );
    expect(window, 'destructive confirm lost its ownership check').toMatch(/operation\.createdBy\s*!==\s*userId/);
    expect(window, 'destructive confirm lost its expiry check').toMatch(/expiresAt/);
    expect(window, 'destructive confirm lost signature verification').toMatch(/verifySignature\(operation\)/);
    expectConsumedBeforeSuccess(window, 'destructive confirm');
  });

  it('scopes the destructive path to the calling user as well', () => {
    const window = sliceBetween(
      executorSource(),
      'export async function executeConfirmedOperation(',
      'export function checkForConfirmation(',
      { label: 'executeConfirmedOperation' },
    );
    const calls = [...window.matchAll(/verifyAndRetrieveOperation\(([^)]*)\)/g)];
    expect(calls.length, 'the destructive confirm path no longer verifies an operation').toBeGreaterThan(0);
    for (const call of calls) {
      expect(call[1].replace(/\s+/g, ''), 'destructive confirm was not scoped to the calling user').toContain('user.id');
    }
  });

  it('honours the write kill switch on the confirm lane too', () => {
    const window = sliceBetween(
      executorSource(),
      'export async function executeConfirmedOperation(',
      'export function checkForConfirmation(',
      { label: 'executeConfirmedOperation' },
    );
    expect(window).toMatch(/areCommandWritesEnabled\(\)/);
  });
});
