/**
 * coachPlanEditApprovalService
 * ============================
 * Deterministic apply for the `plan_edit` proposal type: Swan Coach proposed a
 * field-level diff against a SAVED WorkoutPlan; the trainer approved a SUBSET of
 * items; ONLY that subset is written. The Coach never touches the plan directly —
 * this service is the single write path, after trainer approval (trainer-
 * indispensability doctrine, Sean 2026-07-11/12).
 *
 * Per-item approval is the new contract (Sean: approve "on a per exercise, per
 * tempo, per set, per weight basis"): the approve request carries
 * `approvedItemIds`; unapproved items are recorded as skipped, never applied.
 *
 * Weight is intensity-based BY CONTRACT: the Coach proposes targetIntensity
 * (%1RM), matching the plan generator — a raw weight never comes from the model.
 */
import sequelize from '../../database.mjs';
import { normalizeWorkoutPlanDataForPersistence } from '../workoutPlanDataPrivacyService.mjs';
import { mutateWorkoutPlanRecord } from '../workoutPlanMutationService.mjs';
import {
  normalizeWorkoutPlanId,
  parseStrictPositiveInteger,
} from '../workoutPlanRouteHelpers.mjs';

const toPlain = (value) => (value?.toJSON ? value.toJSON() : value);

/**
 * The single "which plan may this proposal edit" contract, shared by the apply
 * path AND the review/referee path so they can never disagree on the target.
 * Ownership is in the QUERY (IDOR posture): the plan must belong to the client
 * named in the proposal. `status: 'active'` refuses a plan archived/completed
 * after the proposal was created — a lingering proposal must not mutate it, and
 * the referee must not judge a stale target. Returns { plan, code }.
 */
export async function resolveActiveEditablePlan({ WorkoutPlan, payload }) {
  const planId = normalizeWorkoutPlanId(payload?.planId);
  const clientId = parseStrictPositiveInteger(payload?.clientId);
  if (!planId || !clientId) return { plan: null, code: 'PLAN_EDIT_IDENTITY_INVALID' };
  if (!WorkoutPlan) return { plan: null, code: 'PLAN_EDIT_MODEL_UNAVAILABLE' };
  const plan = await WorkoutPlan.findOne({
    where: { id: planId, userId: clientId, status: 'active' },
  });
  return plan ? { plan, code: null } : { plan: null, code: 'PLAN_EDIT_PLAN_NOT_FOUND' };
}

/** Locate the target exercise by week/day/exerciseName inside a planData copy. */
function findTarget(planData, item) {
  const weeks = Array.isArray(planData?.weeks) ? planData.weeks : [];
  const week = weeks.find((candidate, index) =>
    Number(candidate?.weekNumber ?? index + 1) === Number(item.weekNumber));
  if (!week) return null;
  const days = Array.isArray(week.days) && week.days.length ? week.days : week.sessions;
  const day = (Array.isArray(days) ? days : []).find((candidate, index) =>
    Number(candidate?.dayNumber ?? candidate?.day ?? index + 1) === Number(item.dayNumber));
  if (!day || !Array.isArray(day.exercises)) return null;
  const exercise = day.exercises.find((candidate) => {
    const name = String(candidate?.exerciseName ?? candidate?.name ?? '').trim().toLowerCase();
    return name === String(item.exerciseName ?? '').trim().toLowerCase();
  });
  return exercise ? { day, exercise } : null;
}

