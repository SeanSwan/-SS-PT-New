/**
 * ============================================================================
 * FILE: workoutPlanLifecycleService.mjs
 * PURPOSE: Own audited, transactional workout-plan lifecycle transitions.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-16
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Serializes lifecycle changes per client, preserves one
 * active plan, records immutable receipts, and requests a PDF only on activation.
 * HOW IT FITS IN THE APP: Protected status handlers -> lifecycle service ->
 * canonical mutation boundary -> WorkoutPlan plus lifecycle receipt.
 * KEY DECISIONS: Locks every client plan in stable UUID order before mutation;
 * archived is terminal, and activation-only extras cannot override status.
 */
import { randomUUID } from 'node:crypto';
import { mutateWorkoutPlanRecord } from './workoutPlanMutationService.mjs';
import { toPlainObject } from './workoutPlanRouteHelpers.mjs';

const TARGET_STATUS = Object.freeze({
  activate: 'active',
  pause: 'paused',
  complete: 'completed',
  archive: 'archived',
});
const ALLOWED_FROM = Object.freeze({
  activate: new Set(['active', 'paused', 'draft']),
  pause: new Set(['active', 'paused']),
  complete: new Set(['active', 'paused', 'completed']),
  archive: new Set(['active', 'paused', 'draft', 'completed', 'archived']),
});
const TARGET_UPDATE_FIELDS = new Set(['currentWeek', 'currentDay', 'metadata']);

const cleanStatus = (value) => String(value || '').trim().toLowerCase();
const positiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export class WorkoutPlanLifecycleError extends Error {
  constructor(message, { code, statusCode } = {}) {
    super(message);
    this.name = 'WorkoutPlanLifecycleError';
    this.code = code || 'WORKOUT_PLAN_LIFECYCLE_FAILED';
    this.statusCode = statusCode || 500;
  }
}

const validateRequest = ({ action, actorId, planId }) => {
  const normalizedAction = String(action || '').trim().toLowerCase();
  if (!Object.hasOwn(TARGET_STATUS, normalizedAction)) {
    throw new WorkoutPlanLifecycleError('Unsupported workout-plan lifecycle action.', {
      code: 'WORKOUT_PLAN_LIFECYCLE_ACTION_INVALID', statusCode: 400,
    });
  }
  if (!planId) {
    throw new WorkoutPlanLifecycleError('Workout plan id is required.', {
      code: 'WORKOUT_PLAN_ID_REQUIRED', statusCode: 400,
    });
  }
  const safeActorId = positiveInteger(actorId);
  if (!safeActorId) {
    throw new WorkoutPlanLifecycleError('Authorized actor is required.', {
      code: 'WORKOUT_PLAN_ACTOR_REQUIRED', statusCode: 403,
    });
  }
  return { action: normalizedAction, actorId: safeActorId };
};

const lifecycleConflict = (fromStatus, action) => {
  throw new WorkoutPlanLifecycleError(
    `Cannot ${action} a workout plan with status ${fromStatus}.`,
    { code: 'WORKOUT_PLAN_LIFECYCLE_CONFLICT', statusCode: 409 },
  );
};

const assertLifecycleAllowed = (target, action) => {
  const fromStatus = cleanStatus(target.status);
  if (!ALLOWED_FROM[action].has(fromStatus)) lifecycleConflict(fromStatus, action);
  return fromStatus;
};

const resolveTargetUpdates = async (input, target) => {
  if (!input.targetUpdates) return {};
  const requested = typeof input.targetUpdates === 'function'
    ? await input.targetUpdates(target)
    : input.targetUpdates;
  if (!requested || typeof requested !== 'object' || Array.isArray(requested)) {
    throw new WorkoutPlanLifecycleError('Lifecycle target updates must be an object.', {
      code: 'WORKOUT_PLAN_LIFECYCLE_TARGET_UPDATES_INVALID', statusCode: 500,
    });
  }
  const unsupported = Object.keys(requested).filter((field) => !TARGET_UPDATE_FIELDS.has(field));
  if (input.action !== 'activate' || unsupported.length > 0) {
    throw new WorkoutPlanLifecycleError('Unsupported lifecycle target update.', {
      code: 'WORKOUT_PLAN_LIFECYCLE_TARGET_UPDATES_INVALID', statusCode: 500,
    });
  }
  return { ...requested };
};

/** Records one append-only lifecycle transition receipt. */
export const recordWorkoutPlanLifecycleReceipt = async ({
  sequelize,
  transaction,
  planId,
  actorId,
  fromStatus,
  toStatus,
  action,
}) => {
  if (typeof sequelize?.query !== 'function') {
    throw new WorkoutPlanLifecycleError('Lifecycle receipt storage is unavailable.', {
      code: 'WORKOUT_PLAN_LIFECYCLE_RECEIPT_UNAVAILABLE', statusCode: 500,
    });
  }
  const id = randomUUID();
  const createdAt = new Date();
  await sequelize.query([
    'INSERT INTO workout_plan_lifecycle_receipts',
    '  (id, plan_id, actor_id, from_status, to_status, action, created_at)',
    'VALUES',
    '  (:id, :planId, :actorId, :fromStatus, :toStatus, :action, :createdAt)',
  ].join('\n'), {
    replacements: { id, planId, actorId, fromStatus, toStatus, action, createdAt },
    transaction,
  });
  return { id, planId, actorId, fromStatus, toStatus, action, createdAt };
};

const transitionReceipt = (input, overrides) => input.recordReceipt({
  sequelize: input.sequelize,
  transaction: input.transaction,
  actorId: input.actorId,
  ...overrides,
});

