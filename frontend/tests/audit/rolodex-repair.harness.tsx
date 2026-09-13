/**
 * Rolodex / planner repair — synthetic browser harness (S04)
 * =========================================================
 * WHAT THIS IS
 *   A test-only page that mounts the REAL repaired components so Playwright can
 *   accept them in a real browser. It is served by a loopback-only Vite dev
 *   server (see rolodex-repair.playwright.config.ts), is never registered as a
 *   production route, and is not part of the production build entry.
 *
 * WHAT IS REAL
 *   - the real useExerciseSearch hook, the real Vite module Worker, the real
 *     ApiService/axios transport (Playwright intercepts the HTTP request at the
 *     network layer with a deterministic synthetic catalog)
 *   - the real NASMExerciseRolodex logger panel
 *   - the real useWorkoutPlannerRolodexState hook and WorkoutPlannerRolodexPanel (V1)
 *   - the real WorkoutPlannerExerciseRow (compact media) and BuilderWorkoutContent
 *     (the S02 intensity helper text)
 *
 * WHAT IS SYNTHETIC (and therefore NOT proven here)
 *   - authentication, role, selected client, roster and equipment profile: the
 *     harness supplies none, so every surface runs in its unselected state
 *   - the catalog payload (synthetic fixtures only; no private client data)
 *   - no save, activation, generation or PDF path runs
 *
 * Planner V2 is unit-covered on its real contexts but is NOT mounted here; that
 * gap is recorded in the S04 receipt rather than papered over.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import NASMExerciseRolodex from '@/components/WorkoutLogger/NASMExerciseRolodex';
import { WorkoutPlannerExerciseRow } from '@/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerExerciseRow';
import WorkoutPlannerRolodexPanel from '@/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerRolodexPanel';
import { BuilderWorkoutContent } from '@/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerBuilderPanel.exerciseRows';
import { useWorkoutPlannerRolodexState } from '@/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRolodexState';
import type {
  GeneratedPlan,
  OPTPhaseParams,
  PlanExercise,
} from '@/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes';
import type { ExerciseSlim } from '@/components/WorkoutLogger/useExerciseSearch';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

const PHASE = {
  name: 'Strength',
  sets: '3-4',
  reps: '8-10',
  tempo: '2-0-2',
  rest: '60s',
  intensity: '70-80',
} as unknown as OPTPhaseParams;

/** The long unsupported saved value the S02 helper text must render in full. */
const LONG_INTENSITY =
  '70-80% 1RM for the first three sets, then RPE 8 with a 3-1-1 tempo on the final set';

const ROW_EXERCISE: ExerciseSlim = {
  id: 'synthetic-front-squat',
  name: 'Synthetic Front Squat',
  exerciseKey: 'synthetic-front-squat',
  exerciseType: 'compound',
  bodyPartCategory: 'Legs',
  primaryMuscles: ['Quadriceps'],
  secondaryMuscles: [],
  difficulty: 300,
};

const planRow = (over: Partial<PlanExercise> = {}): PlanExercise => ({
  id: 'harness-row-1',
  exerciseSlim: ROW_EXERCISE,
  sets: 3,
  reps: '8-10',
  tempo: '2-0-2',
  restSeconds: 60,
  intensityPercent: undefined,
  intensityGuideline: LONG_INTENSITY,
  notes: '',
  ...over,
});

/** Section A — real logger rolodex: real hook + real module Worker. */
const LoggerSection: React.FC = () => {
  const [open, setOpen] = React.useState(true);
  return (
    <section data-testid="section-logger" aria-label="Logger rolodex">
      <h2>Logger rolodex (real hook + real worker)</h2>
      <button type="button" onClick={() => setOpen(value => !value)}>Toggle rolodex</button>
      <NASMExerciseRolodex
        isOpen={open}
        onClose={() => setOpen(false)}
        onSelectExercise={() => undefined}
      />
    </section>
  );
};

/** Section B — real Planner V1 panel backed by the real rolodex-state hook. */
const PlannerV1Section: React.FC = () => {
  const [planExercises, setPlanExercises] = React.useState<PlanExercise[]>([]);
  const [generatedPlan, setGeneratedPlan] = React.useState<GeneratedPlan | null>(null);
  const rolodex = useWorkoutPlannerRolodexState({
    phase: PHASE,
    planExercises,
    setPlanExercises,
    generatedPlan,
    setGeneratedPlan,
  });

  return (
    <section data-testid="section-planner-v1" aria-label="Planner V1 rolodex">
      <h2>Planner V1 rolodex (real state hook)</h2>
      <WorkoutPlannerRolodexPanel
        filteredExerciseCount={rolodex.filteredExerciseCount}
        activeFilterCount={rolodex.activeFilterCount}
        exercisesLoading={rolodex.exercisesLoading}
        exercisesLoadState={rolodex.exercisesLoadState}
        exercisesLoadError={rolodex.exercisesLoadError}
        exercisesRefreshError={rolodex.exercisesRefreshError}
        exerciseCatalogCount={rolodex.exerciseCatalogCount}
        exercisesSearching={rolodex.exercisesSearching}
        onRetryExercises={rolodex.refreshExercises}
        searchQuery={rolodex.searchQuery}
        filterCategory={rolodex.filterCategory}
        sourceFilter={rolodex.sourceFilter}
        exerciseTypeFilter={rolodex.exerciseTypeFilter}
        equipmentFilter={rolodex.equipmentFilter}
        impactFilter={rolodex.impactFilter}
        exerciseRowRenderer={rolodex.exerciseRowRenderer}
        onSearchQueryChange={rolodex.setSearchQuery}
        onFilterCategoryChange={rolodex.setFilterCategory}
        onSourceFilterChange={rolodex.setSourceFilter}
        onExerciseTypeFilterChange={rolodex.setExerciseTypeFilter}
        onEquipmentFilterChange={rolodex.setEquipmentFilter}
        onImpactFilterChange={rolodex.setImpactFilter}
        onClearFilters={rolodex.clearRolodexFilters}
      />
    </section>
  );
};

/** Section C — real exercise row (compact media) + real S02 builder row. */
const RowSection: React.FC = () => (
  <section data-testid="section-rows" aria-label="Exercise rows">
    <h2>Compact media + prescription helper text</h2>
    <div data-testid="harness-media-slot" style={{ width: 96 }}>
      <WorkoutPlannerExerciseRow
        exercise={ROW_EXERCISE}
        equipmentLabel="Bodyweight"
        impact="Low Impact"
        selected={false}
        inPlan={false}
        onAdd={() => undefined}
        onSelect={() => undefined}
        {...reactWindowStyleProps({ height: 156, top: 0 })}
      />
    </div>
    <BuilderWorkoutContent
      generating={false}
      planExercises={[planRow()]}
      swapTarget={null}
      onSelectExercise={() => undefined}
      onUpdateExercise={() => undefined}
      onRemoveExercise={() => undefined}
      onBeginSwap={() => undefined}
      onCancelSwap={() => undefined}
    />
  </section>
);

const Harness: React.FC = () => (
  <main data-testid="rolodex-repair-harness">
    <h1>Rolodex repair acceptance harness</h1>
    <LoggerSection />
    <PlannerV1Section />
    <RowSection />
  </main>
);

const container = document.getElementById('rolodex-repair-root');
if (container) createRoot(container).render(<Harness />);
