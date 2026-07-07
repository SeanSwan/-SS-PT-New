/**
 * shareWorkoutPost tests (Phase 2.1b)
 *
 * Locks: the composer-shape workoutData builder (cap 12, per-exercise
 * mapping, completed-sets-only volume) and the POST /api/social/posts
 * multipart contract byte-matching useSocialFeed.createPost (content /
 * type=workout / visibility=friends / workoutData JSON).
 */
import { describe, expect, it, vi } from 'vitest';
import { buildShareWorkoutPostData, shareWorkoutToFeed } from './shareWorkoutPost';

const ex = (name: string, sets: Array<{ weight: number; reps: number; completed?: boolean }>) => ({
  exerciseId: `id-${name}`,
  exerciseName: name,
  sets: sets.map((s, i) => ({ id: `s${i}`, setNumber: i + 1, completed: false, ...s })),
});

describe('buildShareWorkoutPostData', () => {
  it('maps logger exercises into the composer workoutData shape', () => {
    const data = buildShareWorkoutPostData([
      ex('Barbell Squat', [{ weight: 135, reps: 8, completed: true }, { weight: 155, reps: 6, completed: true }]),
      ex('Plank', [{ weight: 0, reps: 1, completed: true }]),
    ]);

    expect(data).not.toBeNull();
    expect(data?.source).toBe('composer');
    expect(data?.exerciseCount).toBe(2);
    expect(data?.exercises?.[0]).toMatchObject({
      sourceExerciseId: 'id-Barbell Squat',
      name: 'Barbell Squat',
      sets: 2,
      reps: 8,
      weight: 155,
    });
    // Volume counts completed sets only: 135*8 + 155*6 + 0*1.
    expect(data?.totalWeight).toBe(135 * 8 + 155 * 6);
  });

  it('caps the attachment at 12 exercises and reports the true count', () => {
    const many = Array.from({ length: 15 }, (_, i) => ex(`E${i}`, [{ weight: 10, reps: 5, completed: true }]));
    const data = buildShareWorkoutPostData(many);
    expect(data?.exercises).toHaveLength(12);
    expect(data?.exerciseCount).toBe(15);
  });

  it('returns null when there is nothing to share', () => {
    expect(buildShareWorkoutPostData([])).toBeNull();
  });
});

describe('shareWorkoutToFeed', () => {
  it('POSTs multipart form data matching the social feed contract', async () => {
    const post = vi.fn().mockResolvedValue({ data: { post: { id: 9 } } });
    const workoutData = buildShareWorkoutPostData([ex('Row', [{ weight: 95, reps: 10, completed: true }])])!;

    const created = await shareWorkoutToFeed({ post } as never, {
      content: '12 sets · 8,450 lbs — logged on SwanStudios.',
      workoutData,
    });

    expect(created).toEqual({ id: 9 });
    expect(post).toHaveBeenCalledTimes(1);
    const [url, body, opts] = post.mock.calls[0];
    expect(url).toBe('/api/social/posts');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('content')).toBe('12 sets · 8,450 lbs — logged on SwanStudios.');
    expect(body.get('type')).toBe('workout');
    expect(body.get('visibility')).toBe('friends');
    expect(JSON.parse(body.get('workoutData') as string)).toMatchObject({ source: 'composer', exerciseCount: 1 });
    expect(opts.headers['Content-Type']).toBe('multipart/form-data');
  });
});
