/**
 * ============================================================================
 * FILE: workoutPlanRevisionService.test.mjs
 * PURPOSE: Lock deterministic prescription identity and optimistic concurrency.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Exercises stable hashing, mutable-progress exclusions,
 * prototype-pollution defense, revision increments, and stale-write conflicts.
 * HOW IT FITS IN THE APP: Revision service -> contract tests -> writer safety.
 * KEY DECISIONS: Tests use realistic nested planData and assert domain outcomes.
 * NASM PROTOCOL CONTEXT: Prescription changes must remain distinguishable from
 * completion evidence so historical training receipts keep the correct meaning.
 */
import { describe, expect, it } from 'vitest';

// SECTION: Contract fixtures and module loading
// PURPOSE: Build representative plan data and keep RED explicit if the module is absent.
// WHY: Import failure must never turn a missing contract into a false-positive test.

const loadRevisionService = async () => {
  try {
    return await import('../services/workoutPlanRevisionService.mjs');
  } catch (error) {
    if (
      error?.code === 'ERR_MODULE_NOT_FOUND'
      && String(error.message).includes('workoutPlanRevisionService.mjs')
    ) {
      return null;
    }
    throw error;
  }
};

const basePlan = () => ({
  weeks: [{
    weekNumber: 1,
    days: [{
      dayNumber: 1,
      exercises: [{
        exerciseName: 'Goblet Squat',
        sets: 3,
        reps: '8-12',
        tempo: '3/1/1',
      }],
    }],
  }],
  assignmentDefaults: {
    defaultAssignmentType: 'trainer_session',
    shouldDeductSession: false,
  },
});

// SECTION: Deterministic identity and concurrency behavior
// PURPOSE: Lock every public invariant used by canonical plan writers.
// WHY: A regression here would corrupt revisions, receipts, or stale-write handling.
describe('workoutPlanRevisionService', () => {
  it('exports the deterministic revision contract', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();

    expect(service).toMatchObject({
      canonicalizeWorkoutPlanContent: expect.any(Function),
      hashWorkoutPlanContent: expect.any(Function),
      resolveWorkoutPlanContentRevision: expect.any(Function),
      WorkoutPlanRevisionConflictError: expect.any(Function),
    });
  });

  it('produces the same hash for equivalent objects with different key order', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const first = basePlan();
    const second = {
      assignmentDefaults: {
        shouldDeductSession: false,
        defaultAssignmentType: 'trainer_session',
      },
      weeks: first.weeks,
    };

    expect(service?.hashWorkoutPlanContent(first)).toBe(
      service?.hashWorkoutPlanContent(second),
    );
  });

  it('ignores mutable completion and cursor evidence', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const original = basePlan();
    const progressed = structuredClone(original);
    Object.assign(progressed, { currentWeek: 2, currentDay: 1 });
    Object.assign(progressed.weeks[0].days[0], {
      completed: true,
      completedAt: '2026-07-15T12:00:00.000Z',
      dailyWorkoutFormId: 'form-1',
      workoutSessionId: 'session-1',
      trainerNotes: 'Completed with controlled tempo',
      completionSource: 'daily_workout_form',
    });

    expect(service?.hashWorkoutPlanContent(progressed)).toBe(
      service?.hashWorkoutPlanContent(original),
    );
  });

  it('keeps __proto__ as inert prescribed data instead of mutating the accumulator', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const hostile = JSON.parse('{"__proto__":{"polluted":true},"weeks":[]}');

    const canonical = service.canonicalizeWorkoutPlanContent(hostile);

    expect(Object.prototype.polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(canonical, '__proto__')).toBe(true);
    expect(service.hashWorkoutPlanContent(hostile)).toMatch(/^[a-f0-9]{64}$/);
  });
  it('changes the hash when prescribed exercise content changes', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const changed = basePlan();
    changed.weeks[0].days[0].exercises[0].reps = '12-15';

    expect(service?.hashWorkoutPlanContent(changed)).not.toBe(
      service?.hashWorkoutPlanContent(basePlan()),
    );
  });

  it('increments only for a prescribed-content change', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const current = basePlan();
    const noOp = service?.resolveWorkoutPlanContentRevision({
      currentRevision: 5,
      currentHash: service?.hashWorkoutPlanContent(current),
      nextPlanData: structuredClone(current),
      expectedRevision: 4,
    });
    const changed = structuredClone(current);
    changed.weeks[0].days[0].exercises[0].sets = 4;
    const mutation = service?.resolveWorkoutPlanContentRevision({
      currentRevision: 5,
      currentHash: service?.hashWorkoutPlanContent(current),
      nextPlanData: changed,
      expectedRevision: 5,
    });

    expect(noOp).toMatchObject({ changed: false, revision: 5 });
    expect(mutation).toMatchObject({ changed: true, revision: 6 });
    expect(mutation?.hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('requires expectedRevision for an existing prescribed-content mutation', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const current = basePlan();
    const changed = structuredClone(current);
    changed.weeks[0].days[0].exercises[0].sets = 4;

    expect(() => service.resolveWorkoutPlanContentRevision({
      currentRevision: 1,
      currentHash: service.hashWorkoutPlanContent(current),
      nextPlanData: changed,
    })).toThrow(expect.objectContaining({
      code: 'WORKOUT_PLAN_REVISION_CONFLICT',
      statusCode: 409,
      currentRevision: 1,
    }));
  });

  it('does not coerce a malformed expected revision into revision one', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const current = basePlan();
    const changed = structuredClone(current);
    changed.weeks[0].days[0].exercises[0].sets = 4;

    expect(() => service.resolveWorkoutPlanContentRevision({
      currentRevision: 1,
      currentHash: service.hashWorkoutPlanContent(current),
      nextPlanData: changed,
      expectedRevision: 'one',
    })).toThrow(expect.objectContaining({
      code: 'WORKOUT_PLAN_REVISION_CONFLICT',
      currentRevision: 1,
    }));
  });
  it('rejects a stale prescribed-content mutation with a 409-safe error', async () => {
    const service = await loadRevisionService();
    expect(service).not.toBeNull();
    const changed = basePlan();
    changed.weeks[0].days[0].exercises[0].sets = 4;

    expect(() => service?.resolveWorkoutPlanContentRevision({
      currentRevision: 5,
      currentHash: service?.hashWorkoutPlanContent(basePlan()),
      nextPlanData: changed,
      expectedRevision: 4,
    })).toThrow(expect.objectContaining({
      code: 'WORKOUT_PLAN_REVISION_CONFLICT',
      statusCode: 409,
      currentRevision: 5,
    }));
  });
});
