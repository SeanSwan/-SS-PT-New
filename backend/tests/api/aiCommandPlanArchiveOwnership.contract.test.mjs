/**
 * aiCommandPlanArchiveOwnership.contract.test.mjs
 * ===============================================
 * The one indirect object reference in the Coach lane that nothing was checking.
 *
 * WHY THIS EXISTS
 * ---------------
 * Ownership in this lane is enforced on the CLIENT id. A command that also accepts the id
 * of a record — a session, a goal, a plan, an equipment profile — can name a record
 * belonging to someone else while passing every client-level check. A sweep of every
 * id-shaped parameter on every trainer-runnable command found each of those guarded:
 *
 *   cancel_session       `cancelSessionForAI` compares session.trainerId / session.userId
 *   log_workout          `resolveAiScheduledSessionForLog` refuses a session belonging to
 *                        another client, and one this trainer is not assigned to
 *   update_goal_progress `Goal.findOne({ where: { userId: clientId, id: goalId } })`
 *   equipment_*          `resolveOwnedProfile`, under a stated ownership contract
 *   availability / schedule  `resolveTrainerId`, and a hard pin to `ctx.user.id`
 *
 * and one not guarded at all: `delete_workout_plan` takes a `planId`, declares
 * `requiresClientRef: false` so the pipeline resolves no client and applies no scope, and
 * hands the caller-supplied id to `transitionWorkoutPlanLifecycle`, whose own comment says
 * it "applies one AUTHORIZED lifecycle action" — it validates that `actorId` is a positive
 * integer and records it for audit. It does not authorize anything.
 *
 * The command is `destructive: true`.
 *
 * THE SAME OPERATION OVER HTTP IS GUARDED
 * ---------------------------------------
 * `DELETE /api/workout-plans/:id` reaches the same service through
 * `verifyClientAccessByPlanId`, middleware written for this exact class ("Phase A receipt
 * section 2.3 (IDOR finding)"). The dispatcher's own file header claims it routes "through
 * the same audited lifecycle boundary as the protected REST API". The boundary was the
 * same; the protection was not. This is not a judgement call about what the rule should
 * be — the rule already exists next door, and one caller skipped it.
 *
 * WHY IT DENIES THE WAY IT DOES
 * -----------------------------
 * `verifyClientAccessByPlanId` answers cross-tenant access with 404 rather than 403, so an
 * attacker walking ids cannot tell "exists but not yours" from "does not exist". The
 * dispatcher already had a `planFound: false` shape for a missing plan, so denial reuses
 * it exactly: an unassigned trainer is told precisely what they would be told about a plan
 * that never existed.
 *
 * NOT PROVEN
 * - The lifecycle service's own locking and receipt behaviour. It is mocked here; this
 *   asserts what does and does not reach it.
 * - **The check is not inside the lock.** Raised by a hostile-review panel 2026-08-26 and
 *   confirmed by reading the middleware rather than assuming: this dispatcher loads the plan,
 *   authorizes against `plan.userId`, and only then calls a service that re-loads under a row
 *   lock. A reassignment landing in that window is authorized against the previous owner.
 *   `verifyClientAccessByPlanId` has the identical structure, so the window is shared with the
 *   REST route rather than introduced here — and closing it in ONE caller would recreate
 *   exactly the asymmetry this file exists to remove. The fix is to push the check inside the
 *   service's transaction for BOTH callers, which is its own slice and is recorded as open.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAllModels, getModel } from '../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../services/workoutPlanLifecycleService.mjs';
import { dispatchDeleteWorkoutPlan } from '../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs';
import { OUR_TRAINER, PEER_TRAINER, OWN_CLIENT, FOREIGN_CLIENT } from '../helpers/ownershipFixture.mjs';
import { recordCommandAudit } from '../../services/ai/commandAudit.mjs';

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../services/ai/commandAudit.mjs', () => ({ recordCommandAudit: vi.fn() }));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: vi.fn(),
}));
vi.mock('../../models/index.mjs', () => ({
  getAllModels: vi.fn(),
  getModel: vi.fn(),
}));

const transitionMock = vi.mocked(transitionWorkoutPlanLifecycle);
const auditMock = vi.mocked(recordCommandAudit);
const getAllModelsMock = vi.mocked(getAllModels);
const getModelMock = vi.mocked(getModel);

const OWN_PLAN = 71;
const FOREIGN_PLAN = 72;

/** Two plans: one belonging to an assigned client, one to a peer trainer's client. */
const PLANS = {
  [OWN_PLAN]: { id: OWN_PLAN, userId: OWN_CLIENT, trainerId: OUR_TRAINER, status: 'active' },
  [FOREIGN_PLAN]: { id: FOREIGN_PLAN, userId: FOREIGN_CLIENT, trainerId: PEER_TRAINER, status: 'active' },
};

