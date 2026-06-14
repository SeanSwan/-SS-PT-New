import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const trackerSource = readFileSync(resolve(__dirname, './CrystallineCoverageTracker.tsx'), 'utf8');
const detailPath = resolve(__dirname, './CoverageExerciseMediaDetail.tsx');
const detailSource = readFileSync(detailPath, 'utf8');

describe('CrystallineCoverageTracker media contract', () => {
  it('carries Rolodex media fields from the coverage API into the tracker UI', () => {
    expect(trackerSource).toContain('videoUrl?: string | null');
    expect(trackerSource).toContain('imageUrl?: string | null');
    expect(trackerSource).toContain('thumbnailUrl?: string | null');
    expect(trackerSource).toContain('mediaPreviewUrl?: string | null');
    expect(trackerSource).toContain('catalogVideoSample?');
  });

  it('renders a tap-friendly selected exercise media detail instead of hover-only video access', () => {
    expect(existsSync(detailPath)).toBe(true);
    expect(trackerSource).toContain("import CoverageExerciseMediaDetail from './CoverageExerciseMediaDetail'");
    expect(trackerSource).toContain('const [selectedEx, setSelectedEx]');
    expect(trackerSource).toContain('<CoverageExerciseMediaDetail exercise={activeDetailExercise} />');
    expect(trackerSource).toContain('onClick={() => setSelectedEx(ex)}');
  });

  it('can open a safe catalog demo sample when an exercise has no direct Rolodex video', () => {
    expect(detailSource).toContain('catalogVideoSample?');
    expect(detailSource).toContain('const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null');
    expect(detailSource).toContain('const openVideoUrl = exercise.videoUrl || catalogVideoUrl');
    expect(detailSource).toContain('Open catalog demo');
  });
});