const updateSiblingForActivation = async (input, sibling) => {
  const fromStatus = cleanStatus(sibling.status);
  if (fromStatus !== 'active') return { plan: toPlainObject(sibling), receipt: null };
  const updates = { status: 'paused' };
  const mutation = await input.mutateRecord({
    sequelize: input.sequelize,
    WorkoutPlan: input.WorkoutPlan,
    planId: sibling.id,
    updates,
    transaction: input.transaction,
  });
  const plan = { ...toPlainObject(mutation.plan), ...updates };
  const receipt = await transitionReceipt(input, {
    planId: sibling.id, fromStatus, toStatus: 'paused', action: 'activate_sibling_pause',
  });
  return { plan, receipt };
};

const transitionTarget = async (input, target) => {
  const fromStatus = assertLifecycleAllowed(target, input.action);
  const toStatus = TARGET_STATUS[input.action];
  if (fromStatus === toStatus && input.action !== 'activate') {
    const receipt = await transitionReceipt(input, {
      planId: target.id, fromStatus, toStatus, action: `${input.action}_noop`,
    });
    return { plan: toPlainObject(target), pdfDerivative: null, lifecycleReceipt: receipt };
  }

  const additionalUpdates = await resolveTargetUpdates(input, target);
  const updates = { ...additionalUpdates, status: toStatus };
  if (input.action === 'archive') {
    updates.archivedAt = input.now();
    updates.archivedBy = input.actorId;
  }
  const pdfDerivativeIntent = input.action === 'activate'
    ? { requestedBy: input.actorId, reason: input.derivativeReason, promoteGenerated: true }
    : undefined;
  const mutation = await input.mutateRecord({
    sequelize: input.sequelize,
    WorkoutPlan: input.WorkoutPlan,
    planId: target.id,
    updates,
    transaction: input.transaction,
    pdfDerivativeIntent,
  });
  const plan = { ...toPlainObject(mutation.plan), ...updates };
  const receipt = await transitionReceipt(input, {
    planId: target.id, fromStatus, toStatus, action: input.action,
  });
  return { plan, pdfDerivative: mutation.pdfDerivative || null, lifecycleReceipt: receipt };
};

/** Applies one authorized lifecycle action with stable per-client row locking. */
export const transitionWorkoutPlanLifecycle = async ({
  sequelize,
  WorkoutPlan,
  planId,
  action,
  actorId,
  mutateRecord = mutateWorkoutPlanRecord,
  recordReceipt = recordWorkoutPlanLifecycleReceipt,
  now = () => new Date(),
  validateTarget,
  targetUpdates,
  derivativeReason = 'activation',
  transaction: providedTransaction,
} = {}) => {
  const request = validateRequest({ action, actorId, planId });
  const canRunTransaction = providedTransaction || typeof sequelize?.transaction === 'function';
  if (!canRunTransaction || typeof WorkoutPlan?.findByPk !== 'function') {
    throw new WorkoutPlanLifecycleError('Workout-plan lifecycle storage is unavailable.', {
      code: 'WORKOUT_PLAN_LIFECYCLE_STORAGE_UNAVAILABLE', statusCode: 500,
    });
  }

  const operation = async (transaction) => {
    const preview = await WorkoutPlan.findByPk(planId, { transaction });
    if (!preview) {
      throw new WorkoutPlanLifecycleError('Workout plan not found.', {
        code: 'WORKOUT_PLAN_NOT_FOUND', statusCode: 404,
      });
    }
    const lock = transaction?.LOCK?.UPDATE;
    if (!lock || typeof WorkoutPlan.findAll !== 'function') {
      throw new WorkoutPlanLifecycleError('Workout-plan lifecycle lock is unavailable.', {
        code: 'WORKOUT_PLAN_LOCK_UNAVAILABLE', statusCode: 500,
      });
    }
    const lockedPlans = await WorkoutPlan.findAll({
      where: { userId: preview.userId },
      order: [['id', 'ASC']],
      transaction,
      lock,
    });
    const target = lockedPlans.find((plan) => String(plan.id) === String(planId));
    if (!target) {
      throw new WorkoutPlanLifecycleError('Workout plan not found.', {
        code: 'WORKOUT_PLAN_NOT_FOUND', statusCode: 404,
      });
    }
    assertLifecycleAllowed(target, request.action);
    if (typeof validateTarget === 'function') await validateTarget(target);
    const input = {
      ...request,
      sequelize,
      WorkoutPlan,
      transaction,
      mutateRecord,
      recordReceipt,
      now,
      targetUpdates,
      derivativeReason: String(derivativeReason || '').trim().slice(0, 64) || 'activation',
    };
    const siblingTransitions = [];
    if (request.action === 'activate') {
      for (const sibling of lockedPlans) {
        if (String(sibling.id) === String(target.id)) continue;
        siblingTransitions.push(await updateSiblingForActivation(input, sibling));
      }
    }
    const transitioned = await transitionTarget(input, target);
    const updatedById = new Map(
      [transitioned.plan, ...siblingTransitions.map(({ plan }) => plan)]
        .map((plan) => [String(plan.id), plan]),
    );
    return {
      ...transitioned,
      lifecycleReceipts: [
        ...siblingTransitions.map(({ receipt }) => receipt).filter(Boolean),
        transitioned.lifecycleReceipt,
      ],
      plans: lockedPlans.map((plan) => updatedById.get(String(plan.id)) || toPlainObject(plan)),
    };
  };
  return providedTransaction
    ? operation(providedTransaction)
    : sequelize.transaction(operation);
};