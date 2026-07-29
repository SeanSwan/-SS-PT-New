/**
 * Workout-OS C5: legacy sets-store WRITE FREEZE contract.
 * The normalized WorkoutExercise/Set store is frozen — canonical sets live in
 * workout_logs via POST /api/workout-forms. workoutService's three write
 * lanes (create/update/generate) previously wrote legacy rows on live-but-
 * dormant routes (reachable by stale bundles/direct HTTP). This suite is the
 * ratchet: no write call on either legacy model may return to this file,
 * while the historical READERS (findAll includes) stay untouched.
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__dirname, '../../services/workoutService.mjs'), 'utf8');

describe('workoutService legacy write freeze', () => {
  it('contains ZERO write calls on WorkoutExercise or Set', () => {
    expect(source).not.toMatch(/WorkoutExercise\s*\.\s*(create|bulkCreate|upsert|destroy)\b/);
    expect(source).not.toMatch(/(?<![\w.])Set\s*\.\s*(create|bulkCreate|upsert|destroy)\b/);
    expect(source).not.toMatch(/existingSet\s*\.\s*update\b/);
    expect(source).not.toMatch(/existingExercise\s*\.\s*update\b/);
  });

  it('carries the freeze marker at all three former write lanes', () => {
    expect(source.match(/Workout-OS C5 FREEZE/g)?.length).toBe(3);
  });

  it('keeps the historical readers serving any legacy rows', () => {
    // R1/R2/R4-class includes stay — the "read-adapter" is the reader itself.
    expect(source).toMatch(/model:\s*WorkoutExercise/);
    expect(source).toMatch(/model:\s*Set\b/);
  });
});
