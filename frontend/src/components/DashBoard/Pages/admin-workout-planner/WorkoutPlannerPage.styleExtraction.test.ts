import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('WorkoutPlannerPage local style extraction', () => {
  it('keeps the canonical planner page focused on planning behavior', () => {
    const source = read('WorkoutPlannerPage.tsx');

    expect(source).toContain("from './WorkoutPlannerPage.styles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toMatch(/const ResultsCount\s*=\s*styled/);
    expect(source).not.toMatch(/const DegradedPanel\s*=\s*styled/);
    expect(source).not.toMatch(/const SavedPlansEmpty\s*=\s*styled/);
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(1750);
  });

  it('keeps the extracted page style module below the project file cap', () => {
    const source = read('WorkoutPlannerPage.styles.ts');

    expect(source).toContain('export const ResultsCount');
    expect(source).toContain('export const DegradedPanel');
    expect(source).toContain('export const SavedPlansEmpty');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
