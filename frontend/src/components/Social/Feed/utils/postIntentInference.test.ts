import { describe, expect, it } from 'vitest';
import { appendHashtag, extractHashtags, inferSmartPostIntent } from './postIntentInference';

describe('postIntentInference', () => {
  it('auto-labels creative posts without forcing creative choices into the main picker', () => {
    const intent = inferSmartPostIntent('New beat in the studio, final mix tonight', 'general');

    expect(intent.submissionType).toBe('music');
    expect(intent.displayLabel).toBe('Music Production');
    expect(intent.hashtags).toContain('#MusicProduction');
    expect(intent.hashtags).toContain('#SwanCreative');
  });

  it('keeps selected workout-first intent while still suggesting discovery tags', () => {
    const intent = inferSmartPostIntent('Finished leg day with 5 sets of squats', 'workout');

    expect(intent.submissionType).toBe('workout');
    expect(intent.displayLabel).toBe('Workout');
    expect(intent.hashtags).toContain('#WorkoutDiary');
  });

  it('extracts and appends hashtags without duplicates or tag stuffing', () => {
    expect(extractHashtags('Progress today #SwanProgress #legday')).toEqual(['#SwanProgress', '#legday']);
    expect(appendHashtag('Progress today #SwanProgress', '#SwanProgress')).toBe('Progress today #SwanProgress');
    expect(appendHashtag('Progress today', '#WorkoutDiary')).toBe('Progress today #WorkoutDiary');

    const intent = inferSmartPostIntent('dance freestyle #one #two #three #four #five #six', 'general');
    expect(intent.hashtags).toHaveLength(5);
  });
});
