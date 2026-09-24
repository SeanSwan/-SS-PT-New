import { describe, expect, it } from 'vitest';
import {
  buildCoachWorkoutDraftRequest,
  CoachWorkoutDraftContractError,
  validateCoachWorkoutContent,
  type CoachWorkoutDraftContent,
} from './coachWorkoutDraftContract';

const ids = {
  taskId: '11111111-1111-4111-8111-111111111111',
  requestKey: '22222222-2222-4222-8222-222222222222',
};

const content = (unit: 'lb' | 'kg' | 'bodyweight' = 'lb'): CoachWorkoutDraftContent => ({
  date: '2026-09-08',
  title: 'Strength day',
  notes: null,
  exercises: [{
    exerciseInstanceId: 'instance-squat-1',
    exerciseId: '33333333-3333-4333-8333-333333333333',
    exerciseName: 'Back Squat',
    unit,
    sets: [{ setNumber: 1, reps: 5, weight: unit === 'bodyweight' ? 0 : 135 }],
  }],
});

const submitted = (nextContent: CoachWorkoutDraftContent = content()) => ({
  taskId: ids.taskId,
  requestKey: ids.requestKey,
  submittedRevision: 4,
  actorId: 7,
  targetUserId: 42,
  snapshot: {
    taskId: ids.taskId,
    requestKey: ids.requestKey,
    submittedRevision: 4,
    actorId: 7,
    targetUserId: 42,
    actorRole: 'trainer',
    origin: 'workout',
    revision: 4,
    content: nextContent,
    dirty: true,
    scopeToken: `${ids.taskId}:1`,
  },
});

describe('G04b canonical workout draft contract', () => {
  it('keeps explicit numeric units and accepts incomplete editing only before submit', () => {
    expect(validateCoachWorkoutContent({ ...content(), exercises: [{ ...content().exercises[0], sets: [{ setNumber: 1, reps: null, weight: null }] }] })).toMatchObject({ date: '2026-09-08' });
    expect(() => buildCoachWorkoutDraftRequest(submitted({ ...content(), exercises: [{ ...content().exercises[0], sets: [{ setNumber: 1, reps: null, weight: null }] }] }))).toThrowError('Each set needs an exact nonnegative repetition count.');
  });

  it('rejects kilogram transport until the backend unit mapping is explicit', () => {
    try {
      buildCoachWorkoutDraftRequest(submitted(content('kg')));
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(CoachWorkoutDraftContractError);
      expect((error as CoachWorkoutDraftContractError).code).toBe('UNIT_MAPPING_REQUIRED');
    }
  });

  it('encodes the frozen revision and stable retry identity without mutation', () => {
    const frozen = submitted(content());
    const request = buildCoachWorkoutDraftRequest(frozen);
    expect(request).toMatchObject({
      schemaVersion: 1,
      taskId: ids.taskId,
      requestKey: ids.requestKey,
      draftRevision: 4,
      targetUserId: 42,
      workout: { clientId: 42, date: '2026-09-08' },
    });
    expect(request.workout.exercises[0].sets[0]).toEqual({ setNumber: 1, reps: 5, weight: 135 });
    expect(frozen.snapshot.requestKey).toBe(ids.requestKey);
  });

  it('requires an authorized staff role and explicit bodyweight zero', () => {
    expect(() => buildCoachWorkoutDraftRequest({ ...submitted(), snapshot: { ...submitted().snapshot, actorRole: 'client' } })).toThrowError('Only trainer and admin actors can submit workout drafts.');
    expect(() => validateCoachWorkoutContent({ ...content(), exercises: [{ ...content().exercises[0], unit: 'bodyweight', sets: [{ setNumber: 1, reps: 5, weight: 10 }] }] })).toThrowError('Bodyweight sets must use an explicit zero load.');
  });
});
