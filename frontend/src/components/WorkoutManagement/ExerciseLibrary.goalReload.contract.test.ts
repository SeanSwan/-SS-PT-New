import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'ExerciseLibrary.tsx'), 'utf8');

describe('ExerciseLibrary goal recommendation reload contract', () => {
  it('reloads backend recommendations when the goal selector changes', () => {
    expect(source).toContain('goal: filters.goal');
    expect(source).toMatch(/const loadExercises = useCallback/);
    expect(source).toMatch(/\}, \[[^\]]*filters\.goal[^\]]*getWorkoutRecommendations[^\]]*\]\);/);
    expect(source).toMatch(/useEffect\(\(\)\s*=>\s*\{\s*loadExercises\(\);\s*\},\s*\[[^\]]*loadExercises[^\]]*\]\);/);
  });
});
