import { describe, expect, it } from 'vitest';
import { buildWorkoutSubmitSuccessMessage } from './WorkoutLogger.submitReceipt';

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
