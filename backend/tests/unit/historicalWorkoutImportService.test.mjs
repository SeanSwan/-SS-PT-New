import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  previewHistoricalWorkoutImport,
  extractDatedWorkoutSections,
} from '../../services/historicalWorkoutImportService.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVICE_FILE = resolve(__dirname, '../../services/historicalWorkoutImportService.mjs');

describe('historicalWorkoutImportService', () => {
  it('builds draft-only parsed candidates and skips already-known workout dates', async () => {
    const calls = [];
    const result = await previewHistoricalWorkoutImport({
      clientId: 42,
      trainerId: 7,
      sourceLabel: 'Move Fitness historical import',
      knownDates: ['2026-01-05T12:00:00.000Z'],
      missingDates: ['2026-01-09'],
      transcript: [
        '2026-01-05 - Goblet squat 3x10, RDL 3x8, already logged.',
        '2026-01-07 - Bench press 3x8, seated row 3x10, cooldown walk.',
      ].join('\n'),
      parseWorkout: async (params) => {
        calls.push(params);
        return {
          exercises: [{ exerciseName: 'Bench Press', sets: [{ setNumber: 1, reps: 8, weight: 95 }] }],
          confidence: 0.83,
          date: params.date,
        };
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ clientId: 42, trainerId: 7, date: '2026-01-07' });
    expect(result).toMatchObject({ draftOnly: true, parsedEntryCount: 2, skippedKnownDates: ['2026-01-05'] });
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      date: '2026-01-07',
      draftOnly: true,
      status: 'review_required',
      source: 'Move Fitness historical import',
      confidence: 0.83,
    });
    expect(result.drafts[0].parsedWorkout.date).toBe('2026-01-07');
    expect(result.missingDraftRequests[0]).toMatchObject({
      date: '2026-01-09',
      status: 'needs_coach_draft',
    });
  });

  it('extracts common historical date headers from pasted history text', () => {
    expect(extractDatedWorkoutSections([
      'Date: 1/5/2026 - Leg press 3x12',
      'Jan 7 2026: Lat pulldown 3x10',
      '2026-01-09, Bike intervals and mobility',
    ].join('\n')).map((section) => section.date)).toEqual([
      '2026-01-05',
      '2026-01-07',
      '2026-01-09',
    ]);
  });

  it('contains no direct workout-log write path', () => {
    const source = readFileSync(SERVICE_FILE, 'utf8');
    expect(source).not.toMatch(/WorkoutLog\.create|DailyWorkoutForm\.create|adminClient|logWorkout\(/);
    expect(source).toMatch(/status:\s*['"]review_required['"]/);
    expect(source).toMatch(/draftOnly:\s*true/);
  });
});
