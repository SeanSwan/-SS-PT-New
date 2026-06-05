import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const panelPath = resolve(__dirname, 'MeasurementEntryClientPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('MeasurementEntry client panel extraction', () => {
  it('keeps client selection and measurement date UI outside the biometrics shell', () => {
    expect(shellSource).toContain("from './MeasurementEntryClientPanel'");
    expect(shellSource).not.toContain('Body Measurements Entry');
    expect(shellSource).not.toContain('Search clients...');
    expect(shellSource).not.toContain('Measurement Date');
    expect(panelSource).toContain('Body Measurements Entry');
    expect(panelSource).toContain('Search clients...');
    expect(panelSource).toContain('Measurement Date');
  });
});
