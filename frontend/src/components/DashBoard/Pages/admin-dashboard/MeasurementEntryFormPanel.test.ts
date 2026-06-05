import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const panelPath = resolve(__dirname, 'MeasurementEntryFormPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('MeasurementEntry form panel extraction', () => {
  it('keeps measurement input, photo upload, and save UI outside the biometrics shell', () => {
    expect(shellSource).toContain("from './MeasurementEntryFormPanel'");
    expect(shellSource).not.toContain('New Measurements for {selectedClient.name}');
    expect(shellSource).not.toContain('Upload JPEG');
    expect(shellSource).not.toContain('Save Measurements');
    expect(panelSource).toContain('Copy from Last');
    expect(panelSource).toContain('Upload JPEG');
    expect(panelSource).toContain('Save Measurements');
  });
});
