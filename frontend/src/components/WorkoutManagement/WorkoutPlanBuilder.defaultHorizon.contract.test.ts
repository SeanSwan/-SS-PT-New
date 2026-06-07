import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, './WorkoutPlanBuilder.tsx'), 'utf8');

describe('WorkoutPlanBuilder default horizon contract', () => {
  it('defaults new Program Architect plans to the SwanStudios six-month primary arc', () => {
    expect(source).toContain('DEFAULT_PRIMARY_PLAN_WEEKS = 26');
    expect(source).not.toContain('8 * 7 * 24 * 60 * 60 * 1000');
  });
});
