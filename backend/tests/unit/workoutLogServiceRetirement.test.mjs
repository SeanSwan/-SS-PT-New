/**
 * workoutLogService retirement contract (Phase 1.1b)
 *
 * Locks the Path-A retirement: the legacy logWorkoutForClient write path is
 * GONE (with its double auto-post), the surviving exports the live admin
 * controller still imports stay intact, and the behaviors the deleted
 * legacy suites used to lock are pinned to their unified-path homes.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const baseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (rel) => readFileSync(path.join(baseDir, rel), 'utf-8');

describe('workoutLogService retirement (1.1b)', () => {
  it('no longer exports or contains the legacy write path', async () => {
    const mod = await import('../../services/workout/workoutLogService.mjs');
    expect(mod.logWorkoutForClient).toBeUndefined();

    const source = read('services/workout/workoutLogService.mjs');
    expect(source).not.toContain('logWorkoutForClient');
    expect(source).not.toContain('buildLogRows');
    // The SECOND auto-post path dies with it (audit record §10 hook).
    expect(source).not.toContain('createWorkoutAutoPost');
    expect(source).not.toContain('createStreakAutoPost');
    expect(source).not.toContain('awardWorkoutXP');
  });

  it('keeps the surviving exports the admin controller imports', async () => {
    const mod = await import('../../services/workout/workoutLogService.mjs');
    expect(typeof mod.parseWorkoutLogDate).toBe('function');
    const err = new mod.WorkoutLogError('nope', 'VALIDATION_ERROR');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.name).toBe('WorkoutLogError');

    const controller = read('controllers/adminWorkoutLoggerController.mjs');
    expect(controller).toContain('parseWorkoutLogDate');
    expect(controller).toContain('WorkoutLogError');
    // Stale references to the retired fn are cleaned, not just unused.
    expect(controller).not.toContain('logWorkoutForClient');
  });

  it('pins the retired suites’ behaviors to their unified-path homes', () => {
    const payload = read('services/workout/aiWorkoutDailyFormPayloadService.mjs');
    // Null-honest intensity with a hard 1-10 range (was phase16 intensity suite).
    expect(payload).toContain('intensity must be between 1 and 10');
    expect(payload).toMatch(/value === undefined \|\| value === null \|\| value === ''\) return null/);
    // Per-row exerciseNote stamping (was workoutLogServiceExerciseNote suite).
    expect(payload).toContain('exerciseNote');

    // Engagement suppression is source-policy-derived (was historicalImport suite).
    const policy = read('services/workout/workoutLogSourcePolicy.mjs');
    expect(policy).toContain('suppressEngagementSideEffects');
  });
});
