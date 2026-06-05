import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'MeasurementEntry.formStyles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('MeasurementEntry form style extraction', () => {
  it('keeps reusable form, upload, and measurement list styles outside the biometrics shell', () => {
    expect(componentSource).toContain("from './MeasurementEntry.formStyles'");
    expect(componentSource).not.toContain('const InputWrapper = styled.');
    expect(componentSource).not.toContain('const UploadZone = styled.');
    expect(componentSource).not.toContain('const MeasurementListItem = styled.');
    expect(stylesSource).toContain('export const InputWrapper');
    expect(stylesSource).toContain('export const UploadZone');
    expect(stylesSource).toContain('export const MeasurementListItem');
  });
});
