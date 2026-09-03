/**
 * ============================================================================
 * FILE: dispatchers/workoutPlanCommandDispatchers.mjs
 * PURPOSE: Workout-plan write dispatchers for Swan Coach command execution
 * OWNER: Codex | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Routes Swan Coach archive commands through the same
 * audited lifecycle boundary as the protected REST API, under the same access
 * check that route's middleware applies.
 * HOW IT FITS IN THE APP: Confirmed command -> dispatcher -> access check ->
 * lifecycle service -> locked plan transition plus immutable receipt.
 * KEY DECISIONS: Archived is explicit and terminal; command results expose only
 * bounded identifiers/status, never plan content or client PII.
 *
 * THE ACCESS CHECK IS NOT OPTIONAL, AND WAS ONCE ABSENT: this header claimed
 * parity with the protected REST route while performing no authorization at
 * all. `DELETE /api/workout-plans/:id` is guarded by
 * `verifyClientAccessByPlanId`; commands never travel over routes, so no
 * middleware runs for this lane and the guard has to be called here. Sharing a
 * boundary with a protected caller is not the same as being protected.
 */

import sequelize from '../../../database.mjs';
import { getAllModels } from '../../../models/index.mjs';
import { transitionWorkoutPlanLifecycle } from '../../workoutPlanLifecycleService.mjs';
import { assertAssignmentOrAdmin } from '../../../middleware/verifyClientAccess.mjs';
import { recordCommandAudit } from '../commandAudit.mjs';

/**
 * Audit without being able to hurt the caller.
 *
 * `recordCommandAudit` already catches everything internally and resolves `false` on failure
 * — that is verified in `tests/unit/commandAuditNeverRejects.test.mjs`, not assumed. But both
 * calls below are fire-and-forget on a DENIAL path, and an unawaited promise that ever did
 * reject would be an unhandled rejection, which Node treats as fatal by default. Best-effort
 * auditing would become "the audit table hiccuped, so the process died".
 *
 * So the invariant is enforced HERE rather than borrowed from there. Same reasoning as the
 * scope guard this file's sibling carries in two places: a caller should not depend on
 * another module's internals for its own crash-safety, because that module's contract is
 * free to change and nothing would fail loudly when it did.
 *
 * BOTH forms are contained, and the second is why this is a try/catch and not a bare
 * `.catch()`. A rejected promise and a SYNCHRONOUS throw are different failures: the throw
 * happens while the argument is being evaluated, before `Promise.resolve` is ever reached, so
 * `.catch()` alone would let it escape. The first draft here was a bare `.catch()`; the test
 * that names the synchronous case is what caught it.
 */
const auditQuietly = (entry) => {
  try {
    Promise.resolve(recordCommandAudit(entry)).catch(() => {});
  } catch {
    // Deliberately silent: the caller is already on a denial path and has an answer to give.
  }
};

/**
 * Denial and absence are the same answer on purpose.
 *
 * `verifyClientAccessByPlanId` — the middleware guarding the REST route to this same
 * operation — answers cross-tenant access with 404 rather than 403 so that an attacker
 * walking ids cannot tell "exists but not yours" from "does not exist". This lane already
 * had a not-found shape, so denial reuses it rather than inventing a distinguishable one.
 */
const planNotAvailable = (planId) => ({
  planId,
  planFound: false,
  archived: false,
  previousStatus: null,
  status: null,
  clientId: null,
  trainerId: null,
});

/**
 * Archive a workout plan through the canonical lifecycle boundary.
 * @param {{ planId: string|number }} params
 * @param {{ user?: { id?: number } }} ctx
 * @returns {Promise<Record<string, unknown>>}
 */
