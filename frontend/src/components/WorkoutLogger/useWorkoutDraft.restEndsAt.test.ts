/**
 * M6 completion (Batch 2): the rest timer's absolute endsAt rides the
 * in-gym draft, so a mid-rest reload resumes the countdown instead of
 * silently killing it. Backward compatible: old drafts without the
 * field parse to null; stale (past) values are the CONSUMER's job to
 * ignore (the restore path only resumes future endsAt).
 */
import { describe, expect, it } from 'vitest';
import { parseWorkoutDraft } from './useWorkoutDraft';

const baseDraft = {
  v: 1,
  savedAt: new Date().toISOString(),
  exercises: [
    {
      exerciseName: 'Bench', exerciseId: 'x1', formRating: null, painLevel: 0,
      sets: [{ setNumber: 1, weight: 100, reps: 8, rpe: null, formQuality: null, restTime: 60 }],
    },
  ],
  sessionNotes: '',
  overallIntensity: null,
};

describe('draft restEndsAt round-trip', () => {
  it('a numeric restEndsAt survives parse', () => {
    const endsAt = Date.now() + 45_000;
    const parsed = parseWorkoutDraft(JSON.stringify({ ...baseDraft, restEndsAt: endsAt }));
    expect(parsed?.restEndsAt).toBe(endsAt);
  });

  it('legacy drafts without the field parse to null (backward compatible)', () => {
    const parsed = parseWorkoutDraft(JSON.stringify(baseDraft));
    expect(parsed).not.toBeNull();
    expect(parsed?.restEndsAt).toBeNull();
  });

  it('garbage restEndsAt values parse to null, never NaN/strings', () => {
    for (const junk of ['soon', -5, 0, {}, true]) {
      const parsed = parseWorkoutDraft(JSON.stringify({ ...baseDraft, restEndsAt: junk }));
      expect(parsed?.restEndsAt).toBeNull();
    }
  });
});
