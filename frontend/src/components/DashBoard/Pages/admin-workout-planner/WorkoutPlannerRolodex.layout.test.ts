import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PAGE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerPage.tsx'), 'utf8');
const STYLE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerStyles.ts'), 'utf8');

describe('WorkoutPlanner exercise rolodex layout', () => {
  it('uses a shared row-height constant large enough for two-line names and wrapped tags', () => {
    expect(PAGE_SOURCE).toContain('const WORKOUT_PLANNER_ROW_HEIGHT = 76;');
    expect(PAGE_SOURCE).toMatch(/rowHeight:\s*WORKOUT_PLANNER_ROW_HEIGHT/);
  });

  it('keeps exercise names and meta chips contained inside the row card', () => {
    expect(STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?min-height:\s*64px/);
    expect(STYLE_SOURCE).toMatch(/ExerciseMeta[\s\S]*?max-height:\s*30px/);
    expect(STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?text-overflow:\s*ellipsis/);
  });

  it('honors a clientId deep link from Client Hub before defaulting to the first client', () => {
    expect(PAGE_SOURCE).toMatch(/useSearchParams/);
    expect(PAGE_SOURCE).toMatch(/requestedClientId/);
    expect(PAGE_SOURCE).toMatch(/preferredClientId/);
    expect(PAGE_SOURCE).toMatch(/setSelectedClientId\(preferredClientId\)/);
  });
});
