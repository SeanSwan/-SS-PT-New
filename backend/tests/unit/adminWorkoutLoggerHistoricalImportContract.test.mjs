import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { isHistoricalWorkoutLogSource } from '../../services/workout/workoutLogSourcePolicy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONTROLLER = readFileSync(
  resolve(__dirname, '../../controllers/adminWorkoutLoggerController.mjs'),
  'utf8',
);

describe('admin workout logger historical import contract', () => {
  it('uses the shared historical source policy for side-effect suppression', () => {
    expect(isHistoricalWorkoutLogSource('historical_import')).toBe(true);
    expect(isHistoricalWorkoutLogSource('move_fitness_historical_import')).toBe(true);
    expect(isHistoricalWorkoutLogSource('plaud_merge')).toBe(false);
    expect(CONTROLLER).toContain('isHistoricalWorkoutLogSource(source)');
    expect(CONTROLLER).not.toMatch(/source\s*!==\s*['"]plaud_merge['"][\s\S]{0,120}suppressEngagementSideEffects/);
  });

  it('passes the historical import flag into the shared workout write service', () => {
    expect(CONTROLLER).toMatch(/const isHistoricalImport\s*=\s*isHistoricalWorkoutLogSource\(source\)/);
    expect(CONTROLLER).toMatch(/logWorkoutForClient\(\{[\s\S]{0,420}suppressEngagementSideEffects:\s*isHistoricalImport/);
    expect(CONTROLLER).toMatch(/historicalImport:\s*isHistoricalImport/);
  });
});
