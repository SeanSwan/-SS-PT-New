import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const stylesPath = resolve(__dirname, 'MeasurementEntry.modalStyles.ts');
const stylesSource = existsSync(stylesPath) ? readFileSync(stylesPath, 'utf8') : '';

describe('MeasurementEntry modal style extraction', () => {
  it('keeps reusable detail modal and media styles outside the biometrics shell', () => {
    expect(componentSource).toContain("from './MeasurementEntry.modalStyles'");
    expect(componentSource).not.toContain('const PhotoPreviewWrapper = styled.');
    expect(componentSource).not.toContain('const ModalOverlay = styled.');
    expect(componentSource).not.toContain('const DetailGrid = styled.');
    expect(stylesSource).toContain('export const PhotoPreviewWrapper');
    expect(stylesSource).toContain('export const ModalOverlay');
    expect(stylesSource).toContain('export const DetailGrid');
  });
});
