/**
 * ============================================================================
 * FILE: workoutPlanMutationConcurrency.test.mjs
 * PURPOSE: Prove concurrent prescription edits cannot overwrite each other.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Runs two revision-four mutations against a serialized
 * transaction harness and proves exactly one becomes revision five.
 * HOW IT FITS IN THE APP: It is the concurrency receipt for the canonical
 * WorkoutPlan mutation boundary used by every active plan writer.
 * KEY DECISIONS: The second transaction waits behind the first row lock, then
 * sees the committed revision and returns a typed reload-safe conflict.
 * NASM PROTOCOL CONTEXT: Two coaches cannot silently replace one another's
 * prescribed exercise changes.
 */

import { describe, expect, it, vi } from 'vitest';
import { mutateWorkoutPlanRecord } from '../../services/workoutPlanMutationService.mjs';
import { hashWorkoutPlanContent } from '../../services/workoutPlanRevisionService.mjs';

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

const basePlanData = () => ({
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{ exerciseName: 'Goblet Squat', sets: 3, reps: '8-12' }],
    }],
  }],
});

const serializedSequelize = () => {
  let tail = Promise.resolve();
  return {
    transaction: vi.fn(async (operation) => {
      const previous = tail;
      const release = deferred();
      tail = release.promise;
      await previous;
      try {
        return await operation({ LOCK: { UPDATE: 'UPDATE' } });
      } finally {
        release.resolve();
      }
    }),
  };
};

describe('WorkoutPlan mutation concurrency', () => {
  it('commits one material write and rejects the stale waiter', async () => {
    const originalPlanData = basePlanData();
    const firstUpdateStarted = deferred();
    const allowFirstCommit = deferred();
    const plan = {
      id: 'plan-concurrency-1',
      planData: originalPlanData,
      contentRevision: 4,
      contentHash: hashWorkoutPlanContent(originalPlanData),
    };
    plan.update = vi.fn(async (updates) => {
      firstUpdateStarted.resolve();
      await allowFirstCommit.promise;
      Object.assign(plan, updates);
      return plan;
    });
    const WorkoutPlan = { findByPk: vi.fn(async () => plan) };
    const sequelize = serializedSequelize();
    const firstPlanData = structuredClone(originalPlanData);
    firstPlanData.weeks[0].days[0].exercises[0].sets = 4;
    const secondPlanData = structuredClone(originalPlanData);
    secondPlanData.weeks[0].days[0].exercises[0].reps = '12-15';

    const first = mutateWorkoutPlanRecord({
      sequelize, WorkoutPlan, planId: plan.id, expectedRevision: 4,
      updates: { planData: firstPlanData },
    });
    await firstUpdateStarted.promise;
    const second = mutateWorkoutPlanRecord({
      sequelize, WorkoutPlan, planId: plan.id, expectedRevision: 4,
      updates: { planData: secondPlanData },
    });
    await Promise.resolve();

    expect(sequelize.transaction).toHaveBeenCalledTimes(2);
    expect(WorkoutPlan.findByPk).toHaveBeenCalledTimes(1);
    allowFirstCommit.resolve();
    const [firstResult, secondResult] = await Promise.allSettled([first, second]);

    expect(firstResult).toMatchObject({
      status: 'fulfilled',
      value: { contentChanged: true, contentRevision: 5 },
    });
    expect(secondResult).toMatchObject({
      status: 'rejected',
      reason: {
        code: 'WORKOUT_PLAN_REVISION_CONFLICT',
        statusCode: 409,
        currentRevision: 5,
      },
    });
    expect(plan.update).toHaveBeenCalledTimes(1);
    expect(plan.planData).toEqual(firstPlanData);
  });
});
