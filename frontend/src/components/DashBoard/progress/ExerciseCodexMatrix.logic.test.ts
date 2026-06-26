import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildExerciseCodexMatrix,
  extractExerciseCatalogPayload,
} from './ExerciseCodexMatrix.logic';

const STYLES_SOURCE = fs.readFileSync(path.resolve(__dirname, 'ExerciseCodexMatrix.styles.ts'), 'utf8');

const getExportedStyledBlock = (source: string, exportName: string): string => {
  const start = source.indexOf(`export const ${exportName}`);
  expect(start).toBeGreaterThanOrEqual(0);

  const rest = source.slice(start);
  const nextExport = rest.search(/\r?\n\r?\nexport const /);
  return nextExport === -1 ? rest : rest.slice(0, nextExport);
};

describe('buildExerciseCodexMatrix', () => {
  it('merges the logged diary with the full Rolodex so untouched exercises stay visible', () => {
    const result = buildExerciseCodexMatrix(
      [
        {
          id: 'push-up',
          name: 'Push Up',
          exerciseType: 'calisthenics',
          bodyPartCategory: 'Chest',
          primaryMuscles: ['Chest', 'Triceps'],
          equipment: [],
          difficulty: 80,
          nasmMovementPattern: 'push',
          previewVideoUrl: 'https://cdn.example/push-up.mp4',
        },
        {
          id: 'goblet-squat',
          name: 'Goblet Squat',
          exerciseType: 'compound',
          bodyPartCategory: 'Legs',
          primaryMuscles: ['Quads'],
          equipmentNeeded: ['Dumbbell'],
          difficulty: 160,
          nasmMovementPattern: 'squat',
        },
        {
          id: 'pallof-press',
          name: 'Pallof Press',
          exerciseType: 'core',
          bodyPartCategory: 'Core',
          primaryMuscles: ['Obliques'],
          difficulty: 120,
          nasmMovementPattern: 'anti-rotation',
        },
      ],
      [
        { x: 'Push Up', y: 12, sets: 36 },
        { x: 'Goblet Squat', y: 2, sets: 8 },
      ],
    );

    expect(result.summary.totalExercises).toBe(3);
    expect(result.summary.loggedExercises).toBe(2);
    expect(result.summary.untrainedExercises).toBe(1);
    expect(result.summary.coveragePct).toBe(67);
    expect(result.summary.statusCounts).toEqual({ mastered: 1, trained: 1, sampled: 0, untrained: 1 });
    expect(result.summary.mostTrained?.name).toBe('Push Up');
    expect(result.summary.nextTargets.map((row) => row.name)).toEqual(['Pallof Press']);
    expect(result.rows.map((row) => row.name)).toContain('Pallof Press');
    expect(result.rows.find((row) => row.name === 'Push Up')?.hasDemo).toBe(true);
  });

  it('falls back to a logged-only matrix when the Rolodex is unavailable', () => {
    const result = buildExerciseCodexMatrix([], [
      { x: 'Band Row', y: '1', sets: '3' },
      { x: 'Band Row', y: 2, sets: 6 },
      { x: 'Broken Lift', y: Number.NaN, sets: 4 },
    ]);

    expect(result.summary.totalExercises).toBe(1);
    expect(result.summary.loggedExercises).toBe(1);
    expect(result.rows[0]).toMatchObject({ name: 'Band Row', sessions: 3, sets: 9, status: 'trained' });
  });

  it('keeps status filter buttons at the project 44px minimum in both dimensions', () => {
    const filterButtonSource = getExportedStyledBlock(STYLES_SOURCE, 'FilterButton');

    expect(filterButtonSource).toMatch(/min-height:\s*44px/);
    expect(filterButtonSource).toMatch(/min-width:\s*44px/);
  });

  it('builds coverage groups from body parts, movement patterns, and difficulty bands', () => {
    const result = buildExerciseCodexMatrix(
      [
        { name: 'Dead Bug', bodyPartCategory: 'Core', difficulty: 20, nasmMovementPattern: 'core' },
        { name: 'Bird Dog', bodyPartCategory: 'Core', difficulty: 40, nasmMovementPattern: 'core' },
        { name: 'Split Squat', bodyPartCategory: 'Legs', difficulty: 220, nasmMovementPattern: 'squat' },
        { name: 'Loaded Carry', bodyPartCategory: 'Full Body', difficulty: 320, nasmMovementPattern: 'carry' },
      ],
      [
        { x: 'Dead Bug', y: 4, sets: 12 },
        { x: 'Loaded Carry', y: 1, sets: 2 },
      ],
    );

    expect(result.summary.bodyPartCoverage.find((group) => group.label === 'Core')).toMatchObject({ total: 2, trained: 1, pct: 50 });
    expect(result.summary.patternCoverage.find((group) => group.label === 'carry')).toMatchObject({ total: 1, trained: 1, pct: 100 });
    expect(result.summary.difficultyBands).toEqual([
      { label: 'Foundation', total: 2, trained: 1, pct: 50 },
      { label: 'Development', total: 1, trained: 0, pct: 0 },
      { label: 'Advanced', total: 1, trained: 1, pct: 100 },
    ]);
  });

  it('extracts the client-safe library response shape from exercises or data payloads', () => {
    expect(extractExerciseCatalogPayload({ exercises: [{ name: 'Push Up' }] })).toEqual([{ name: 'Push Up' }]);
    expect(extractExerciseCatalogPayload({ data: [{ name: 'Pull Up' }] })).toEqual([{ name: 'Pull Up' }]);
    expect(extractExerciseCatalogPayload({ count: 950 })).toEqual([]);
  });
});
