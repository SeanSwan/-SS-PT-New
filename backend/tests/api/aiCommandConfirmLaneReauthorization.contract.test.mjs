/**
 * aiCommandConfirmLaneReauthorization.contract.test.mjs
 * =====================================================
 * Authorization belongs to the moment of the EFFECT, not the moment of the request.
 *
 * WHY THIS EXISTS
 * ---------------
 * A command that requires confirmation is authorized once, in the pipeline, and then
 * parked for up to 120 seconds until the user confirms it. Redemption checked three
 * things — ownership of the pending operation, expiry, and (on the destructive path) an
 * HMAC signature — and did not re-check the two things that can change inside that window:
 *
 *   - the caller's ROLE. A trainer demoted to client, or a user whose access was revoked
 *     because something went wrong, could still redeem an operation minted seconds earlier.
 *   - the caller's relationship to the CLIENT. A trainer whose assignment is ended — a
 *     client transferred away, an account suspended — could still act on that client until
 *     the window closed.
 *
 * Two previous handoffs named this and left it open ("bounded and narrow, but real, and
 * asserted nowhere"). 120 seconds is short, but revocation is precisely the moment someone
 * has a reason to spend it, and a queued destructive operation is the thing they would
 * spend it on.
 *
 * WHY THE CHECK IS AGAINST THE CURRENT ROLE, NOT THE MINTED ONE
 * -------------------------------------------------------------
 * The stored operation never recorded the role it was minted under, so "did the role
 * change" is not answerable. It is also the wrong question. What matters is whether the
 * caller may do this NOW — which is answerable, is what every other gate in this lane
 * asks, and does not need the operation to remember anything.
 *
 * WHAT THIS SUITE IS, AND WHAT ITS SIBLING IS
 * -------------------------------------------
 * `aiCommandConfirmLaneOwnership.contract.test.mjs` proves the same lane's ownership,
 * expiry, single-use and signature properties by SCANNING the source. This one EXECUTES
 * the lane: it mints a real pending operation and redeems it with a changed actor. The
 * authorizer is mocked so its arguments can be asserted — proving not just that access was
 * refused but that the question asked was about the operation's client, not the caller's.
 * The authorizer's own behaviour is exercised for real in
 * `aiCommandPlanArchiveOwnership.contract.test.mjs`.
 *
 * NOT PROVEN
 * - A role that changes DURING dispatch. This closes the gap between minting and
 *   redemption, not between redemption and the write itself.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';

import AiCommandAuditLog from '../../models/AiCommandAuditLog.mjs';
import sliceBetween from '../helpers/sliceBetween.mjs';
import { stripComments } from '../helpers/sourceScan.mjs';
import { EXECUTOR_FILE } from '../helpers/dispatcherReachability.mjs';
import { dispatch, hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import { assertAssignmentOrAdmin } from '../../middleware/verifyClientAccess.mjs';
import {
  preparePendingConfirmation,
  prepareDestructiveOperation,
} from '../../services/ai/destructiveOperations.mjs';
import { executeConfirmedOperation } from '../../services/ai/commandExecutor.mjs';
import { initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';
import { OUR_TRAINER, OWN_CLIENT } from '../helpers/ownershipFixture.mjs';

vi.mock('../../models/AiCommandAuditLog.mjs', () => ({ default: { create: vi.fn() } }));
vi.mock('../../services/ai/commandDispatcher.mjs', () => ({
  dispatch: vi.fn(),
  hasDispatcher: vi.fn(() => true),
}));
vi.mock('../../middleware/verifyClientAccess.mjs', () => ({
  assertAssignmentOrAdmin: vi.fn(),
}));

const dispatchMock = vi.mocked(dispatch);
const hasDispatcherMock = vi.mocked(hasDispatcher);
const assertAccessMock = vi.mocked(assertAssignmentOrAdmin);
const auditMock = vi.mocked(AiCommandAuditLog.create);

const TRAINER = { id: OUR_TRAINER, role: 'trainer', firstName: 'T', lastName: 'R' };
/** The same person, after losing the role the command requires. */
const DEMOTED = { ...TRAINER, role: 'client' };

/** requiresConfirmation, not destructive, needs a client — the non-destructive lane. */
const CONFIRMED_COMMAND = 'award_badge';
/** requiresConfirmation AND destructive — the HMAC lane. */
const DESTRUCTIVE_COMMAND = 'cancel_session';

const sequelize = {};

beforeEach(() => {
  // The registry is real and must be initialized, as it is at boot. Without it every
  // `getCommand` returns undefined and the lane denies EVERYTHING — the right direction to
  // fail in, but it would make the denial assertions below pass for the wrong reason.
  initializeRegistry();
  process.env.AI_COMMAND_WRITES_ENABLED = 'true';
  dispatchMock.mockReset();
  dispatchMock.mockResolvedValue({ probe: 'dispatcher reached' });
  hasDispatcherMock.mockReset();
  hasDispatcherMock.mockReturnValue(true);
  assertAccessMock.mockReset();
  assertAccessMock.mockResolvedValue(true);
  auditMock.mockReset();
  auditMock.mockResolvedValue({});
});

function mintPending(userId = OUR_TRAINER) {
  const { operationId } = preparePendingConfirmation({
    commandType: CONFIRMED_COMMAND,
    params: { clientId: OWN_CLIENT, achievementId: '7' },
    clientId: OWN_CLIENT,
    userId,
    description: 'award a badge',
  });
  return operationId;
}

