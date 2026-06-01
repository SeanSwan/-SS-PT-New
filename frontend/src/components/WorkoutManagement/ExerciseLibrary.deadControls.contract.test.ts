import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(__dirname, 'ExerciseLibrary.tsx'), 'utf8');

describe('ExerciseLibrary visible control contract', () => {
  it('does not render add/edit controls that intentionally do nothing', () => {
    expect(source).not.toContain('TODO: Implement add exercise');
    expect(source).not.toContain('TODO: Implement edit exercise');
    expect(source).not.toContain('title="Add New Exercise"');
    expect(source).not.toContain('title="Edit exercise"');
  });
});
