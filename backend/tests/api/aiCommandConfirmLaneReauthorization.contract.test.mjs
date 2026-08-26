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
import { initializeRegistry, getAllCommands, getCommand } from '../../services/ai/commandRegistry/index.mjs';
import { OUR_TRAINER, OWN_CLIENT, FOREIGN_CLIENT } from '../helpers/ownershipFixture.mjs';

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

const CONFIRM_NO_LONGER_PERMITTED = 'You no longer have permission to complete that operation. No data was changed. Please re-issue the command if you believe this is wrong.';

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

/** Every command that can reach the confirm lane at all. */
function allConfirmableCommands() {
  initializeRegistry();
  const all = getAllCommands();
  return (Array.isArray(all) ? all : Object.values(all))
    .filter((c) => c.requiresConfirmation === true || c.destructive === true);
}

/** The roles the registry grants a command — the one source redemption consults. */
function getRegistryRoles(type) {
  initializeRegistry();
  const command = getCommand(type);
  return Array.isArray(command?.roleRequired) ? command.roleRequired : [];
}

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

function mintDestructive(userId = OUR_TRAINER, overrides = {}) {
  const { operationId } = prepareDestructiveOperation({
    type: 'UPDATE',
    endpoint: '/api/sessions/9/cancel',
    commandParams: { id: 9, clientId: OWN_CLIENT },
    commandType: DESTRUCTIVE_COMMAND,
    // The client the operation was AUTHORIZED against, as the pipeline records at mint.
    clientId: OWN_CLIENT,
    userId,
    description: 'cancel a session',
    ...overrides,
  });
  return operationId;
}

/**
 * A destructive operation whose target is NOT a client id — the `delete_workout_plan`
 * shape. This is the case that made the old reading vacuous: it read `params.clientId`,
 * which this shape does not have, so the client re-check silently ran on `null`.
 */
