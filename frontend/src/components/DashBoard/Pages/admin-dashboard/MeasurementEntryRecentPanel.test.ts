import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const shellSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const panelPath = resolve(__dirname, 'MeasurementEntryRecentPanel.tsx');
const panelSource = existsSync(panelPath) ? readFileSync(panelPath, 'utf8') : '';

describe('MeasurementEntry recent panel extraction', () => {
  it('keeps recent measurement list rendering outside the biometrics shell', () => {
    expect(shellSource).toContain("from './MeasurementEntryRecentPanel'");
    expect(shellSource).not.toContain('Recent Measurements for {selectedClient.name}');
    expect(shellSource).not.toContain('No recent measurements found for this client.');
    expect(panelSource).toContain('Recent Measurements for {selectedClient.name}');
    expect(panelSource).toContain('No recent measurements found for this client.');
  });
});
