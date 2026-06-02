import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('Workout Management theme bridge', () => {
  it('uses universal theme variables instead of fixed slate and sky palettes', () => {
    const builderStyles = readSource('src/components/WorkoutManagement/WorkoutPlanBuilderStyles.ts');
    const exerciseLibrary = readSource('src/components/WorkoutManagement/ExerciseLibrary.tsx');
    const clientSelection = readSource('src/components/WorkoutManagement/ClientSelection.tsx');
    const combined = `${builderStyles}\n${exerciseLibrary}\n${clientSelection}`;

    expect(builderStyles).toContain('var(--bg-elevated');
    expect(exerciseLibrary).toContain('var(--bg-elevated');
    expect(clientSelection).toContain('var(--bg-elevated');
    expect(combined).toContain('color-mix(in srgb, var(--accent-primary, #60C0F0)');
    expect(combined).toContain('var(--accent-secondary, #8B5CF6)');

    expect(combined).not.toContain('rgba(15, 23, 42');
    expect(combined).not.toContain('rgba(14, 165, 233');
    expect(combined).not.toContain('rgba(14,165,233');
    expect(combined).not.toContain('#0ea5e9');
    expect(combined).not.toContain('${theme.accent}22');
    expect(combined).not.toContain('${T.accent}11');
    expect(combined).not.toContain('${T.accent}22');
    expect(combined).not.toContain('${T.accent}44');
  });
});
