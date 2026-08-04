import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('ClassPreviewPanel composition contract', () => {
  it('keeps the bootcamp preview shell thin and delegated', () => {
    const source = read('./ClassPreviewPanel.tsx');

    expect(source).toContain("from './ClassPreviewMainBoard'");
    expect(source).toContain("from './ClassPreviewAlternatives'");
    expect(source).toContain("from './ClassPreviewPanel.previewStyles'");
    expect(source).not.toContain('styled.');
    expect(source.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(source).toContain('if (floorMode && bootcamp) {');
    expect(source).toContain('<BootcampDemoMode bootcamp={bootcamp} onSelectExercise={onSelectExercise} />');
  });

  it('keeps extracted preview modules under the project file cap', () => {
    [
      './ClassPreviewMainBoard.tsx',
      './ClassPreviewAlternatives.tsx',
      './ExerciseModAccordion.tsx',
      './ClassPreviewPanel.previewStyles.ts',
      './ClassPreviewPanel.exerciseStyles.ts',
      './ClassPreviewPanel.types.ts',
    ].forEach((file) => {
      expect(read(file).split(/\r?\n/).length, file).toBeLessThanOrEqual(300);
    });
  });

  it('does not key generated preview rows by array index', () => {
    const panelSource = read('./ClassPreviewPanel.tsx');
    const mainBoardSource = read('./ClassPreviewMainBoard.tsx');
    const alternativesSource = read('./ClassPreviewAlternatives.tsx');

    expect(panelSource).not.toContain('key={stretch.sortOrder ?? index}');
    expect(panelSource).not.toContain('key={`${lap.name}-${index}`}');
    expect(mainBoardSource).not.toContain('key={`${stationIndex}-${ex.sortOrder}-${exIdx}-main`}');
    expect(mainBoardSource).not.toContain('key={`${ex.sortOrder}-${idx}-main`}');
    expect(mainBoardSource).not.toContain('key={`b1-flat-delete-${idx}`}');
    expect(alternativesSource).not.toContain('key={`b2-${stationIndex}`}');
    expect(alternativesSource).not.toContain('key={`b2-${stationIndex}-${exIdx}`}');
    expect(alternativesSource).not.toContain('key={`b2-flat-${exIdx}`}');
    expect(alternativesSource).not.toContain('key={`${keyPrefix}-${exIdx}`}');
    expect(alternativesSource).not.toContain('key={`b3-${stationIndex}`}');

    expect(panelSource).toContain('bootcampStretchItemKey');
    expect(panelSource).toContain('bootcampOverflowLapKey');
    expect(mainBoardSource).toContain('bootcampMainBoardExerciseKey');
    expect(alternativesSource).toContain('bootcampAlternativeStationKey');
    expect(alternativesSource).toContain('bootcampAlternativeExerciseKey');
    expect(alternativesSource).toContain('bootcampLowImpactSwapKey');
  });
});
