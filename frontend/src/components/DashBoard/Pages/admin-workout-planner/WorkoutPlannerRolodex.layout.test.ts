import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PAGE_SOURCE = readFileSync(resolve(__dirname, './plannerContexts/useWorkoutPlannerOrchestration.ts'), 'utf8');
const CLIENT_STATE_SOURCE = readFileSync(resolve(__dirname, './useWorkoutPlannerClientState.ts'), 'utf8');
const ROLODEX_STATE_SOURCE = readFileSync(resolve(__dirname, './useWorkoutPlannerRolodexState.tsx'), 'utf8');
const ROLODEX_PANEL_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerRolodexPanel.tsx'), 'utf8');
const ROLODEX_STYLE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerRolodex.styles.ts'), 'utf8');
const EXERCISE_CARD_STYLE_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerRolodexCard.styles.ts'), 'utf8');
const GENERATED_PLAN_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerGeneratedPlanSection.tsx'), 'utf8');
const BUILDER_PANEL_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerBuilderPanel.tsx'), 'utf8');
const BUILDER_PANEL_SECTIONS_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerBuilderPanel.sections.tsx'), 'utf8');
const ROW_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerExerciseRow.tsx'), 'utf8');
const TYPES_SOURCE = readFileSync(resolve(__dirname, './WorkoutPlannerTypes.ts'), 'utf8');

