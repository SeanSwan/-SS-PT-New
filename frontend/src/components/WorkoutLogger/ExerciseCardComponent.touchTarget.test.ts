import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => {
  const path = resolve(__dirname, fileName);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
};

const componentSource = read('./ExerciseCardComponent.tsx');
const cardStylesSource = read('./ExerciseCardComponent.styles.ts');
const rowStylesSource = read('./ExerciseSetRow.styles.ts');

const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('ExerciseCardComponent touch target and extraction contract', () => {
  it('keeps the active exercise card and extracted style files under the line cap', () => {
    expect(cardStylesSource.length).toBeGreaterThan(0);
    expect(rowStylesSource.length).toBeGreaterThan(0);
    expect(lineCount(componentSource)).toBeLessThanOrEqual(300);
    expect(lineCount(cardStylesSource)).toBeLessThanOrEqual(300);
    expect(lineCount(rowStylesSource)).toBeLessThanOrEqual(300);
  });

  it('keeps every action button explicit and mobile-touchable', () => {
    expect(componentSource.match(/type="button"/g)?.length ?? 0).toBeGreaterThanOrEqual(5);
    expect(`${cardStylesSource}\n${rowStylesSource}`).toMatch(/const StarButton = styled\.button[\s\S]*min-width: 44px;[\s\S]*min-height: 44px;/);
    expect(`${cardStylesSource}\n${rowStylesSource}`).toMatch(/const AddSetButton = styled\(motion\.button\)[\s\S]*min-height: 44px;/);
  });

  it('prevents rating stars from overflowing or overlapping set-card controls', () => {
    expect(componentSource).not.toContain("style={{ display: 'flex', alignItems: 'center', gap: '8px' }}");
    expect(componentSource).toContain('<RatingControlRow>');
    expect(cardStylesSource).toMatch(/export const RatingControlRow = styled\.div`[\s\S]*flex-wrap: wrap;[\s\S]*max-width: 100%;/);
    expect(cardStylesSource).toMatch(/export const StarRatingContainer = styled\.div`[\s\S]*flex-wrap: wrap;[\s\S]*max-width: 100%;/);
    expect(rowStylesSource).toMatch(/minmax\(224px, 1\.7fr\)/);
    expect(rowStylesSource).toMatch(/@media \(max-width: 1180px\)/);
  });

  it('keeps active exercise card styles on shared Crystalline Swan tokens', () => {
    expect(cardStylesSource).toContain('withAlpha');
    expect(cardStylesSource).not.toMatch(/rgba\((20, 20, 25|139, 92, 246|255, 255, 255|0, 0, 0|80, 160, 240|96, 192, 240)/);
    expect(cardStylesSource).not.toMatch(/withAlpha\('#ef4444'/i);
  });

  it('keeps active exercise set row controls on shared Crystalline Swan tokens', () => {
    expect(rowStylesSource).toContain('withAlpha');
    expect(rowStylesSource).not.toMatch(/rgba\((10, 10, 15|20, 20, 25|26, 26, 36|80, 160, 240|96, 192, 240|224, 236, 244|239, 68, 68|255, 255, 255)/);
    expect(rowStylesSource).not.toMatch(/#f87171/i);
  });
});
