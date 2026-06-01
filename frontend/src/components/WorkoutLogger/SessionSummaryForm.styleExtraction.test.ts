import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('SessionSummaryForm style extraction', () => {
  const componentPath = 'src/components/WorkoutLogger/SessionSummaryForm.tsx';
  const stylesPath = 'src/components/WorkoutLogger/SessionSummaryForm.styles.ts';

  it('keeps summary behavior in the component and presentation in a sibling styles module', () => {
    const componentSource = readSource(componentPath);
    const stylesSource = readSource(stylesPath);

    expect(componentSource).toContain("from './SessionSummaryForm.styles'");
    expect(componentSource).not.toContain("from 'styled-components'");
    expect(componentSource).not.toContain('style={{');
    expect(componentSource.split(/\r?\n/).length).toBeLessThanOrEqual(300);

    expect(stylesSource).toContain('export const SummaryContainer');
    expect(stylesSource).toContain('export const IntensityControlRow');
    expect(stylesSource).toContain('export const SliderInput');
    expect(stylesSource).toContain('export const InfoBadge');
    expect(stylesSource).toContain('styled.input');
    expect(stylesSource).toContain('styled.textarea');
  });

  it('keeps session summary controls on shared Crystalline Swan tokens', () => {
    const stylesSource = readSource(stylesPath);

    expect(stylesSource).toContain('withAlpha');
    expect(stylesSource).not.toMatch(/rgba\((0, 0, 0|96, 192, 240|80, 160, 240|255, 255, 255|224, 236, 244|20, 20, 25)/);
  });
});
