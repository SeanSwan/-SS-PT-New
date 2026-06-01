import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, './WorkoutLogger.tsx'), 'utf8');

describe('WorkoutLogger shell extraction', () => {
  it('keeps local data contracts and pure helpers outside the component shell', () => {
    expect(source).toContain("from './WorkoutLogger.localTypes'");
    expect(source).toContain("from './WorkoutLogger.helpers'");
    expect(source).not.toMatch(/interface\s+PlannedExercise/);
    expect(source).not.toMatch(/const\s+coerceToNumericId\s*=/);
    expect(source).not.toMatch(/const\s+normalizeWorkoutDate\s*=/);
  });

  it('keeps the active logger shell moving toward the 300-line project cap', () => {
    const lineCount = source.split(/\r?\n/).length;
    expect(lineCount).toBeLessThan(1260);
  });
});
