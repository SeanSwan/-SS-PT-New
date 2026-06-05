import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(resolve(__dirname, 'MeasurementEntry.tsx'), 'utf8');
const typesPath = resolve(__dirname, 'MeasurementEntry.types.ts');
const configPath = resolve(__dirname, 'MeasurementEntry.config.ts');
const typesSource = existsSync(typesPath) ? readFileSync(typesPath, 'utf8') : '';
const configSource = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';

describe('MeasurementEntry decomposition', () => {
  it('keeps shared measurement types and chart config outside the active biometrics shell', () => {
    expect(componentSource).toContain("from './MeasurementEntry.types'");
    expect(componentSource).toContain("from './MeasurementEntry.config'");
    expect(componentSource).not.toContain('interface BodyMeasurement');
    expect(componentSource).not.toContain('const measurementFields');
    expect(typesSource).toContain('export interface BodyMeasurement');
    expect(configSource).toContain('export const measurementFields');
    expect(configSource).toContain('export const victoryElement');
  });
});
