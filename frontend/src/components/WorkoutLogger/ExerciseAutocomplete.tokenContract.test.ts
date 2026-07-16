import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../..');

const read = (relativePath: string) => readFileSync(resolve(repoRoot, relativePath), 'utf8');
const readOptional = (relativePath: string) => {
  const target = resolve(repoRoot, relativePath);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
};

const autocompleteSource = read('frontend/src/components/WorkoutLogger/ExerciseAutocomplete.tsx');
const autocompleteStylesPath = 'frontend/src/components/WorkoutLogger/ExerciseAutocomplete.styles.ts';
const autocompleteStylesSource = readOptional(autocompleteStylesPath);

function lineCount(source: string): number {
  return source.trimEnd().split(/\r?\n/).length;
}

describe('ExerciseAutocomplete token contract', () => {

  it('uses the shared WorkoutLogger Crystalline Swan tokens instead of a local palette', () => {
    expect(existsSync(resolve(repoRoot, autocompleteStylesPath))).toBe(true);
    expect(autocompleteSource).toContain("from './ExerciseAutocomplete.styles'");
    expect(autocompleteStylesSource).toContain("import { CS, withAlpha } from './WorkoutLoggerCS'");
    expect(`${autocompleteSource}\n${autocompleteStylesSource}`).not.toMatch(/const CS = \{/);
    expect(`${autocompleteSource}\n${autocompleteStylesSource}`).not.toMatch(
      /rgba\((0, 0, 0|20, 20, 25|80, 160, 240|96, 192, 240|224, 236, 244)/
    );
    expect(`${autocompleteSource}\n${autocompleteStylesSource}`).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('keeps the autocomplete component under the project file cap', () => {
    expect(lineCount(autocompleteSource)).toBeLessThanOrEqual(300);
    expect(lineCount(autocompleteStylesSource)).toBeLessThanOrEqual(300);
  });
});
