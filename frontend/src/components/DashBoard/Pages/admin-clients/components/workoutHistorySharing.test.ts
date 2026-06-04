import { describe, expect, it } from 'vitest';

import {
  buildPersonalRecordShareSession,
  buildWorkoutHistoryShareModalState,
} from './workoutHistorySharing';

describe('workoutHistorySharing', () => {
  it('turns a personal record into an achievement share session', () => {
    const session = buildPersonalRecordShareSession({
      exercise: 'Bench Press',
      weight: 225,
      reps: 5,
      date: '2026-05-20',
      estimated1RM: 260,
    });

    expect(session).toEqual({
      id: 'pr-Bench Press',
      title: 'Bench Press',
      date: '2026-05-20',
      duration: 0,
      intensity: 0,
      status: 'completed',
      totalSets: 0,
      totalReps: 5,
      totalWeight: 225,
      logs: [],
    });
  });

  it('builds workout modal state with the real workout session id', () => {
    const state = buildWorkoutHistoryShareModalState('Sean Swan', {
      id: 'workout-10',
      title: 'Push Day',
      date: '2026-05-21',
      duration: 45,
      intensity: 8,
      status: 'completed',
      totalSets: 6,
      totalReps: 54,
      totalWeight: 12345,
      logs: [{ id: 1 }, { id: 2 }],
    } as any);

    expect(state).toEqual({
      postType: 'workout',
      workoutSessionId: 'workout-10',
      prefilledContent: 'Sean Swan crushed a Push Day workout! 2 exercises, 12,345 lbs total volume.',
    });
  });

  it('builds achievement modal state without a workout session id for PR shares', () => {
    const state = buildWorkoutHistoryShareModalState('Sean Swan', {
      id: 'pr-Bench Press',
      title: 'Bench Press',
      date: '2026-05-20',
      duration: 0,
      intensity: 0,
      status: 'completed',
      totalSets: 0,
      totalReps: 5,
      totalWeight: 225,
      logs: [],
    });

    expect(state).toEqual({
      postType: 'achievement',
      workoutSessionId: undefined,
      prefilledContent: 'New Personal Record! Sean Swan hit 225 lbs x 5 reps on Bench Press!',
    });
  });

  it('returns empty modal state when there is no selected share session', () => {
    expect(buildWorkoutHistoryShareModalState('Sean Swan', null)).toEqual({
      postType: 'workout',
      workoutSessionId: undefined,
      prefilledContent: '',
    });
  });
});
