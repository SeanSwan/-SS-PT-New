import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONTROLLER = readFileSync(
  resolve(__dirname, '../../controllers/adminWorkoutLoggerController.mjs'),
  'utf8',
);

describe('admin workout logger historical import contract', () => {
  it('recognizes only explicit historical import sources for side-effect suppression', () => {
    expect(CONTROLLER).toContain("source === 'historical_import'");
    expect(CONTROLLER).toContain("source === 'move_fitness_historical_import'");
    expect(CONTROLLER).not.toMatch(/source\s*!==\s*['"]plaud_merge['"][\s\S]{0,120}suppressEngagementSideEffects/);
  });

  it('passes the historical import flag into the shared workout write service', () => {
    expect(CONTROLLER).toMatch(/const isHistoricalImport[\s\S]{0,220}move_fitness_historical_import/);
    expect(CONTROLLER).toMatch(/logWorkoutForClient\(\{[\s\S]{0,420}suppressEngagementSideEffects:\s*isHistoricalImport/);
    expect(CONTROLLER).toMatch(/historicalImport:\s*isHistoricalImport/);
  });
});
