import { describe, expect, it } from 'vitest';
import { POST_TYPE_OPTIONS } from './CreatePostCard';

describe('CreatePostCard post type contract', () => {
  it('covers the full feed-supported expression range (merge M4)', () => {
    // M4: the canonical composer must offer every type the feed renders +
    // the backend enum accepts, so retiring the Observatory Quick Post (M6)
    // loses no posting ability. Workout-first ordering preserved (core 5 lead).
    expect(POST_TYPE_OPTIONS.map(option => option.value)).toEqual([
      'general',
      'workout',
      'transformation',
      'achievement',
      'challenge',
      'dance',
      'music',
      'singing',
      'art',
      'gaming',
      'comedy',
    ]);
  });

  it('gives every option an icon, a positive point value, and a description', () => {
    for (const option of POST_TYPE_OPTIONS) {
      expect(option.icon).toBeTruthy();
      expect(option.points).toBeGreaterThan(0);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });
});
