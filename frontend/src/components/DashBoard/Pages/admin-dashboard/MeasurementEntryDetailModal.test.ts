import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const modalPath = resolve(__dirname, 'MeasurementEntryDetailModal.tsx');
const modalSource = existsSync(modalPath) ? readFileSync(modalPath, 'utf8') : '';

describe('MeasurementEntry detail modal extraction', () => {
  it('keeps measurement detail modal rendering outside the biometrics shell', () => {
    expect(shellSource).toContain("from './MeasurementEntryDetailModal'");
    expect(shellSource).not.toContain('Recorded by {detailMeasurement.recorder.firstName');
    expect(shellSource).not.toContain('<DetailGrid>');
    expect(shellSource).not.toContain('<ModalOverlay');
    expect(modalSource).toContain('Recorded by {detailMeasurement.recorder.firstName');
    expect(modalSource).toContain('<DetailGrid>');
    expect(modalSource).toContain('<ModalOverlay');
  });
});
