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

/**
 * Panel follow-up (Kimi P1 #1). Kimi read `isFilteredView={activeFilter !== 'all'
 * && activities.length > 0}` and concluded the guard could never be true, because
 * the empty state only renders when the list is empty. That reading assumed one
 * array; there are two. `activities` is the UNFILTERED mapped list and
 * `displayedActivities` (what the feed renders) is the filtered one. This test
 * pins the distinction so a future refactor collapsing them fails loudly.
 */
describe('filtered-vs-unfiltered activity arrays', () => {
  it('leaves the unfiltered list populated when a filter matches nothing', () => {
    const posts = Array.from({ length: 8 }, (_, i) => post(i, 'general'));

    const all = mapPostsToActivities(posts);
    const filtered = filterActivities(all, 'achievement');

    // The empty state renders off `filtered`; the "you do have other activity"
    // copy is gated on `all`. Both conditions hold at once - that is the point.
    expect(filtered).toHaveLength(0);
    expect(all.length).toBeGreaterThan(0);
    expect(all.length > 0 && filtered.length === 0).toBe(true);
  });
});