export async function dispatchDeleteWorkoutPlan(params = {}, ctx = {}) {
  const { WorkoutPlan } = getAllModels();
  const planId = params.planId;

  // `delete_workout_plan` declares `requiresClientRef: false`, so the pipeline resolves no
  // client and applies no scope — the caller-supplied planId arrives unexamined. The
  // lifecycle service does not close that: it validates `actorId` as a positive integer
  // and records it for audit, which is why its own comment says it applies one ALREADY
  // authorized action. Authorizing it is this caller's job, exactly as it is the REST
  // route's, and through the same helper that route's middleware uses.
  //
  // Named for its ROLE, not its type. The success path below binds its own "plan" from the
  // lifecycle result — a different row at a different moment — and an earlier draft of this
  // fix called both of them "plan", so a reader inside the try block saw a name that had
  // silently changed meaning. In a function whose whole job is deciding who may act on which
  // record, two rows sharing one name is not a style question.
  const planForAuth = await WorkoutPlan.findByPk(planId);
  if (!planForAuth) {
    // The ABSENCE probe is audited too, and that is the half a review caught me missing.
    // Recording only "exists, but not yours" sees the smallest slice of an enumeration
    // attack: someone walking ids mostly hits ids that do not exist, so the signal is the
    // VOLUME of misses, and that was the part going unrecorded. Distinguishable code so an
    // operator can separate a probe sweep from a stale UI; identical response either way.
    auditQuietly({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: 'delete_workout_plan',
      params: { planId },
      destructive: true,
      confirmationState: 'confirmed',
      outcome: 'not_wired',
      errorCode: 'handler_plan_absent',
    });
    return planNotAvailable(planId);
  }
  const permitted = await assertAssignmentOrAdmin(ctx.user?.id, ctx.user?.role, planForAuth.userId);
  if (!permitted) {
    // The RESPONSE stays indistinguishable from "no such plan" — that is the whole point of
    // the 404-parity design. The SERVER-SIDE record must not be. Without this line, a caller
    // walking plan ids leaves a trail identical to someone mistyping one, and the
    // enumeration attack the parity design anticipates is invisible in the only place
    // detection could live. Best-effort and never thrown: an audit write must not be able to
    // turn a denial into a 500.
    // The probe TARGET is recorded; the probe's VICTIM is not. An earlier draft wrote
    // `targetClientId: planForAuth.userId`, which attests "user X probed a plan belonging to
    // client Y" — freezing Y's linkage into a retained security log on the strength of a
    // guess that happened to collide. This file's own doctrine is bounded identifiers, and
    // `planId` is the caller's OWN input: it reconstructs the campaign just as well, and the
    // owner can be joined from the plans table at investigation time by someone who has a
    // reason to look. Detection does not require naming the person who was nearly exposed.
    auditQuietly({
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
      commandType: 'delete_workout_plan',
      params: { planId },
      destructive: true,
      confirmationState: 'confirmed',
      outcome: 'denied',
      errorCode: 'handler_denied_plan_access',
    });
    return planNotAvailable(planId);
  }

  try {
    const result = await transitionWorkoutPlanLifecycle({
      sequelize,
      WorkoutPlan,
      planId,
      action: 'archive',
      actorId: ctx.user?.id,
    });
    const plan = result.plan;
    const receipt = result.lifecycleReceipt;

    return {
      planId: plan.id ?? planId,
      planFound: true,
      archived: receipt?.fromStatus !== 'archived',
      previousStatus: receipt?.fromStatus ?? null,
      status: plan.status ?? 'archived',
      lifecycleReceiptId: receipt?.id ?? null,
      clientId: plan.userId ?? null,
      trainerId: plan.trainerId ?? null,
    };
  } catch (error) {
    if (error?.code !== 'WORKOUT_PLAN_NOT_FOUND') throw error;
    // Same helper as the denial path above, so the two answers cannot drift apart. Kept
    // as one expression rather than two identical literals: if a later edit adds a field
    // to one of them, an unassigned caller becomes distinguishable from a stranger, and
    // nothing about that edit would look like a security change.
    return planNotAvailable(planId);
  }
}