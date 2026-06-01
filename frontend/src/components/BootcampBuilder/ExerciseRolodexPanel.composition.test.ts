import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('ExerciseRolodexPanel composition contract', () => {
  it('keeps the rolodex shell thin and free of local styling', () => {
    const source = read('./ExerciseRolodexPanel.tsx');

    expect(source).toContain("from './ExerciseRolodexPanel.constants'");
    expect(source).toContain("from './ExerciseRolodexPanel.styles'");
    expect(source).toContain("from './ExerciseRolodexList'");
    expect(source).not.toContain('styled.');
    expect(source).not.toContain('style={{');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
  });

  it('keeps extracted rolodex modules under the file cap', () => {
    [
      './ExerciseRolodexPanel.constants.ts',
      './ExerciseRolodexPanel.styles.ts',
      './ExerciseRolodexList.styles.ts',
      './ExerciseRolodexList.tsx',
      './ExerciseRolodexPanel.composition.test.ts',
    ].forEach((file) => {
      expect(read(file).split(/\r?\n/).length, file).toBeLessThanOrEqual(300);
    });
  });
});