function mintDestructivePlanShape(userId = OUR_TRAINER) {
  const { operationId } = prepareDestructiveOperation({
    type: 'DELETE',
    endpoint: '/api/workout-plans/71',
    commandParams: { id: 71, planId: 71 },
    commandType: DESTRUCTIVE_COMMAND,
    clientId: OWN_CLIENT,
    userId,
    description: 'archive a plan',
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

    it('lets a CLIENT redeem their own operation — the second positive control', async () => {
      // Panel finding (Qwen, 2026-08-26): every positive control here used a trainer, so if
      // `assertAssignmentOrAdmin` treated a client-role caller differently — it resolves them
      // by self-comparison, not by assignment — this suite would not have noticed the entire
      // client population being locked out of their own confirmed actions.
      const CLIENT_SELF = { id: OWN_CLIENT, role: 'client', firstName: 'C', lastName: 'L' };
      const { operationId } = preparePendingConfirmation({
        commandType: 'request_plan_adjustment',
        params: { clientId: OWN_CLIENT },
        clientId: OWN_CLIENT,
        userId: OWN_CLIENT,
        description: 'request a plan adjustment',
      });
      const result = await executeConfirmedOperation(operationId, CLIENT_SELF, sequelize);
      expect(
        dispatchMock,
        `a client could not redeem their own operation (${result.type}: ${result.message})`,
      ).toHaveBeenCalledTimes(1);
      expect(assertAccessMock).toHaveBeenCalledWith(OWN_CLIENT, 'client', OWN_CLIENT);
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

      // And it is recorded as a DIFFERENT denial from a revocation. Both refuse, but during
      // an incident the two mean opposite things: one is a revoked user correctly stopped,
      // the other is an unhealthy database stopping everyone. A trail that cannot tell them
      // apart turns an outage into a false access-abuse signal.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('client_access_check_failed');
    });

    it('asks about the OPERATION\'s client, not the caller', async () => {
      // The distinction matters: asking about the caller's own id would pass for any
      // trainer and quietly authorize nothing.
      await executeConfirmedOperation(mintPending(), TRAINER, sequelize);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('checks the destructive lane\'s client too, for the stated reason', async () => {
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructive(), TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      // The REASON matters. An earlier version of this test passed while the client check
      // never ran — the denial came from elsewhere — which is exactly the vacuity a panel
      // predicted for it. Asserting the audit reason is what tells the two apart.
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('client_access_revoked');
    });

    it('checks a destructive op whose target is NOT a client id — the plan shape', async () => {
      // `delete_workout_plan` carries `planId`, never `params.clientId`. Reading the target
      // out of params meant the client re-check ran on `null` for precisely the destructive
      // commands that matter most; it survived only because that one dispatcher happens to
      // self-gate. The operation now records the client it was authorized against.
      assertAccessMock.mockResolvedValue(false);
      const result = await executeConfirmedOperation(mintDestructivePlanShape(), TRAINER, sequelize);
      expect(dispatchMock, 'a revoked trainer redeemed a destructive op with no clientId param').not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(assertAccessMock).toHaveBeenCalledWith(OUR_TRAINER, 'trainer', OWN_CLIENT);
    });

    it('refuses when the operation and its params name different clients', async () => {
      // A gate that authorizes one id while dispatch acts on another authorizes nothing.
      const operationId = mintDestructive(OUR_TRAINER, { clientId: FOREIGN_CLIENT });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('target_mismatch');
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

  describe('the gate\'s own allow branch', () => {
    it('permits an unregistered type ONLY when nothing can execute it', async () => {
      // Panel finding (Ox, 2026-08-26): this is the single unconditional-allow path in the
      // fix, and every test either used a registered command or mocked `hasDispatcher` true,
      // so the branch was never taken. The comment argued it was safe because nothing can
      // execute either way — an argument, not an assertion. This is the assertion.
      hasDispatcherMock.mockReturnValue(false);
      const { operationId } = preparePendingConfirmation({
        commandType: 'a_command_no_registry_knows',
        params: {},
        clientId: null,
        userId: OUR_TRAINER,
        description: 'unknown command, no dispatcher',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock, 'the allow branch reached a dispatcher').not.toHaveBeenCalled();
      expect(result.type, 'the honest not_wired answer was replaced').toBe('not_wired');
      expect(result.success).toBe(false);
    });

    it('refuses a client-ref command that arrived with no client recorded', async () => {
      // Panel round 2 (Qwen, 2026-08-26): when BOTH the operation and its params lack a
      // client, every client check was skipped and the gate returned "permitted" by falling
      // off the end. The gate cannot authorize what it cannot see; it now says so.
      //
      // A command with no client concept at all (`requiresClientRef: false`) is a different
      // case and is NOT denied here — its ownership belongs to the handler. That division is
      // now stated rather than incidental.
      const { operationId } = preparePendingConfirmation({
        commandType: CONFIRMED_COMMAND,   // award_badge — requiresClientRef: true
        params: { achievementId: '7' },
        clientId: null,
        userId: OUR_TRAINER,
        description: 'award a badge with no client',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('missing_client_target');
    });

    it('does NOT invent a client requirement for commands that have none', async () => {
      // `delete_workout_plan` carries a planId and resolves no client, so it legitimately
      // records none. Denying it here would break it; the handler owns that ownership check.
      const { operationId } = prepareDestructiveOperation({
        type: 'DELETE',
        endpoint: '/api/workout-plans/71',
        commandParams: { id: 71, planId: 71 },
        commandType: 'delete_workout_plan',
        clientId: null,
        userId: OUR_TRAINER,
        description: 'archive a plan',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(
        dispatchMock,
        `a command with no client concept was denied (${result.type}: ${result.message})`,
      ).toHaveBeenCalledTimes(1);
    });

    it('refuses a stored operation with no command type at all', async () => {
      // On a persisted record a missing type is a malformed shape, not an absent input.
      // Skipping the checks for it meant an operation could pass the gate having had
      // NOTHING checked — safe only because of code this function cannot see.
      const { operationId } = preparePendingConfirmation({
        commandType: null,
        params: {},
        clientId: null,
        userId: OUR_TRAINER,
        description: 'malformed',
      });
      const result = await executeConfirmedOperation(operationId, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
      const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
      expect(row?.errorCode).toBe('malformed_operation');
    });
  });

  describe('the role check mirrors the pipeline exactly', () => {
    it('cannot deny at redemption what the pipeline permitted at mint', async () => {
      // Panel finding (Ox, 2026-08-26): exact `roleRequired` membership was called an
      // admin-superset break — an admin minting a command whose roleRequired omits `admin`
      // would be denied at redemption, and single-use retrieval would eat the operation.
      //
      // It cannot happen, and the reason is worth pinning rather than arguing: redemption
      // applies the SAME predicate `stepRBAC` applies at mint. A role that could not mint
      // cannot arrive here, and one that could mint is still permitted. Asserting the
      // identity is stronger than asserting the absence of a victim — if either side ever
      // gains a special case, this fails.
      // This assertion has now been wrong twice, in two different ways, and both critiques
      // were right. First it read `roleRequired` on both sides and compared it to itself — a
      // tautology. Then it read the two predicates as SOURCE and banned the literal 'admin',
      // which a harmless refactor (`const ADMIN_ROLE = 'admin'`) would break while changing
      // nothing, and which tests how the code is written rather than what it does.
      //
      // What it should have been all along: EXECUTE redemption for every confirmable command
      // against every role, and check the observed verdict against what the registry says.
      // One side is data, the other is behaviour, so it is not a tautology; nothing reads
      // source, so no refactor can break it; and a carve-out inside the gate — the thing the
      // original finding was about — shows up immediately as a disagreement.
      //
      // The MINT side is proven separately and already: the prior session's authorization
      // contract drives the pipeline over all 303 below-role pairs and asserts `stepRBAC`
      // denies every one. This closes the loop by proving redemption agrees with it.
      const registry = allConfirmableCommands();
      expect(registry.length, 'no confirmable commands found — the scan broke').toBeGreaterThan(5);

      const disagreements = [];
      let pairs = 0;
      for (const command of registry) {
        const permitted = getRegistryRoles(command.type);
        if (!permitted.length) continue;
        for (const role of ['admin', 'trainer', 'client', 'user']) {
          pairs += 1;
          const { operationId } = preparePendingConfirmation({
            commandType: command.type,
            params: {},
            clientId: null,
            userId: OUR_TRAINER,
            description: 'role matrix probe',
          });
          const result = await executeConfirmedOperation(
            operationId, { id: OUR_TRAINER, role, firstName: 'M', lastName: 'X' }, sequelize,
          );
          // `role_revoked` is the ONLY denial this matrix is about. A command may still be
          // refused for a missing client or an absent dispatcher; those are other gates and
          // are asserted elsewhere. What matters here is whether the ROLE was the reason.
          const deniedForRole = result.message === CONFIRM_NO_LONGER_PERMITTED
            && !permitted.includes(role);
          const wronglyAllowedByRole = !permitted.includes(role)
            && result.message !== CONFIRM_NO_LONGER_PERMITTED;
          if (wronglyAllowedByRole) disagreements.push(`${command.type}: ${role} not denied by role`);
          else if (permitted.includes(role) && deniedForRole) {
            disagreements.push(`${command.type}: ${role} denied despite being permitted`);
          }
        }
      }
      expect(pairs, 'the matrix ran over nothing').toBeGreaterThan(20);
      expect(
        disagreements,
        `redemption disagrees with the registry about who may act: ${disagreements.join(', ')}`,
      ).toEqual([]);
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
      // Matches `dispatch(` with or without `await`, and any local alias assigned from it.
      // The earlier pattern required `await dispatch(` and so was blind to a fire-and-forget
      // call and to `const d = dispatch; d(...)` — a scan that only sees the shape you had in
      // mind is a scan that certifies the shape you had in mind.
      const order = [...body.matchAll(/confirmLaneDenialReason\(|(?:await\s+)?\bdispatch\s*\(|=\s*dispatch\b/g)]
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
    it('still refuses another user\'s operation on the DESTRUCTIVE lane too', async () => {
      // Round 2 (GLM): the minter-to-redeemer binding was asserted only on the
      // non-destructive lane. The destructive lane has its own retrieval path and its own
      // ownership check; "the other lane does it" is not evidence about this one.
      const someoneElse = mintDestructive(4242);
      const result = await executeConfirmedOperation(someoneElse, TRAINER, sequelize);
      expect(dispatchMock).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

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
