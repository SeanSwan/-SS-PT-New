import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(__dirname, path), 'utf8');
const readOptional = (path: string) => {
  const target = resolve(__dirname, path);
  return existsSync(target) ? readFileSync(target, 'utf8') : '';
};

const workerSource = read('./exerciseSearchWorker.ts');
const hookSource = read('./useExerciseSearch.ts');
const rolodexSource = read('./NASMExerciseRolodex.tsx');
const rolodexStylesSource = read('./NASMExerciseRolodex.styles.ts');
const previewSource = read('./NASMExerciseRolodexPreview.tsx');
const mediaPreviewSource = readOptional('./ExerciseMediaPreview.tsx');
const mediaPreviewStylesSource = readOptional('./ExerciseMediaPreview.styles.ts');

describe('NASMExerciseRolodex media and mobile preview contract', () => {
  it('carries exercise media and logging defaults through ExerciseSlim', () => {
    for (const field of [
      'videoUrl',
      'imageUrl',
      'thumbnailUrl',
      'catalogVideoSample',
      'defaultTempo',
      'defaultRestSeconds',
      'recommendedSets',
      'recommendedReps',
      'recommendedDuration',
      'restInterval',
      'optPhases',
      'nasmMovementPattern',
      'canBePerformedAtHome',
    ]) {
      expect(workerSource).toContain(`${field}?:`);
      expect(hookSource).toContain(`${field}:`);
    }
  });

  it('renders a dedicated playable media preview inside the shared Rolodex preview', () => {
    expect(existsSync(resolve(__dirname, './ExerciseMediaPreview.tsx'))).toBe(true);
    expect(previewSource).toContain("import ExerciseMediaPreview from './ExerciseMediaPreview'");
    expect(previewSource).toContain('<ExerciseMediaPreview exercise={exercise} />');
    expect(mediaPreviewSource).toContain('<MediaVideo');
    expect(mediaPreviewStylesSource).toContain('styled.video');
    expect(mediaPreviewSource).toContain('controls');
    expect(mediaPreviewSource).toContain('playsInline');
  });

  it('keeps mobile at-a-glance preview available without hover-only behavior', () => {
    expect(rolodexSource).toMatch(/setPreviewExercise\(filteredResults\[0\] \|\| null\)/);
    expect(rolodexSource).not.toContain('hover to preview');
    expect(rolodexStylesSource).toMatch(/@media \(max-width: 600px\)[\s\S]*order: -1;/);
  });
});
