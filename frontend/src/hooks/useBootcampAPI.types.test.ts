import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('useBootcampAPI type boundary', () => {
  it('keeps the bootcamp API hook capped while re-exporting public contracts', () => {
    const source = readFileSync(resolve(__dirname, 'useBootcampAPI.ts'), 'utf8');

    expect(source).toContain("from './useBootcampAPI.types'");
    expect(source).toContain('export type {');
    expect(source).toContain('GeneratedBootcamp');
    expect(source).toContain('BootcampExercise');
    expect(source).toContain('ClassFormat');
    expect(source).toContain('DayType');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });
});
