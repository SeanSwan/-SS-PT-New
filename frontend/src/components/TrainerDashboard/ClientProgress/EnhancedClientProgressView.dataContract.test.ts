import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const viewSource = readFileSync(resolve(__dirname, './EnhancedClientProgressView.tsx'), 'utf8');
const backendSource = readFileSync(
  resolve(__dirname, '../../../../../backend/routes/dailyWorkoutFormRoutes.mjs'),
  'utf8',
);

describe('EnhancedClientProgressView data contract', () => {
  it('reads workout history from the backend progressData contract', () => {
    expect(backendSource).toContain('progressData,');
    expect(backendSource).toContain('workoutHistory,');
    expect(viewSource).toContain('progressInfo?.progressData?.workoutHistory');
    expect(viewSource).not.toMatch(/progressInfo\?\.recentWorkouts/);
  });
});
