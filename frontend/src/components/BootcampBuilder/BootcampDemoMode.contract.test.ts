import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('Bootcamp demo mode contract', () => {
  const demoSource = read('./BootcampDemoMode.tsx');
  const demoStylesSource = read('./BootcampDemoMode.styles.ts');
  const floorStylesSource = read('./BootcampDemoMode.floorStyles.ts');
  const previewSource = read('./ClassPreviewPanel.tsx');
  const chromeSource = read('./BootcampBuilderChrome.tsx');

  it('renders a floor-display demo board from the same class preview surface', () => {
    expect(previewSource).toContain('BootcampDemoMode');
    expect(previewSource).toContain('floorMode && activeBoard === \'main\'');
    expect(demoSource).toContain('Station Demo Board');
    expect(demoSource).toContain('stationExercises');
    expect(demoSource).toContain('onSelectExercise');
  });

  it('uses Rolodex media URLs for GIF-like previews and outbound video viewing', () => {
    expect(demoSource).toContain('getExerciseDemoMedia');
    expect(demoSource).toContain('exercise.videoUrl');
    expect(demoSource).toContain('exercise.catalogVideoSample?.videoUrl');
    expect(demoSource).toContain('exercise.thumbnailUrl');
    expect(demoSource).toContain('exercise.imageUrl');
    expect(demoSource).toContain('exercise.catalogVideoSample?.thumbnailUrl');
    expect(demoSource).toContain('Open catalog video');
    expect(demoSource).toContain('target="_blank"');
    expect(demoSource).toContain('rel="noopener noreferrer"');
  });

  it('shows true per-station demo readiness instead of labeling every exercise as a video', () => {
    expect(demoSource).toContain('getStationDemoReadiness');
    expect(demoSource).toContain('readyVideos');
    expect(demoSource).toContain('`${readyVideos}/${totalExercises} demos ready`');
    expect(demoSource).not.toContain('{exercises.length} videos');
  });

  it('keeps exercise selection and outbound video opening as sibling controls', () => {
    expect(demoSource).toContain('DemoExerciseSelectButton');
    expect(demoStylesSource).toContain('DemoExerciseTile = styled.article');
    expect(demoStylesSource).toContain('DemoExerciseSelectButton = styled.button');
    expect(demoSource).not.toMatch(/<DemoExerciseTile\b[^>]*type="button"/);
    expect(demoSource).not.toMatch(/<DemoExerciseSelectButton[\s\S]*<DemoVideoLink[\s\S]*<\/DemoExerciseSelectButton>/);
  });

  it('is designed for mobile, desktop, and 4K floor screens without viewport-scaled type', () => {
    expect(demoStylesSource).toContain('@media (max-width: 720px)');
    expect(demoStylesSource).toContain('@media (min-width: 2200px)');
    expect(demoStylesSource).not.toContain('font-size: 1vw');
    expect(demoStylesSource).not.toContain('font-size: 2vw');
    expect(chromeSource).toContain('Demo Mode');
    expect(chromeSource).toContain('Exit Demo');
  });

  it('renders floor-director controls for station focus and remote-style navigation', () => {
    expect(demoSource).toContain('FloorDirectorRail');
    expect(demoSource).toContain('getFloorDirectorModel');
    expect(demoSource).toContain('StationJumpButton');
    expect(demoSource).toContain('aria-label="Previous station"');
    expect(demoSource).toContain('aria-label="Next station"');
    expect(demoSource).toContain("event.key === 'ArrowLeft'");
    expect(demoSource).toContain("event.key === 'ArrowRight'");
    expect(demoSource).toContain("directorView === 'focus'");
    expect(floorStylesSource).toContain('&:focus-visible');
    expect(floorStylesSource).toContain('@media (min-width: 2200px)');
    expect(floorStylesSource).toContain('min-width: 116px');
  });
});
