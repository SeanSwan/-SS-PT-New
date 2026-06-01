import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('useWorkoutBuilderAPI type boundary', () => {
  it('keeps the workout builder hook capped while re-exporting its public contracts', () => {
    const source = readFileSync(resolve(__dirname, 'useWorkoutBuilderAPI.ts'), 'utf8');

    expect(source).toContain("from './useWorkoutBuilderAPI.types'");
    expect(source).toContain('export type {');
    expect(source).toContain('ClientContext');
    expect(source).toContain('GeneratedWorkout');
    expect(source).toContain('GeneratedPlan');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
