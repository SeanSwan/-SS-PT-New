import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'controllers/adminClientController.mjs'), 'utf8');
const start = source.indexOf('async getClientWorkoutStats');
const end = source.indexOf('async generateWorkoutPlan', start);
const slice = source.slice(start, end);

describe('admin client workout stats truth path', () => {
  it('counts completed workout_sessions instead of daily workout form rows', () => {
    expect(slice).toContain('WorkoutSession.count');
    expect(slice).toContain("status: 'completed'");
    expect(slice).toContain('WorkoutSession.findAll');
    expect(slice).not.toMatch(/DailyWorkoutForm\.count/);
    expect(slice).not.toMatch(/totalForms,\s*$/m);
  });
});
