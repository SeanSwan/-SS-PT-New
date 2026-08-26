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
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getAllModels, getModel } from '../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../services/workoutPlanLifecycleService.mjs';
import { dispatchDeleteWorkoutPlan } from '../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs';
import { OUR_TRAINER, PEER_TRAINER, OWN_CLIENT, FOREIGN_CLIENT } from '../helpers/ownershipFixture.mjs';

vi.mock('../../database.mjs', () => ({ default: {} }));
vi.mock('../../services/workoutPlanLifecycleService.mjs', () => ({
  transitionWorkoutPlanLifecycle: vi.fn(),
}));
vi.mock('../../models/index.mjs', () => ({
  getAllModels: vi.fn(),
  getModel: vi.fn(),
}));

const transitionMock = vi.mocked(transitionWorkoutPlanLifecycle);
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
  });

  it('lets an admin archive any plan', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: FOREIGN_PLAN }, { user: admin });
    expect(transitionMock).toHaveBeenCalledTimes(1);
    expect(result.planFound).toBe(true);
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

  it('denies a caller with no role at all', async () => {
    const result = await dispatchDeleteWorkoutPlan({ planId: OWN_PLAN }, { user: { id: OUR_TRAINER } });
    expect(transitionMock).not.toHaveBeenCalled();
    expect(result.planFound).toBe(false);
  });
});
