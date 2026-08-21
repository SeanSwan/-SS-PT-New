/**
 * Guard for the Activity feed's pre-filter truncation.
 *
 * WHY: `mapPostsToActivities` ran `posts.slice(0, 6)` BEFORE any filter was
 * applied. Selecting "Workouts" therefore searched only the six most recent
 * posts, and a member whose recent six happened to be general posts was told
 * "No recent activity yet" while their workouts sat just outside the window.
 * The upstream loader already bounds the set (`loadUserPosts` limit 20), so the
 * extra cap bought nothing and cost the truth.
 */
import { describe, expect, it } from 'vitest';
import { mapPostsToActivities, filterActivities } from './ActivitySection.data';
import type { ProfileActivityPost } from './ActivitySection.types';

const post = (id: number, type: string): ProfileActivityPost => ({
  id: String(id),
  type,
  content: `post ${id}`,
  createdAt: new Date().toISOString(),
}) as ProfileActivityPost;

describe('Activity feed truncation', () => {
  it('maps every post the loader returned, not just the first six', () => {
    const posts = Array.from({ length: 20 }, (_, i) => post(i, 'general'));
    expect(mapPostsToActivities(posts)).toHaveLength(20);
  });

  it('finds a workout that sits outside the six most recent posts', () => {
    const posts = [
      ...Array.from({ length: 8 }, (_, i) => post(i, 'general')),
      post(99, 'workout'),
    ];

    const workouts = filterActivities(mapPostsToActivities(posts), 'workout');

    // Under the old slice(0, 6) this was [] — an empty state shown to a member
    // who demonstrably had a workout.
    expect(workouts).toHaveLength(1);
    expect(workouts[0].id).toBe('99');
  });

  it('still returns empty for a genuinely absent type', () => {
    const posts = Array.from({ length: 8 }, (_, i) => post(i, 'general'));
    expect(filterActivities(mapPostsToActivities(posts), 'achievement')).toHaveLength(0);
  });
});
