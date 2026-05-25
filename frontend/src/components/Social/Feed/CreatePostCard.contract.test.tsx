import { describe, expect, it } from 'vitest';
import { POST_TYPE_OPTIONS } from './CreatePostCard';

describe('CreatePostCard post type contract', () => {
  it('keeps the manual picker focused on workout-first sharing', () => {
    expect(POST_TYPE_OPTIONS.map(option => option.value)).toEqual([
      'general',
      'workout',
      'transformation',
      'achievement',
      'challenge',
    ]);
  });
});
