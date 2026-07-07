/**
 * shareWorkoutPost (Phase 2.1b)
 * =============================
 * The Save-Success "Share to feed" plumbing: a pure builder that turns the
 * logger's in-memory exercises into the composer-shape workoutData the
 * social backend already sanitizes (post.metadata.workoutData), plus the
 * one-POST multipart call byte-matching useSocialFeed.createPost.
 *
 * Deliberately consent-EXEMPT: user-INITIATED shares bypass the
 * autoShareWorkoutsToFeed preference by contract (socialAutoPost.mjs:21,
 * locked by socialAutoPostConsent.test.mjs) — this is an explicit action.
 * The generic server auto-post may also exist for the same workout; this
 * rich post is the user's own voice with real exercise detail, so the
 * pair is acceptable by design (documented in the slice REQ).
 */

export interface ShareableSet {
  weight: number;
  reps: number;
  completed?: boolean;
}

export interface ShareableExercise {
  exerciseId?: string;
  exerciseName: string;
  sets: ShareableSet[];
}

export interface ShareWorkoutPostData {
  source: 'composer';
  title: string;
  totalWeight?: number;
  exerciseCount: number;
  exercises: Array<{
    sourceExerciseId?: string;
    name: string;
    sets: number;
    reps: number;
    weight: number;
  }>;
}

const MAX_SHARED_EXERCISES = 12;

export function buildShareWorkoutPostData(
  exercises: ShareableExercise[],
  title = 'Logged workout',
): ShareWorkoutPostData | null {
  const named = exercises.filter((ex) => ex.exerciseName && ex.sets.length > 0);
  if (named.length === 0) return null;

  const totalWeight = named.reduce((sum, ex) => sum + ex.sets.reduce(
    (s, set) => s + (set.completed ? (set.weight || 0) * (set.reps || 0) : 0), 0), 0);

  return {
    source: 'composer',
    title,
    ...(totalWeight > 0 ? { totalWeight } : {}),
    exerciseCount: named.length,
    exercises: named.slice(0, MAX_SHARED_EXERCISES).map((ex) => ({
      ...(ex.exerciseId ? { sourceExerciseId: ex.exerciseId } : {}),
      name: ex.exerciseName,
      sets: ex.sets.length,
      reps: ex.sets.reduce((max, set) => Math.max(max, set.reps || 0), 0),
      weight: ex.sets.reduce((max, set) => Math.max(max, set.weight || 0), 0),
    })),
  };
}

interface AuthAxiosLike {
  post: (url: string, body: FormData, opts: { headers: Record<string, string> }) => Promise<{ data?: { post?: unknown } }>;
}

export async function shareWorkoutToFeed(
  authAxios: AuthAxiosLike,
  { content, workoutData }: { content: string; workoutData: ShareWorkoutPostData },
): Promise<unknown | null> {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('type', 'workout');
  // Backend default for non-staff; explicit so the privacy posture is in source.
  formData.append('visibility', 'friends');
  formData.append('workoutData', JSON.stringify(workoutData));
  const response = await authAxios.post('/api/social/posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response?.data?.post ?? null;
}
