import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PAGE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerPage.tsx'), 'utf8');
const CLIENT_STATE_SOURCE = readFileSync(resolve(__dirname, './useWorkoutPlannerClientState.ts'), 'utf8');
const ROLODEX_STATE_SOURCE = readFileSync(resolve(__dirname, './useWorkoutPlannerRolodexState.tsx'), 'utf8');
const ROLODEX_PANEL_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerRolodexPanel.tsx'), 'utf8');
const ROLODEX_STYLE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerRolodex.styles.ts'), 'utf8');
const GENERATED_PLAN_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerGeneratedPlanSection.tsx'), 'utf8');
const BUILDER_PANEL_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerBuilderPanel.tsx'), 'utf8');
const EXERCISE_STYLE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerExercise.styles.ts'), 'utf8');
const ROW_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerExerciseRow.tsx'), 'utf8');
const TYPES_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerTypes.ts'), 'utf8');

describe('WorkoutPlanner exercise rolodex layout', () => {
  it('uses a shared row-height constant large enough for two-line names and wrapped tags', () => {
    expect(ROLODEX_PANEL_SOURCE).toContain('const WORKOUT_PLANNER_ROW_HEIGHT = 112;');
    expect(ROLODEX_PANEL_SOURCE).toMatch(/rowHeight:\s*WORKOUT_PLANNER_ROW_HEIGHT/);
    expect(ROW_SOURCE).toMatch(/RowContent[\s\S]*?display:\s*flex/);
    expect(ROW_SOURCE).toMatch(/RowContent[\s\S]*?justify-content:\s*center/);
  });

  it('keeps exercise names and meta chips contained inside the row card', () => {
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?box-sizing:\s*border-box/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?min-height:\s*100px/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseMeta[\s\S]*?max-height:\s*42px/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?line-height:\s*1\.25/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?text-overflow:\s*ellipsis/);
  });

  it('renders compact impact labels so High/Medium badges cannot cover exercise names', () => {
    expect(ROLODEX_STATE_SOURCE).toContain("import { WorkoutPlannerExerciseRow } from './WorkoutPlannerExerciseRow';");
    expect(ROLODEX_STATE_SOURCE).toMatch(/const impact = getJointImpact\(exercise\);/);
    expect(ROW_SOURCE).toMatch(/function formatImpactLabel\(impact: string\): string/);
    expect(ROW_SOURCE).toMatch(/formatImpactLabel\(impact\)/);
    expect(PAGE_SOURCE).not.toMatch(/<MetaTag \$impact=\{getJointImpact\(ex\)\}>\{getJointImpact\(ex\)\}<\/MetaTag>/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?max-width:\s*12ch/);
  });

  it('keeps the mobile add control a real 44px keyboard-visible button', () => {
    expect(EXERCISE_STYLE_SOURCE).not.toContain('width: 32px');
    expect(EXERCISE_STYLE_SOURCE).not.toContain('height: 32px');
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?width:\s*44px/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?height:\s*44px/);
    expect(EXERCISE_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?&:focus-visible/);
    expect(ROW_SOURCE).toMatch(/<ExerciseAddBtn[\s\S]*?type="button"/);
  });

  it('keeps rolodex filter chips at the 44px touch-target floor on mobile and desktop', () => {
    expect(ROLODEX_STYLE_SOURCE).not.toContain('min-height: 36px');
    expect(ROLODEX_STYLE_SOURCE).not.toContain('min-height: 32px');
    expect(ROLODEX_STYLE_SOURCE).toMatch(/export const Chip = styled\.button[\s\S]*?min-height:\s*44px/);
    expect(ROLODEX_STYLE_SOURCE).toMatch(/&:focus-visible[\s\S]*?outline:\s*2px solid var\(--accent-primary, #60C0F0\)/);
    expect(ROLODEX_PANEL_SOURCE.match(/<Chip[\s\S]*?type="button"/g) ?? []).toHaveLength(5);
  });

  it('gives coaches an active-filter command rail with a safe reset path', () => {
    expect(ROLODEX_STATE_SOURCE).toContain('activeFilterCount');
    expect(ROLODEX_STATE_SOURCE).toContain('clearRolodexFilters');
    expect(ROLODEX_PANEL_SOURCE).toContain('activeFilterCount');
    expect(ROLODEX_PANEL_SOURCE).toContain('onClearFilters');
    expect(ROLODEX_PANEL_SOURCE).toContain('Clear filters');
    expect(ROLODEX_PANEL_SOURCE).toContain('aria-label="Clear Exercise Rolodex filters"');
    expect(ROLODEX_STYLE_SOURCE).toContain('export const RolodexStatusRail');
    expect(ROLODEX_STYLE_SOURCE).toContain('export const ClearFiltersButton');
    expect(ROLODEX_STYLE_SOURCE).toMatch(/ClearFiltersButton[\s\S]*?min-height:\s*44px/);
    expect(ROLODEX_STYLE_SOURCE).toMatch(/ClearFiltersButton[\s\S]*?&:focus-visible/);
  });

  it('honors a clientId deep link from Client Hub before defaulting to the first client', () => {
    expect(PAGE_SOURCE).toMatch(/useSearchParams/);
    expect(PAGE_SOURCE).toMatch(/requestedClientId/);
    expect(PAGE_SOURCE).toContain("from './useWorkoutPlannerClientState'");
    expect(CLIENT_STATE_SOURCE).toMatch(/pickWorkoutPlannerClientId\(clients, requestedClientId\)/);
    expect(CLIENT_STATE_SOURCE).toMatch(/setSelectedClientId\(pickWorkoutPlannerClientId\(clients, requestedClientId\)\)/);
  });

  it('carries clientSource into branded generated-plan PDF exports', () => {
    expect(TYPES_SOURCE).toMatch(/clientSource\?:\s*'swanstudios' \| 'move_fitness' \| 'external'/);
    expect(GENERATED_PLAN_SOURCE).toMatch(/exportPopulatedPlanPDF\([\s\S]*selectedClient\?\.clientSource[\s\S]*\);/);
    expect(PAGE_SOURCE).not.toContain('PlannerClient does not');
  });

  it('does not key generated AI reasoning or recommendation rows by array index', () => {
    expect(BUILDER_PANEL_SOURCE).not.toMatch(/explanations\.map\(\(exp, i\)[\s\S]*?<ExplanationItem key=\{i\}/);
    expect(GENERATED_PLAN_SOURCE).not.toMatch(/recommendations\.map\(\(rec, i\)[\s\S]*?<RecommendationItem key=\{i\}/);
    expect(BUILDER_PANEL_SOURCE).toContain('workoutPlannerExplanationKey');
    expect(GENERATED_PLAN_SOURCE).toContain('workoutPlannerRecommendationKey');
  });
});
