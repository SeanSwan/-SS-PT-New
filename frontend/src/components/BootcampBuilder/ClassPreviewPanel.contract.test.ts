import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(resolve(__dirname, './ClassPreviewMainBoard.tsx'), 'utf8');
const ALTERNATIVES_SOURCE = readFileSync(resolve(__dirname, './ClassPreviewAlternatives.tsx'), 'utf8');

describe('ClassPreviewPanel interaction contract', () => {
  it('lets manual full-group classes delete exercises from the flat Board 1 branch', () => {
    expect(SOURCE).toContain('const deleteIdx = globalIdx >= 0 ? globalIdx : idx;');
    expect(SOURCE).toContain('onDeleteExercise(deleteIdx)');
    expect(SOURCE).not.toContain('b1-flat-delete');
  });

  it('renders inferred station slots when saved station metadata lags assignments', () => {
    expect(SOURCE).toContain("from './BootcampDemoMode.stationCount'");
    expect(SOURCE).toContain('getBootcampFloorStationCount(bootcamp, bootcamp.stations.length)');
    expect(SOURCE).toContain('stationSlots.map(({ station, stationIndex }) => {');
    expect(SOURCE).toContain('station?.stationName ?? `Station ${stationIndex + 1}`');
  });

  it('renders inferred station slots in alternative preview boards too', () => {
    expect(ALTERNATIVES_SOURCE).toContain("from './BootcampDemoMode.stationCount'");
    expect(ALTERNATIVES_SOURCE).toContain('getBootcampFloorStationCount(bootcamp, bootcamp.stations.length)');
    expect(ALTERNATIVES_SOURCE).toContain('stationSlots.map(({ station, stationIndex }) => {');
    expect(ALTERNATIVES_SOURCE).toContain("bootcampAlternativeStationKey('jointFriendly', station, stationIndex)");
    expect(ALTERNATIVES_SOURCE).toContain("bootcampAlternativeStationKey('lowImpact', station, stationIndex)");
  });
});
