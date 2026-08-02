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
  const configPanelSource = read('./ConfigPanel.tsx');
  const constantsSource = read('./BootcampBuilderPage.constants.ts');
  const builderConstantsSource = read('./BootcampBuilderConstants.ts');
  const stylesSource = read('./BootcampBuilderStyles.ts');
  const modeStylesSource = read('./BootcampModeStyles.ts');
  const railSource = read('./BootcampClassRail.tsx');
  const railStylesSource = read('./BootcampClassRail.styles.ts');
  const chromeSource = read('./BootcampBuilderChrome.tsx');
  const teachMeSource = constantsSource.match(/const BOOTCAMP_TEACH_ME_CONTENT = \[([\s\S]*?)\]\.join\(''\);/)?.[1] ?? '';

  it('defaults new classes to the custom four-station structure instead of a preset-only format', () => {
    expect(builderConstantsSource).toContain("DEFAULT_BOOTCAMP_FORMAT = '4x4_r2'");
    expect(builderConstantsSource).toContain("CUSTOM_BOOTCAMP_FORMAT = 'custom'");
    expect(builderConstantsSource).toContain("DEFAULT_BOOTCAMP_WORKOUT_MIN = '40'");
    expect(pageSource).toContain('classFormat = CUSTOM_BOOTCAMP_FORMAT as ClassFormat');
    expect(pageSource).toContain('useState(DEFAULT_BOOTCAMP_STATION_COUNT)');
    expect(pageSource).toContain('useState(DEFAULT_BOOTCAMP_EXERCISES_PER_STATION)');
    expect(pageSource).not.toContain("useState<ClassFormat>('2x8_r3')");
    expect(pageSource).toContain("useState<IntensityCategory>('medium_impact')");
    expect(builderConstantsSource.indexOf("'4x4_r2'")).toBeLessThan(builderConstantsSource.indexOf("'2x8_r3'"));
  });

  it('sends every visible generation control to the bootcamp API', () => {
    const generateCall = pageSource.match(/api\.generateClass\(\{[\s\S]*?\}\);/)?.[0] ?? '';

    expect(generateCall).toContain('classFormat,');
    expect(generateCall).toContain('stationCount,');
    expect(generateCall).toContain('exercisesPerStation,');
    expect(generateCall).toContain('classStyle,');
    expect(generateCall).toContain('dayType,');
    expect(generateCall).toContain('intensityCategory,');
    expect(generateCall).toContain('equipmentProfileId: equipmentProfileId || undefined');
    expect(generateCall).toContain('optPhase,');
    expect(generateCall).toContain('includeStretch,');
    expect(generateCall).toContain('exclusionKeys,');
  });

  it('excludes the immediately previous main board when generating again', () => {
    expect(pageSource).toContain('getMainBoardExclusionKeys');
    expect(pageSource).toContain('const exclusionKeys = getMainBoardExclusionKeys(bootcamp?.exercises);');
  });
  it('uses independent station and exercise controls instead of preset-only class formats', () => {
    expect(builderConstantsSource).toContain('BOOTCAMP_STATION_COUNT_OPTIONS = [1, 2, 3, 4, 5, 6]');
    expect(builderConstantsSource).toContain('BOOTCAMP_EXERCISES_PER_STATION_OPTIONS = [1, 2, 3, 4, 5]');
    expect(configPanelSource).toContain('Station Count');
    expect(configPanelSource).toContain('Exercises Per Station');
    expect(configPanelSource).not.toContain('<Label>Class Format</Label>');
    expect(sidePanelsSource).toContain('stationCount={stationCount}');
    expect(sidePanelsSource).toContain('exercisesPerStation={exercisesPerStation}');
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

  it('mounts the command deck with the active build mode so readiness is visible before class launch', () => {
    expect(previewSource).toContain("from './BootcampCommandDeck'");
    expect(previewSource).toContain('<BootcampCommandDeck');
    expect(previewSource).toContain('buildMode={buildMode}');
    expect(pageSource).toContain('buildMode={buildMode}');
  });

  it('mounts one continuous Build to Preflight to Run rail on the canonical page', () => {
    expect(constantsSource).toContain("type BootcampWorkflowStage = 'build' | 'preflight' | 'run'");
    expect(pageSource).toContain('useBootcampWorkflowStage()');
    expect(pageSource).toContain('const { workflowStage, floorMode, onStageChange } = useBootcampWorkflowStage()');
    expect(chromeSource).toContain('<BootcampClassRail');
    expect(pageSource).toContain('activeStage={workflowStage}');
    expect(pageSource).toContain('onStageChange={onStageChange}');
    expect(railSource).toContain('getBootcampClassRailModel');
    expect(railSource).toContain('aria-current');
    expect(railSource).toContain('model.hardBlockers');
    expect(railSource).toContain('model.warnings');
  });

  it('makes the rail the only class-stage control instead of leaving a competing demo toggle', () => {
    expect(chromeSource).not.toContain('onToggleFloorMode');
    expect(chromeSource).not.toContain("floorMode ? 'Exit Demo' : 'Demo Mode'");
    expect(railSource).toContain('model.primaryAction');
    expect(railSource).toContain('onStageChange');
  });

  it('keeps the rail touch-safe and responsive from phone through QHD and 4K', () => {
    expect(railStylesSource).toMatch(/min-height: (?:4[4-9]|[5-9]\\d)px/);
    expect(railStylesSource).toContain('@media (max-width: 430px)');
    expect(railStylesSource).toContain('@media (min-width: 2200px)');
  });

  it('keeps Bootcamp Builder styling on theme variables instead of fixed neon drift', () => {
    expect(stylesSource).toContain('var(--bg-base, #0A0A0F)');
    expect(stylesSource).toContain('var(--accent-gold, #C6A84B)');
    expect(stylesSource).not.toContain('background: #000');
    expect(stylesSource).not.toContain('#FF6B35');
    expect(stylesSource).not.toContain('#00FF88');
    expect(stylesSource).not.toContain('rgba(0,255,136');
    expect(stylesSource).not.toContain('rgba(0, 255, 136');
    expect(stylesSource).not.toContain('rgba(255, 184, 0');
    expect(stylesSource).not.toContain('color: white;');
    expect(modeStylesSource).not.toContain('rgba(201, 42, 84');
    expect(modeStylesSource).not.toContain('color: #C92A54');
  });
});
