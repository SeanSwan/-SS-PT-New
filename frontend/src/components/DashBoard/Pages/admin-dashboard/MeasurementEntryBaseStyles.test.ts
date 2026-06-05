import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'MeasurementEntry.baseStyles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('MeasurementEntry base style extraction', () => {
  it('keeps reusable base layout styles outside the active biometrics shell', () => {
    expect(componentSource).toContain("from './MeasurementEntry.baseStyles'");
    expect(componentSource).not.toContain('const PageWrapper = styled.');
    expect(componentSource).not.toContain('const Spinner = styled.');
    expect(stylesSource).toContain('export const PageWrapper');
    expect(stylesSource).toContain('export const CenteredStatsRow');
  });
});
