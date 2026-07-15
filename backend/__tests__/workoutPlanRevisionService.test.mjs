/**
 * Workout Plan Revision Contract
 * ==============================
 *
 * RED-first contract for deterministic prescribed-content identity. Mutable
 * completion/cursor evidence must not rewrite the prescription revision, while
 * a real exercise prescription change must produce a new hash and revision.
 */
import { describe, expect, it } from 'vitest';

const loadRevisionService = async () => {
  try {
    return await import('../services/workoutPlanRevisionService.mjs');
  } catch {
    return null;
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