const ASSIGNMENTS = [{ trainerId: OUR_TRAINER, clientId: OWN_CLIENT, status: 'active' }];

beforeEach(() => {
  auditMock.mockReset();
  transitionMock.mockReset();
  transitionMock.mockImplementation(async ({ planId }) => ({
    plan: { ...PLANS[planId], status: 'archived' },
    lifecycleReceipt: { id: 'receipt-1', fromStatus: 'active' },
  }));
  getAllModelsMock.mockReset();
  getAllModelsMock.mockReturnValue({
    WorkoutPlan: { findByPk: async (id) => PLANS[Number(id)] || null },
  });
  getModelMock.mockReset();
  getModelMock.mockImplementation((name) => {
    if (name !== 'ClientTrainerAssignment') throw new Error(`unexpected model ${name}`);
    return {
      findOne: async ({ where }) => ASSIGNMENTS.find((a) => a.trainerId === Number(where.trainerId)
        && a.clientId === Number(where.clientId)
        && a.status === where.status) || null,
    };
  });
});

const trainer = { id: OUR_TRAINER, role: 'trainer' };
const admin = { id: 9001, role: 'admin' };

describe('Swan Coach plan-archive ownership', () => {
  it('archives a plan belonging to an assigned client — the positive control', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(transitionMock.mock.calls[0][0].planId).toBe(OWN_PLAN);
    expect(result.planFound).toBe(true);
    expect(result.archived).toBe(true);
  });

  it('does not archive a plan belonging to a client who is not the caller\'s', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock, 'an unassigned trainer reached the lifecycle service').not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
    expect(result.archived).toBe(false);
  });

  it('tells an unassigned trainer nothing a stranger would not learn', async () => {
    // Same answer for "not yours" and "does not exist", so walking ids reveals nothing.
    // Both echo the id they were asked about — that is the caller's own input coming
    // back, not a disclosure — so the comparison is over everything else.
    const withoutEcho = ({ planId, ...rest }) => rest;
    const denied = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    const missing = await dispatchDeleteWorkoutPlan({ planId: 999999 }, { user: trainer });
    expect(withoutEcho(denied)).toEqual(withoutEcho(missing));
    expect(denied.planId).toBe(FOREIGN_PLAN);

    // There is a THIRD way to arrive at "no": the plan is loadable and the caller is
    // permitted, but the lifecycle service reports it gone underneath them. That answer
    // has to match too — two of three agreeing still tells an id-walker something.
    transitionMock.mockRejectedValueOnce(Object.assign(
      new Error('Workout plan not found'), { code: 'WORKOUT_PLAN_NOT_FOUND' },
    ));
    const raced = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer });
    expect(withoutEcho(raced)).toEqual(withoutEcho(missing));
  });

  it('leaves a server-side record of the denial, though the response leaves none', async () => {
    // Panel finding (GLM, 2026-08-26). The 404-parity response is deliberate and correct —
    // an id-walker must not learn which plans exist. But nothing was recorded either, so a
    // caller probing plan ids left a trail identical to someone mistyping one, and the
    // enumeration attack the parity design anticipates was invisible in the only place
    // detection could live. Indistinguishable to the CALLER; not to the operator.
    await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    await vi.waitFor(() => expect(auditMock).toHaveBeenCalled());
    const row = auditMock.mock.calls.map(([r]) => r).find((r) => r?.outcome === 'denied');
    expect(row, 'a cross-tenant denial was not recorded anywhere').toBeTruthy();
    expect(row.errorCode).toBe('handler_denied_plan_access');
    expect(row.userId).toBe(OUR_TRAINER);
    expect(row.targetClientId).toBe(FOREIGN_CLIENT);
  });

  it('scopes on the plan\'s CLIENT, not its author — deliberately, for parity', async () => {
    // A plan this trainer authored, for a client who is no longer theirs. The REST
    // middleware answers on `plan.userId` alone, so this lane does too: parity with the
    // guarded route matters more than the intuition that authorship should carry rights,
    // and two callers into one service disagreeing about who may use it is how the gap
    // being fixed here appeared in the first place. If this should change, change the
    // middleware and this together.
    const ORPHANED = 73;
    PLANS[ORPHANED] = { id: ORPHANED, userId: FOREIGN_CLIENT, trainerId: OUR_TRAINER, status: 'active' };
    const result = await dispatchDeleteWorkoutPlan({ planId: ORPHANED }, { user: trainer });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
    delete PLANS[ORPHANED];
  });

  it('lets an admin archive any plan', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: admin });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(result.planFound).toBe(true);
  });

  it('denies a row the query should never have returned — fail-open SQL is caught at the consumer', async () => {
    // Hostile-review finding 2026-08-26: every check on `assertAssignmentOrAdmin` proves the
    // QUERY carries the right predicates, never that the database applied them. A fail-open
    // WHERE — `(... OR :trainerId IS NULL)` is the classic — satisfies every string-level
    // assertion and returns a foreign row anyway. The consumer now re-asserts what the WHERE
    // was supposed to guarantee, which is what this simulates: a model that ignores its own
    // where-clause and hands back somebody else's assignment.
    getModelMock.mockImplementation(() => ({
      findOne: async () => ({ trainerId: PEER_TRAINER, clientId: FOREIGN_CLIENT, status: 'active' }),
    }));
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock, 'a foreign assignment row was accepted at face value').not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);

    // Both mismatch dimensions, separately. The row above names the RIGHT client and the
    // wrong trainer; this one names the right trainer and somebody else's client. Mutation
    // testing caught that only the first was exercised — one assertion covering two guards
    // is one guard tested and one assumed.
    transitionMock.mockClear();
    getModelMock.mockImplementation(() => ({
      findOne: async () => ({ trainerId: OUR_TRAINER, clientId: OWN_CLIENT, status: 'active' }),
    }));
    const other = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock, 'an assignment for a DIFFERENT client was accepted').not.toHaveBeenCalled();
    expect(other.planFound).toBe(false);
  });

  it('denies when the assignment lookup throws — fail closed', async () => {
    // `assertAssignmentOrAdmin` treats any failure as a denial. Asserted here because a
    // gate that fails open under load is worse than no gate: it works in every test and
    // stops working exactly when the database is unhappy.
    getModelMock.mockImplementation(() => { throw new Error('model cache cold'); });
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: trainer });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
  });

  it('does not archive when the plan lookup itself fails', async () => {
    // The REST middleware answers 500 here rather than 404, because a lookup that threw
    // is not evidence the plan is absent. This lane has no status code to return: the
    // throw leaves the handler, the pipeline's step loop catches it, and the command
    // fails. What matters either way is that nothing was archived.
    getAllModelsMock.mockReturnValue({
      WorkoutPlan: { findByPk: async () => { throw new Error('connection reset'); } },
    });
    await expect(dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: trainer })).rejects.toThrow();
    expect(transitionMock).not.toHaveBeenCalled();
  });

  it('denies a caller with no role at all', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: { id: OUR_TRAINER } });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
  });
});
