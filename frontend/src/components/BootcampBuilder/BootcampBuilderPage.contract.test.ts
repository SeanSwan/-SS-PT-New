import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(resolve(__dirname, file), 'utf8');

describe('BootcampBuilderPage workflow contract', () => {
  const pageSource = read('./BootcampBuilderPage.tsx');
  const previewSource = [
    read('./ClassPreviewPanel.tsx'),
    read('./ClassPreviewPanel.types.ts'),
    read('./ExerciseModAccordion.tsx'),
  ].join('\n');
  const sidePanelsSource = read('./BootcampBuilderSidePanels.tsx');
  const constantsSource = read('./BootcampBuilderPage.constants.ts');
  const teachMeSource = constantsSource.match(/const BOOTCAMP_TEACH_ME_CONTENT = \[([\s\S]*?)\]\.join\(''\);/)?.[1] ?? '';

  it('sends every visible generation control to the bootcamp API', () => {
    const generateCall = pageSource.match(/api\.generateClass\(\{[\s\S]*?\}\);/)?.[0] ?? '';

    expect(generateCall).toContain('classFormat,');
    expect(generateCall).toContain('classStyle,');
    expect(generateCall).toContain('dayType,');
    expect(generateCall).toContain('intensityCategory,');
    expect(generateCall).toContain('equipmentProfileId: equipmentProfileId || undefined');
    expect(generateCall).toContain('optPhase,');
    expect(generateCall).toContain('includeStretch,');
  });

  it('keeps manual and hybrid additions honest about target station placement', () => {
    expect(pageSource).toContain('placedStationIdx');
    expect(pageSource).toContain('stationIndex: placedStationIdx');
    expect(pageSource).toContain('Station ${placedStationIdx + 1}');
    expect(sidePanelsSource).toContain('getMainBoardExercises(bootcamp?.exercises || []).length');
  });

  it('offers the required three-board class preview flow', () => {
    expect(previewSource).toContain("type BoardView = 'main' | 'jointFriendly' | 'lowImpact';");
    expect(previewSource).toContain('Board 1');
    expect(previewSource).toContain('Main Intensity');
    expect(previewSource).toContain('Board 2');
    expect(previewSource).toContain('Joint-Friendly Alternatives');
    expect(previewSource).toContain('Board 3');
    expect(previewSource).toContain('Low-Impact Swaps');
  });

  it('keeps Board 2 focused on easier and joint-friendly options, not harder progressions', () => {
    expect(previewSource).toContain("type: 'easy' | 'joint'");
    expect(previewSource).not.toContain("label: 'Harder Version'");
    expect(previewSource).not.toContain("$type?: 'easy' | 'hard' | 'joint'");
  });

  it('teaches the current equipment-aware three-board workflow', () => {
    expect(teachMeSource).toContain('Equipment Profile');
    expect(teachMeSource).toContain('Board 1');
    expect(teachMeSource).toContain('Board 2');
    expect(teachMeSource).toContain('Board 3');
    expect(teachMeSource).toContain('Manual');
    expect(teachMeSource).toContain('Hybrid');
    expect(teachMeSource).toContain('55-Minute Rule');
  });

  it('passes the selected equipment profile into manual and hybrid rolodex surfaces', () => {
    const rolodexSurfaces = Array.from(sidePanelsSource.matchAll(/<ExerciseRolodexPanel[\s\S]*?\/>/g)).map(match => match[0]);
    expect(rolodexSurfaces).toHaveLength(2);
    expect(rolodexSurfaces.every(surface => surface.includes('equipmentProfileId={equipmentProfileId}'))).toBe(true);
  });
});