function mintDestructive(userId = OUR_TRAINER) {
  const { operationId } = prepareDestructiveOperation({
    type: 'UPDATE',
    endpoint: '/api/sessions/9/cancel',
    commandParams: { id: 9, clientId: OWN_CLIENT },
    commandType: DESTRUCTIVE_COMMAND,
    userId,
    description: 'cancel a session',
  });
  return operationId;
}

describe('Swan Coach confirm-lane re-authorization', () => {
  describe('the probe itself', () => {
    it('executes for an unchanged, still-permitted caller — the positive control', async () => {
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(
        dispatchMock,
        `control failed: a permitted trainer could not redeem (${result.type}: ${result.message})`,
      ).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });
  });

  describe('a role that no longer permits the command', () => {
    it('refuses the non-destructive lane', async () => {
      const result = await executeConfirmedOperation(mintPending(), DEMOTED, sequelize);
      expect(dispatchMock, 'a demoted caller redeemed a pending operation').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('refuses the destructive lane, signature notwithstanding', async () => {
      // The HMAC proves the operation was not tampered with. It says nothing about who may
      // run it now — it was signed when the caller still could.
      const result = await executeConfirmedOperation(mintDestructive(), DEMOTED, sequelize);
      expect(dispatchMock, 'a demoted caller redeemed a destructive operation').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('a client relationship that has ended', () => {
    it('refuses when access to the operation\'s client is gone', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('refuses when the access lookup THROWS, not only when it says no', async () => {
      // Caught by mutation: flipping the catch to `permitted = true` left every other
      // assertion here green, because nothing exercised a rejecting authorizer. A gate
      // that fails open under load works in every test and stops working exactly when the
      // database is unhappy — which is when a queued destructive operation matters most.
      assertAccessMock.mockRejectedValue(new Error('connection pool exhausted'));
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('asks about the OPERATION\'s client, not the caller', async () => {
      // The distinction matters: asking about the caller's own id would pass for any
      // trainer and quietly authorize nothing.
      await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('checks the destructive lane\'s client too', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructive(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('a command the registry cannot vouch for', () => {
    it('is refused, because there is no roleRequired to check it against', async () => {
      // Fail-closed by construction: if the registry has no entry, the lane cannot know
      // who may run the operation, and "cannot tell" must not mean "allow". The same
      // branch is why an uninitialized registry denies everything rather than everything
      // sailing through — the right direction for a boot-order accident to fail in.
      const { operationId } = preparePendingConfirmation({
        commandType: 'a_command_no_registry_knows',
        params: {},
        clientId: null,
        userId: OUR_TRAINER,
        description: 'unknown command',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });
  });

  describe('every way out of this function', () => {
    it("reaches a dispatcher only after a re-authorization, in that order", () => {
      // Behavioural tests cover the two lanes that exist today. This is about the third
      // one somebody adds later: a new `await dispatch(` inside this function, written by
      // someone who did not know the gate was their job, would pass every test above by
      // simply not being exercised by any of them.
      const body = sliceBetween(
        stripComments(fs.readFileSync(EXECUTOR_FILE, 'utf8')),
        'export async function executeConfirmedOperation(',
        '\nexport ',
        { label: 'executeConfirmedOperation' },
      );
      const order = [...body.matchAll(/confirmLaneDenialReason\(|await dispatch\(/g)]
        .map((m) => (m[0].startsWith('confirm') ? 'gate' : 'dispatch'));

      expect(order.length, 'no gates and no dispatches found — the scan broke').toBeGreaterThan(0);
      expect(
        order.filter((step) => step === 'dispatch').length,
        'a dispatch call in the confirm lane is unaccounted for',
      ).toBe(2);
      // Every dispatch must be preceded by at least one gate it has not already consumed.
      let available = 0;
      for (const step of order) {
        if (step === 'gate') available += 1;
        else {
          expect(available, 'a dispatch runs before any re-authorization gate').toBeGreaterThan(0);
          available -= 1;
        }
      }
    });
  });

  describe('the forensics trail', () => {
    it('records the denial with a reason, using the vocabulary the model documents', async () => {
      // A revoked caller trying to redeem is exactly the event an admin would go looking
      // for. `outcome` stays inside the documented set so a query filtering on known
      // outcomes finds it; the specific reason rides in `errorCode`, which is what that
      // column is for. An outcome value nobody else uses is a row nobody else queries.
      await executeConfirmedOperation(mintPending(), DEMOTED, sequelize);
      // The audit is fire-and-forget and reaches the model through a dynamic import, so
      // it settles a microtask after the call returns. Waiting for it is the assertion —
      // checking synchronously would fail whether or not the row is ever written.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const denial = auditMock.mock.calls
        .map(([row]) => row)
        .find((row) => row?.outcome === 'denied');
      expect(denial, 'no denial row was written').toBeTruthy();
      expect(denial.errorCode).toBe('role_revoked');
      expect(denial.commandType).toBe(CONFIRMED_COMMAND);
    });
  });

  describe('what re-authorization must not break', () => {
    it('still refuses another user\'s operation', async () => {
      const someoneElse = mintPending(4242);
      const result = await executeConfirmedOperation(someoneElse, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it('still honours the write kill switch before anything else', async () => {
      // Asserted for ordering, not just outcome: a re-authorization query that ran before
      // the kill switch would put load on the database during the incident the switch
      // exists to contain.
      // The switch is opt-OUT: absent means enabled, so the pause is an explicit 'false'.
      process.env.AI_COMMAND_WRITES_ENABLED = 'false';
      const result = await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(result.success).toBe(false);
      expect(assertAccessMock).not.toHaveBeenCalled();
      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });
});
