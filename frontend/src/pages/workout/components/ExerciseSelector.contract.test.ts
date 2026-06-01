import { readFileSync } from 'fs';
import { resolve } from 'path';

const selectorSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/ExerciseSelector.tsx'),
  'utf8'
);
const selectorLogicSource = readFileSync(
  resolve(process.cwd(), 'src/pages/workout/components/ExerciseSelector.logic.ts'),
  'utf8'
);

describe('ExerciseSelector protected workout planner contract', () => {
  it('uses the authenticated client-safe exercise library endpoint', () => {
    expect(selectorSource).toContain('useAuth');
    expect(selectorSource).toContain("authAxios.get(EXERCISE_LIBRARY_URL)");
    expect(selectorLogicSource).toContain("'/api/exercises/library'");
    expect(selectorSource).not.toContain("from 'axios'");
    expect(selectorSource).not.toContain("axios.get('/api/exercises'");
  });

  it('keeps filtering client-side with normalized exercise data', () => {
    expect(selectorSource).toContain('normalizeExercises');
    expect(selectorSource).toContain('getFilteredExercises');
    expect(selectorSource).toContain('getExerciseLevel');
    expect(selectorSource).not.toContain('exercise.primaryMuscles.slice');
    expect(selectorSource).not.toContain('primaryMuscle:');
  });

  it('extracts styling and keeps the active component under the line cap', () => {
    expect(selectorSource).not.toContain('styled.');
    expect(selectorSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