/** Apply ONE approved item to the (already-copied) planData. Returns an outcome. */
function applyItem(planData, item) {
  const target = findTarget(planData, item);
  if (!target) {
    return { id: item.id, outcome: 'failed_target_not_found', field: item.field };
  }
  const { exercise } = target;
  switch (item.field) {
    case 'sets':
      exercise.sets = Number(item.toValue);
      break;
    case 'reps':
      // Both shapes exist in planData vintages; write the one the row uses.
      if ('targetReps' in exercise || !('reps' in exercise)) exercise.targetReps = String(item.toValue);
      else exercise.reps = String(item.toValue);
      break;
    case 'tempo':
      exercise.tempo = String(item.toValue);
      break;
    case 'restSeconds':
      exercise.restSeconds = Number(item.toValue);
      break;
    case 'targetIntensity':
      exercise.targetIntensity = Number(item.toValue);
      break;
    case 'exerciseSwap':
      if ('exerciseName' in exercise || !('name' in exercise)) exercise.exerciseName = String(item.toValue);
      else exercise.name = String(item.toValue);
      break;
    case 'notes':
      exercise.notes = String(item.toValue);
      break;
    default:
      return { id: item.id, outcome: 'failed_unknown_field', field: item.field };
  }
  return { id: item.id, outcome: 'applied', field: item.field };
}

/**
 * @returns {{ ok: boolean, code?: string, result?: object }}
 */
export async function applyPlanEditProposal({ proposal, req, models }) {
  const payload = proposal?.payload || proposal || {};
  const items = Array.isArray(payload.items) ? payload.items : [];
  const approvedItemIds = req.body?.approvedItemIds;

  // Per-item approval is EXPLICIT: no id list, no write. An empty array is a
  // valid "approve none" (equivalent to rejecting every line but keeping the record).
  if (!Array.isArray(approvedItemIds)) {
    return { ok: false, code: 'PLAN_EDIT_APPROVED_ITEMS_REQUIRED' };
  }
  const approvedSet = new Set(approvedItemIds.map(String));
  const knownIds = new Set(items.map((item) => String(item.id)));
  for (const id of approvedSet) {
    if (!knownIds.has(id)) return { ok: false, code: 'PLAN_EDIT_UNKNOWN_ITEM_ID' };
  }

  const { WorkoutPlan } = models;
  if (!WorkoutPlan) return { ok: false, code: 'PLAN_EDIT_MODEL_UNAVAILABLE' };

  const { plan, code: loadCode } = await resolveActiveEditablePlan({ WorkoutPlan, payload });
  if (!plan) return { ok: false, code: loadCode };

  const planRecord = toPlain(plan);

  // Dry-run against the pre-read copy first: validates targets/fields and
  // decides whether a write is needed at all, without holding the row lock.
  const previewData = JSON.parse(JSON.stringify(planRecord.planData || {}));
  let outcomes = items.map((item) => (
    approvedSet.has(String(item.id))
      ? applyItem(previewData, item)
      : { id: item.id, outcome: 'skipped_not_approved', field: item.field }
  ));

  let appliedCount = outcomes.filter((entry) => entry.outcome === 'applied').length;
  if (appliedCount > 0) {
    // Re-apply the approved subset onto the LOCKED row's planData inside the
    // boundary. Rebuilding from the pre-read copy would wholesale-overwrite
    // progress markers a client wrote between pre-read and lock (completion
    // writes don't bump contentRevision by design, so the revision gate
    // cannot catch that race).
    await mutateWorkoutPlanRecord({
      sequelize,
      WorkoutPlan,
      planId: planRecord.id,
      expectedRevision: planRecord.contentRevision,
      updates: (lockedPlan) => {
        const lockedData = JSON.parse(JSON.stringify(toPlain(lockedPlan)?.planData || {}));
        outcomes = items.map((item) => (
          approvedSet.has(String(item.id))
            ? applyItem(lockedData, item)
            : { id: item.id, outcome: 'skipped_not_approved', field: item.field }
        ));
        appliedCount = outcomes.filter((entry) => entry.outcome === 'applied').length;
        return { planData: normalizeWorkoutPlanDataForPersistence(lockedData) };
      },
      pdfDerivativeIntent: {
        requestedBy: req.user?.id ?? null,
        reason: 'approved_ai_edit',
      },
    });
  }

  return {
    ok: true,
    result: {
      planId: planRecord.id,
      clientId: planRecord.userId,
      appliedCount,
      skippedCount: outcomes.filter((entry) => entry.outcome === 'skipped_not_approved').length,
      failedCount: outcomes.filter((entry) => entry.outcome.startsWith('failed')).length,
      itemOutcomes: outcomes,
    },
  };
}
