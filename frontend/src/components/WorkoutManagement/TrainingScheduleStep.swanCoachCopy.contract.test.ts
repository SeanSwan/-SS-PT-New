import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(resolve(__dirname, 'TrainingScheduleStep.tsx'), 'utf8');

describe('TrainingScheduleStep Swan Coach copy contract', () => {
  it('labels visible generation copy as Swan Coach planning', () => {
    expect(source).toContain('Swan Coach Plan Setup');
    expect(source).toContain('Swan Coach Plan');
    expect(source).not.toContain('Auto-Generate Workout Plan');
    expect(source).not.toContain('Generate Workout Plan');
  });
});
