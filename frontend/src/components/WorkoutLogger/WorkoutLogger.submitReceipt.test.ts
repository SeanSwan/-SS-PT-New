import { describe, expect, it } from 'vitest';
import {
  buildWorkoutChallengeImpactSummary,
  buildWorkoutSubmitSuccessMessage,
} from './WorkoutLogger.submitReceipt';

describe('buildWorkoutSubmitSuccessMessage', () => {
  it('surfaces the backend-authoritative credit deduction count and balance', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-1',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: true,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'deducted',
        shouldDeduct: true,
        sessionDeducted: true,
        creditsDeducted: 2,
        creditsRequired: 2,
        remainingSessions: 4,
      },
    })).toBe('Workout saved. 2 credits deducted; 4 remaining.');
  });

  it('keeps free-tracking and zero-credit sessions explicit', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-2',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: false,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'not_deducted',
        shouldDeduct: false,
        sessionDeducted: false,
        creditsDeducted: 0,
        creditsRequired: 0,
        remainingSessions: 0,
      },
    })).toBe('Workout saved. No paid session deducted.');
  });

  it('calls out scheduled sessions that were already deducted before logging', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-3',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: true,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'previously_deducted',
        shouldDeduct: false,
        sessionDeducted: true,
        creditsDeducted: 0,
        creditsRequired: 1,
        remainingSessions: 3,
      },
    })).toBe('Workout saved. Scheduled credit was already deducted.');
  });


  it('adds challenge impact when a workout moves an active challenge', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-5',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: false,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'not_deducted',
        shouldDeduct: false,
        sessionDeducted: false,
        creditsDeducted: 0,
        creditsRequired: 0,
        remainingSessions: 0,
      },
      challengeProgress: {
        status: 'processed',
        updatedCount: 2,
        skippedCount: 0,
        headline: '2 challenges moved from this workout',
        updates: [
          {
            challengeId: 'challenge-1',
            title: 'Session Streak',
            delta: 1,
            progressUnit: 'sessions',
            currentProgress: 2,
            progressPercentage: 66.67,
            completed: false,
            xpEarned: 0,
          },
          {
            challengeId: 'challenge-2',
            title: '150 Minute Week',
            delta: 45,
            progressUnit: 'minutes',
            currentProgress: 150,
            progressPercentage: 100,
            completed: true,
            xpEarned: 250,
          },
        ],
      },
    })).toBe('Workout saved. No paid session deducted. Challenge completed: 150 Minute Week (+250 XP) +1 more.');
  });

  it('calls out completed challenge rewards without dropping billing truth', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-6',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: true,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'deducted',
        shouldDeduct: true,
        sessionDeducted: true,
        creditsDeducted: 1,
        creditsRequired: 1,
        remainingSessions: 3,
      },
      challengeProgress: {
        status: 'processed',
        updatedCount: 1,
        skippedCount: 0,
        headline: '1 challenge moved from this workout',
        updates: [{
          challengeId: 'challenge-2',
          title: '150 Minute Week',
          delta: 45,
          progressUnit: 'minutes',
          currentProgress: 150,
          progressPercentage: 100,
          completed: true,
          xpEarned: 250,
        }],
      },
    })).toBe('Workout saved. 1 credit deducted; 3 remaining. Challenge completed: 150 Minute Week (+250 XP).');
  });
  it('uses assigned-session wording in the success message when assigned-session progress moves', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-7',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: false,
      formData: { exercises: [], sessionNotes: '' },
      billing: {
        status: 'not_deducted',
        shouldDeduct: false,
        sessionDeducted: false,
        creditsDeducted: 0,
        creditsRequired: 0,
        remainingSessions: 0,
      },
      challengeProgress: {
        status: 'processed',
        updatedCount: 1,
        skippedCount: 0,
        headline: '1 challenge moved from this workout',
        updates: [{
          challengeId: 'assigned-sessions',
          title: 'Three Planned Sessions',
          delta: 1,
          progressUnit: 'sessions',
          currentProgress: 2,
          progressPercentage: 66.67,
          completed: false,
          xpEarned: 0,
          assignedSessionOnly: true,
          assignedSession: true,
        }],
      },
    })).toBe('Workout saved. No paid session deducted. Challenge moved: Three Planned Sessions +1 assigned session (67%).');
  });
  it('builds visible item details for every challenge moved by the workout', () => {
    const summary = buildWorkoutChallengeImpactSummary({
      status: 'processed',
      updatedCount: 2,
      skippedCount: 0,
      headline: '2 challenges moved from this workout',
      updates: [
        {
          challengeId: 'challenge-1',
          title: 'Session Streak',
          delta: 1,
          progressUnit: 'sessions',
          currentProgress: 2,
          progressPercentage: 66.67,
          completed: false,
          xpEarned: 0,
        },
        {
          challengeId: 'challenge-2',
          title: '150 Minute Week',
          delta: 45,
          progressUnit: 'minutes',
          currentProgress: 150,
          progressPercentage: 100,
          completed: true,
          xpEarned: 250,
        },
      ],
    });

    expect(summary?.updateItems).toEqual([
      expect.objectContaining({
        title: '150 Minute Week',
        completed: true,
        detail: '+250 XP earned from this workout.',
      }),
      expect.objectContaining({
        title: 'Session Streak',
        completed: false,
        detail: '+1 session logged. 67% complete.',
      }),
    ]);
  });
  it('falls back to the server message when structured billing is absent', () => {
    expect(buildWorkoutSubmitSuccessMessage({
      id: 'form-4',
      clientId: 91,
      trainerId: 5,
      date: '2026-06-07',
      sessionDeducted: true,
      formData: { exercises: [], sessionNotes: '' },
    }, 'Workout logged successfully and session deducted')).toBe('Workout logged successfully and session deducted');
  });
});
