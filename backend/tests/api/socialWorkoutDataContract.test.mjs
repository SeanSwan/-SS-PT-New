import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sanitizeWorkoutPostData } from '../../routes/social/socialWorkoutData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const routeSource = readFileSync(resolve(__dirname, '../../routes/social/posts.mjs'), 'utf8');
const helperSource = readFileSync(resolve(__dirname, '../../routes/social/socialWorkoutData.mjs'), 'utf8');

describe('social workout post data contract', () => {
  it('sanitizes and stores client-submitted workoutData on post metadata', () => {
    expect(routeSource).toContain("from './socialWorkoutData.mjs'");
    expect(routeSource).toContain('const sanitizedWorkoutData = sanitizeWorkoutPostData(req.body.workoutData);');
    expect(routeSource).toContain('workoutData: sanitizedWorkoutData');
    expect(routeSource).not.toContain('JSON.parse(req.body.workoutData)');

    expect(helperSource).toContain('export function sanitizeWorkoutPostData');
    expect(helperSource).toContain("raw.exercises.slice(0, 12)");
    expect(helperSource).toContain('const WORKOUT_FIELDS');
    expect(helperSource).toContain('const EXERCISE_FIELDS');
  });

  it('returns workoutData from metadata for feed, profile, trending, and single-post reads', () => {
    expect(helperSource).toContain('export function attachWorkoutDataToPost');
    expect(helperSource).toContain('export function getWorkoutDataFromMetadata');
    expect(routeSource.match(/attachWorkoutDataToPost\(/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(routeSource).toContain('attachWorkoutDataToPost(postObj)');
    expect(routeSource).toContain('attachWorkoutDataToPost(post.toJSON())');
    expect(routeSource).toContain('attachWorkoutDataToPost(fullPost.toJSON())');
  });
  it('keeps Rolodex exercise identity while dropping unapproved exercise fields', () => {
    const sanitized = sanitizeWorkoutPostData({
      title: 'Upper Push Builder',
      exercises: [{
        name: 'Bench Press',
        sourceExerciseId: 'bench-press',
        sets: '4',
        reps: '8',
        unsafePrivateNote: 'do not store',
      }],
    });

    expect(sanitized.exercises).toEqual([{
      name: 'Bench Press',
      sourceExerciseId: 'bench-press',
      sets: '4',
      reps: '8',
    }]);
    expect(JSON.stringify(sanitized)).not.toContain('unsafePrivateNote');
  });
});
