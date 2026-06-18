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
    // The detail panel is rendered (now also as an editor via onSaveMedia); allow extra props.
    expect(trackerSource).toContain('<CoverageExerciseMediaDetail exercise={activeDetailExercise}');
    expect(trackerSource).toContain('onClick={() => setSelectedEx(ex)}');
    // 2026-06-18: click now PINS the detail (selectedEx ?? hoveredEx), so a grazed
    // hex can no longer hijack the pinned selection / media editor target.
    expect(trackerSource).toContain('selectedEx ?? hoveredEx');
  });

  it('can open a safe catalog demo sample when an exercise has no direct Rolodex video', () => {
    expect(detailSource).toContain('catalogVideoSample?');
    expect(detailSource).toContain('const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null');
    expect(detailSource).toContain('const uploadedVideoUrl = exercise.videoUrl || exercise.previewVideoUrl || null');
    expect(detailSource).toContain('const openVideoUrl = uploadedVideoUrl || catalogVideoUrl');
    expect(detailSource).toContain('Open preview loop');
    expect(detailSource).toContain('Open catalog reference');
  });

  it('keeps selected exercise detail backgrounds token-backed', () => {
    expect(detailSource).not.toMatch(/background:\s*rgba\(/);
    expect(detailSource).not.toMatch(/var\([^;]*rgba\(/);
  });

  it('keeps uploaded demo coverage distinct from catalog reference media', () => {
    expect(trackerSource).toContain('Uploaded Demos');
    expect(trackerSource).toContain('Catalog Reference');
    expect(trackerSource).toContain('No Uploaded Media');
    expect(trackerSource).toContain('$legacy={!ex.covered && ex.catalogVideoCount > 0}');
  });

  it('offers an explicit uploaded-media gap filter for filming workflow triage', () => {
    expect(trackerSource).toContain('const [showOnlyGaps, setShowOnlyGaps]');
    expect(trackerSource).toContain('setShowOnlyGaps(v => !v)');
    expect(trackerSource).toContain('aria-pressed={showOnlyGaps}');
    expect(trackerSource).toContain('Gaps only');
  });
});
