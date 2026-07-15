/**
 * ============================================================================
 * FILE: workoutPlanMutationService.mjs
 * PURPOSE: Own every transactional WorkoutPlan create and update invariant.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Wraps writes in a Sequelize transaction, locks existing
 * rows, computes prescribed-content identity, and rejects stale or unsafe writes.
 * HOW IT FITS IN THE APP: Active plan writer -> mutation service -> WorkoutPlan.
 * KEY DECISIONS: Dependencies are injected for testability; caller transactions
 * are reused; ownership and identity columns cannot be changed through updates.
 * NASM PROTOCOL CONTEXT: A plan revision represents the prescribed exercise
 * program, while cursor and completion evidence retain the same revision.
 */

import {
  hashWorkoutPlanContent,
  resolveWorkoutPlanContentRevision,
} from './workoutPlanRevisionService.mjs';

const RESERVED_UPDATE_FIELDS = new Set([
  'id',
  'userId',
  'trainerId',
  'contentRevision',
  'contentHash',
]);

const isRecord = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isContentHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value);

// SECTION: Typed boundary errors and dependency guards
// PURPOSE: Keep route/service callers on one stable status/code contract.
// WHY: Transaction, lock, and ownership failures must fail closed and remain diagnosable.

/**
 * Typed error for invalid or unavailable WorkoutPlan mutations.
 */
export class WorkoutPlanMutationError extends Error {
  constructor(message, { code, statusCode, field } = {}) {
    super(message);
    this.name = 'WorkoutPlanMutationError';
    this.code = code || 'WORKOUT_PLAN_MUTATION_FAILED';
    this.statusCode = statusCode || 500;
    if (field) this.field = field;
  }
}

const assertModelCapability = (WorkoutPlan, method) => {
  if (typeof WorkoutPlan?.[method] !== 'function') {
    throw new WorkoutPlanMutationError('WorkoutPlan model is unavailable', {
      code: 'WORKOUT_PLAN_MODEL_UNAVAILABLE',
      statusCode: 500,
    });
  }
};

const runInTransaction = ({ sequelize, transaction }, operation) => {
  if (transaction) return operation(transaction);
  if (typeof sequelize?.transaction !== 'function') {
    throw new WorkoutPlanMutationError('A Sequelize transaction provider is required', {
      code: 'WORKOUT_PLAN_TRANSACTION_UNAVAILABLE',
      statusCode: 500,
    });
  }
  return sequelize.transaction(operation);
};

const resolveUpdates = async (updates, plan) => {
  const resolved = typeof updates === 'function' ? await updates(plan) : updates;
  if (!isRecord(resolved)) {
    throw new WorkoutPlanMutationError('Workout plan updates must be an object', {
      code: 'WORKOUT_PLAN_INVALID_UPDATES',
      statusCode: 400,
    });
  }

  for (const field of RESERVED_UPDATE_FIELDS) {
    if (Object.hasOwn(resolved, field)) {
      throw new WorkoutPlanMutationError("Workout plan field '" + field + "' is immutable", {
        code: 'WORKOUT_PLAN_RESERVED_FIELD',
        statusCode: 400,
        field,
      });
    }
  }
  return resolved;
};

// SECTION: Canonical transactional write operations
// PURPOSE: Apply content identity exactly once for creates and locked updates.
// WHY: Bypassing this boundary would permit hash drift or lost concurrent edits.

/**
 * Creates a WorkoutPlan with revision-one prescribed-content identity.
 * @param {object} input Injected Sequelize/model dependencies and create values.
 * @returns {Promise<object>} The created Sequelize model instance.
 */
export const createWorkoutPlanRecord = async ({
  sequelize,
  WorkoutPlan,
  values,
  transaction,
} = {}) => {
  assertModelCapability(WorkoutPlan, 'create');
  if (!isRecord(values)) {
    throw new WorkoutPlanMutationError('Workout plan create values must be an object', {
      code: 'WORKOUT_PLAN_INVALID_VALUES',
      statusCode: 400,
    });
  }

  const planData = isRecord(values.planData) ? values.planData : {};
  const contentHash = hashWorkoutPlanContent(planData);

  return runInTransaction({ sequelize, transaction }, (activeTransaction) => (
    WorkoutPlan.create({
      ...values,
      planData,
      contentRevision: 1,
      contentHash,
    }, { transaction: activeTransaction })
  ));
};

/**
 * Locks and mutates one WorkoutPlan with optimistic prescription concurrency.
 * @param {object} input Injected dependencies, plan id, updates, and expectation.
 * @returns {Promise<{plan: object, contentChanged: boolean, contentRevision: number, contentHash: string}>}
 */
export const mutateWorkoutPlanRecord = async ({
  sequelize,
  WorkoutPlan,
  planId,
  updates,
  expectedRevision,
  transaction,
} = {}) => {
  assertModelCapability(WorkoutPlan, 'findByPk');
  if (planId === undefined || planId === null || planId === '') {
    throw new WorkoutPlanMutationError('Workout plan id is required', {
      code: 'WORKOUT_PLAN_ID_REQUIRED',
      statusCode: 400,
    });
  }

  return runInTransaction({ sequelize, transaction }, async (activeTransaction) => {
    const lock = activeTransaction?.LOCK?.UPDATE;
    if (!lock) {
      throw new WorkoutPlanMutationError('Workout plan update lock is unavailable', {
        code: 'WORKOUT_PLAN_LOCK_UNAVAILABLE',
        statusCode: 500,
      });
    }

    const plan = await WorkoutPlan.findByPk(planId, {
      transaction: activeTransaction,
      lock,
    });
    if (!plan) {
      throw new WorkoutPlanMutationError('Workout plan not found', {
        code: 'WORKOUT_PLAN_NOT_FOUND',
        statusCode: 404,
      });
    }
    if (typeof plan.update !== 'function') {
      throw new WorkoutPlanMutationError('WorkoutPlan row is not updatable', {
        code: 'WORKOUT_PLAN_MODEL_UNAVAILABLE',
        statusCode: 500,
      });
    }

    const safeUpdates = await resolveUpdates(updates, plan);
    const hasPlanDataUpdate = Object.hasOwn(safeUpdates, 'planData');
    const nextPlanData = hasPlanDataUpdate ? safeUpdates.planData : plan.planData;
    const hadIdentity = isContentHash(plan.contentHash);
    const identity = resolveWorkoutPlanContentRevision({
      currentRevision: plan.contentRevision,
      currentHash: plan.contentHash,
      nextPlanData,
      expectedRevision,
    });
    const persistedPlan = await plan.update({
      ...safeUpdates,
      contentRevision: identity.revision,
      contentHash: identity.hash,
    }, { transaction: activeTransaction });

    return {
      plan: persistedPlan || plan,
      contentChanged: hadIdentity ? identity.changed : hasPlanDataUpdate,
      contentRevision: identity.revision,
      contentHash: identity.hash,
    };
  });
};