describe('WorkoutPlanner exercise rolodex layout', () => {
  it('uses a shared row-height constant large enough for two-line names and wrapped tags', () => {
    expect(ROLODEX_PANEL_SOURCE).toContain('const WORKOUT_PLANNER_ROW_HEIGHT = 156;');
    expect(ROLODEX_PANEL_SOURCE).toMatch(/rowHeight:\s*WORKOUT_PLANNER_ROW_HEIGHT/);
    expect(ROLODEX_PANEL_SOURCE).toMatch(/defaultHeight:\s*520/);
    expect(ROLODEX_PANEL_SOURCE).not.toMatch(/VIRTUAL_LIST_STYLE = \{ height:/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?display:\s*grid/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/grid-template-columns:\s*clamp\(72px, 24%, 96px\) minmax\(0, 1fr\) 44px/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseRowContent[\s\S]*?display:\s*flex/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseRowContent[\s\S]*?justify-content:\s*center/);
  });

  it('keeps exercise names and meta chips contained inside the row card', () => {
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?box-sizing:\s*border-box/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?min-height:\s*132px/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseItem[\s\S]*?height:\s*calc\(100% - 8px\)/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseMeta[\s\S]*?max-height:\s*48px/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?line-height:\s*1\.25/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?text-overflow:\s*ellipsis/);
  });

  it('renders compact impact labels so High/Medium badges cannot cover exercise names', () => {
    expect(ROLODEX_STATE_SOURCE).toContain("import { WorkoutPlannerExerciseRow } from './WorkoutPlannerExerciseRow';");
    expect(ROLODEX_STATE_SOURCE).toMatch(/const impact = getJointImpact\(exercise\);/);
    expect(ROW_SOURCE).toMatch(/function formatImpactLabel\(impact: string\): string/);
    expect(ROW_SOURCE).toMatch(/formatImpactLabel\(impact\)/);
    expect(PAGE_SOURCE).not.toMatch(/<MetaTag \$impact=\{getJointImpact\(ex\)\}>\{getJointImpact\(ex\)\}<\/MetaTag>/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?max-width:\s*min\(16ch, 100%\)/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/MetaTag[\s\S]*?letter-spacing:\s*0/);
  });

  it('uses the shared logger media preview in non-interactive thumbnail mode', () => {
    expect(ROW_SOURCE).toContain("import ExerciseMediaPreview from '../../../WorkoutLogger/ExerciseMediaPreview';");
    expect(ROW_SOURCE).toMatch(/<ExerciseMediaPreview exercise=\{exercise\} variant="thumbnail" \/>/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toContain('export const PlannerMediaThumb');
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/PlannerMediaThumb[\s\S]*?aspect-ratio:\s*auto/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/PlannerMediaThumb[\s\S]*?\[role='img'\][\s\S]*?-webkit-line-clamp:\s*2/);
  });

  it('keeps the mobile add control a real 44px keyboard-visible button', () => {
    expect(EXERCISE_CARD_STYLE_SOURCE).not.toContain('width: 32px');
    expect(EXERCISE_CARD_STYLE_SOURCE).not.toContain('height: 32px');
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?width:\s*44px/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?height:\s*44px/);
    expect(EXERCISE_CARD_STYLE_SOURCE).toMatch(/ExerciseAddBtn[\s\S]*?&:focus-visible/);
    expect(EXERCISE_CARD_STYLE_SOURCE).not.toContain('scale(1.1)');
    expect(EXERCISE_CARD_STYLE_SOURCE).not.toContain('translateX(');
    expect(ROW_SOURCE).toMatch(/<ExerciseAddBtn[\s\S]*?type="button"/);
    expect(ROW_SOURCE).not.toMatch(/<ExerciseItem[\s\S]*?role="button"/);
    expect(ROW_SOURCE).toMatch(/<ExerciseItem[\s\S]*?role="listitem"/);
  });

  it('keeps rolodex filter chips at the 44px touch-target floor on mobile and desktop', () => {
    expect(ROLODEX_STYLE_SOURCE).not.toContain('min-height: 36px');
    expect(ROLODEX_STYLE_SOURCE).not.toContain('min-height: 32px');
    expect(ROLODEX_STYLE_SOURCE).toMatch(/export const Chip = styled\.button[\s\S]*?min-height:\s*44px/);
    expect(ROLODEX_STYLE_SOURCE).toMatch(/export const Chip = styled\.button[\s\S]*?min-width:\s*44px/);
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
    expect(PAGE_SOURCE).toContain("from '../useWorkoutPlannerClientState'");
    expect(CLIENT_STATE_SOURCE).toMatch(/const requestedOrSelfClientId = requestedClientId \?\? selfClient\?\.id \?\? null;/);
    expect(CLIENT_STATE_SOURCE).toMatch(/setSelectedClientId\(pickWorkoutPlannerClientId\(clients, requestedOrSelfClientId\)\)/);
  });

  it('carries clientSource into branded generated-plan PDF exports', () => {
    expect(TYPES_SOURCE).toMatch(/clientSource\?:\s*'swanstudios' \| 'move_fitness' \| 'external'/);
    // A3: the branded export now runs through the Approval Vault preview builder
    // (buildPopulatedPlanPdfBlob) instead of a direct download — the client's
    // source must still reach it, or an MF client's plan would print SwanStudios.
    expect(GENERATED_PLAN_SOURCE).toMatch(/buildPopulatedPlanPdfBlob\([\s\S]*selectedClient\?\.clientSource[\s\S]*\);/);
    expect(PAGE_SOURCE).not.toContain('PlannerClient does not');
  });

  it('does not key generated AI reasoning or recommendation rows by array index', () => {
    expect(BUILDER_PANEL_SOURCE).not.toMatch(/explanations\.map\(\(exp, i\)[\s\S]*?<ExplanationItem key=\{i\}/);
    expect(BUILDER_PANEL_SECTIONS_SOURCE).not.toMatch(/explanations\.map\(\(exp, i\)[\s\S]*?<ExplanationItem key=\{i\}/);
    expect(GENERATED_PLAN_SOURCE).not.toMatch(/recommendations\.map\(\(rec, i\)[\s\S]*?<RecommendationItem key=\{i\}/);
    expect(BUILDER_PANEL_SECTIONS_SOURCE).toContain('workoutPlannerExplanationKey');
    expect(GENERATED_PLAN_SOURCE).toContain('workoutPlannerRecommendationKey');
  });
});
