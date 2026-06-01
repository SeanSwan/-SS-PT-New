import { describe, expect, it } from 'vitest';
import { buildShareToFeedPostPayload } from './ShareToFeedModal.payload';

describe('ShareToFeedModal payload', () => {
  it('adds workout hashtags while preserving workout session linkage', () => {
    const payload = buildShareToFeedPostPayload({
      content: 'Sean crushed a Push Day workout with 12 sets.',
      postType: 'workout',
      visibility: 'friends',
      workoutSessionId: 'session-7',
    });

    expect(payload).toMatchObject({
      type: 'workout',
      visibility: 'friends',
      workoutSessionId: 'session-7',
    });
    expect(payload.content).toContain('#WorkoutDiary');
    expect(payload.content).toContain('#SwanProgress');
  });

  it('adds milestone hashtags while preserving personal record linkage', () => {
    const payload = buildShareToFeedPostPayload({
      content: 'New Personal Record! Sean hit 225 lbs x 5 reps on Bench Press.',
      postType: 'achievement',
      visibility: 'public',
      achievementId: 42,
      userAchievementId: 99,
    });

    expect(payload).toMatchObject({
      type: 'achievement',
      visibility: 'public',
      achievementId: 42,
      userAchievementId: 99,
    });
    expect(payload.content).toContain('#SwanProgress');
    expect(payload.content).toContain('#Milestone');
  });
});
