import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const read = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('WorkoutPlannerStyles module split', () => {
  it('keeps the public style entrypoint as a small compatibility barrel', () => {
    const source = read('WorkoutPlannerStyles.ts');

    expect(source).toContain("export * from './WorkoutPlannerShell.styles';");
    expect(source).toContain("export * from './WorkoutPlannerRolodex.styles';");
    expect(source).toContain("export * from './WorkoutPlannerExercise.styles';");
    expect(source).toContain("export * from './WorkoutPlannerFeedback.styles';");
    expect(source).toContain("export * from './WorkoutPlannerPlanning.styles';");
    expect(source).toContain("export * from './WorkoutPlannerSchedule.styles';");
    expect(source).not.toMatch(/styled\./);
    expect(lineCount(source)).toBeLessThanOrEqual(80);
  });

  it('keeps each extracted planner style module under the project file cap', () => {
    const modules = [
      ['WorkoutPlannerShell.styles.ts', ['export const Page', 'export const PanelBody']],
      ['WorkoutPlannerRolodex.styles.ts', ['export const SearchWrapper', 'export const Chip']],
      ['WorkoutPlannerExercise.styles.ts', ['export const ExerciseItem', 'export const PhaseBadge']],
      ['WorkoutPlannerFeedback.styles.ts', ['export const SkeletonBlock', 'export const TeachToggle']],
      ['WorkoutPlannerPlanning.styles.ts', ['export const PlanModeBar', 'export const MesocycleCard']],
      ['WorkoutPlannerSchedule.styles.ts', ['export const ScheduleRow', 'export const ExportPdfBtn']],
    ] as const;

    modules.forEach(([fileName, expectedExports]) => {
      const filePath = resolve(__dirname, fileName);
      expect(existsSync(filePath), `${fileName} should exist`).toBe(true);

      const source = read(fileName);
      expectedExports.forEach((expectedExport) => {
        expect(source).toContain(expectedExport);
      });
      expect(lineCount(source), `${fileName} should stay below 300 lines`).toBeLessThanOrEqual(300);
    });
  });
});
