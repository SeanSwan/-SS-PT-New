/**
 * DailyWorkoutForm rating-helper truth locks
 * ==========================================
 *
 * Locks the model helpers used by GET /api/workout-forms/:id so missing
 * RPE/form ratings stay null-honest instead of being serialized as measured
 * zeroes. Real zero-count metrics such as totalSets/totalVolume remain numeric;
 * rating averages are nullable because an unrated workout is not a 0/10 or 0/5
 * workout.
 */
import { describe, expect, it } from 'vitest';
import DailyWorkoutForm from '../../models/DailyWorkoutForm.mjs';

function buildForm(formData) {
  return DailyWorkoutForm.build({
    clientId: 11,
    trainerId: 22,
    date: '2026-06-08',
    formData,
    totalPointsEarned: 0,
  });
}

describe('DailyWorkoutForm rating helpers', () => {
  it('returns null average RPE when no set has a real positive RPE rating', () => {
    const form = buildForm({
      exercises: [
        {
          exerciseName: 'Bench Press',
          formRating: null,
          sets: [
            { setNumber: 1, weight: 135, reps: 8, rpe: null },
            { setNumber: 2, weight: 135, reps: 8 },
            { setNumber: 3, weight: 135, reps: 8, rpe: 0 },
          ],
        },
      ],
    });

    expect(form.getAverageRPE()).toBeNull();
  });

  it('averages only positive numeric set RPE ratings', () => {
    const form = buildForm({
      exercises: [
        {
          exerciseName: 'Bench Press',
          sets: [
            { setNumber: 1, weight: 135, reps: 8, rpe: 7 },
            { setNumber: 2, weight: 145, reps: 6, rpe: '8' },
          ],
        },
        {
          exerciseName: 'Push-Up',
          sets: [
            { setNumber: 1, weight: 0, reps: 12, rpe: null },
            { setNumber: 2, weight: 0, reps: 10, rpe: 'bad' },
          ],
        },
      ],
    });

    expect(form.getAverageRPE()).toBe(7.5);
  });

  it('returns null average form rating when no exercise has a real positive rating', () => {
    const form = buildForm({
      exercises: [
        { exerciseName: 'Bench Press', formRating: null, sets: [] },
        { exerciseName: 'Row', formRating: 0, sets: [] },
      ],
    });

    expect(form.getAverageFormRating()).toBeNull();
  });

  it('averages only positive numeric exercise form ratings', () => {
    const form = buildForm({
      exercises: [
        { exerciseName: 'Bench Press', formRating: 4, sets: [] },
        { exerciseName: 'Row', formRating: '5', sets: [] },
        { exerciseName: 'Push-Up', formRating: null, sets: [] },
      ],
    });

    expect(form.getAverageFormRating()).toBe(4.5);
  });

  it('keeps getFormSummary nullable for missing rating and intensity fields', () => {
    const form = buildForm({
      exercises: [
        {
          exerciseName: 'Bench Press',
          formRating: null,
          sets: [{ setNumber: 1, weight: 135, reps: 8, rpe: null }],
        },
      ],
    });

    expect(form.getFormSummary()).toEqual(expect.objectContaining({
      averageFormRating: null,
      overallIntensity: null,
    }));
  });
});
