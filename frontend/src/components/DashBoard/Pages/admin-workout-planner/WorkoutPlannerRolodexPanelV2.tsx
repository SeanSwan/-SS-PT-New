/**
 * COMPONENT: WorkoutPlannerRolodexPanelV2 (S18 — JARVIS blueprint §4.3)
 * PURPOSE: The upgraded Exercise Rolodex (KEPT, never replaced) for
 * PLANNER_IA_V2. The five always-visible chip rows become ONE Filters
 * button + count badge opening a grouped facet sheet; search is first
 * (autofocus, 150ms debounce); a Plan tab shows what is already in this
 * day/week so trainers stop double-adding; adds get a 5-second Undo toast.
 * Virtualization and the shared row renderer are retained — zero new deps.
 * DEFERRED to the flag-flip pass (no client-side data path yet, recorded in
 * the S18 breadcrumb): row media previews, NASM movement-pattern facets,
 * pain-excluded-with-reason rows (needs Cortex exclusions in the feed).
 */

import React from 'react';
import { List } from 'react-window';
import { Search, SlidersHorizontal } from 'lucide-react';
import {
  BODY_PARTS, EQUIPMENT_FILTERS, EXERCISE_TYPES, IMPACT_LEVELS, SOURCE_FILTERS,
} from './WorkoutPlannerFilters';
import {
  Chip, ChipRow, ClearFiltersButton, Panel, PanelHeader, PanelTitle,
  SearchInput, SearchWrapper,
} from './WorkoutPlannerStyles';
import {
  ActiveChipsRow, FacetLabel, FacetSheet, FiltersButton, HeaderActions,
  PlanTabList, TabChip, TabRow, UndoToast,
} from './WorkoutPlannerRolodexPanelV2.styles';
import { ExerciseListPane, ResultsCount } from './WorkoutPlannerPage.styles';
import { PlannerEmpty, PlannerError, PlannerSkeleton } from './PlannerStateViews';
import {
  LIBRARY_COPY,
  resolveLibraryState,
} from '../../../WorkoutLogger/exerciseSearchLibraryState';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';

const ROW_HEIGHT = 156;
const LIST_STYLE = { overflowX: 'hidden' as const };
const SEARCH_DEBOUNCE_MS = 150;
const UNDO_WINDOW_MS = 5000;

interface Facet {
  label: string; options: readonly string[]; allValue: string;
  value: string | null; set: (value: string | null) => void; lowercase?: boolean;
}

const WorkoutPlannerRolodexPanelV2: React.FC = () => {
  const data = usePlannerData();
  const act = usePlannerActions();
  const {
    filteredExerciseCount, activeFilterCount, exercisesLoading, searchQuery,
    filterCategory, sourceFilter, exerciseTypeFilter, equipmentFilter, impactFilter,
    exerciseRowRenderer,
    exercisesLoadState, exercisesLoadError, exercisesRefreshError,
    exerciseCatalogCount, exercisesSearching, refreshExercises,
  } = data.rolodex;
  const { planExercises, generatedPlan } = data.local;

  const libraryState = resolveLibraryState({
    loadState: exercisesLoadState,
    isLoading: exercisesLoading,
    catalogCount: exerciseCatalogCount ?? filteredExerciseCount,
    resultCount: filteredExerciseCount,
  });

  const [tab, setTab] = React.useState<'library' | 'plan'>('library');
  const [facetsOpen, setFacetsOpen] = React.useState(false);
  const [draftQuery, setDraftQuery] = React.useState(searchQuery);
  const [undoTarget, setUndoTarget] = React.useState<{ id: string; name: string } | null>(null);
  const searchRef = React.useRef<HTMLInputElement | null>(null);

  // Search-first: autofocus on mount, debounce 150ms into the shared query.
  React.useEffect(() => { searchRef.current?.focus(); }, []);
  const setSearchQuery = act.rolodex.setSearchQuery;
  const draftDirtyRef = React.useRef(false);
  React.useEffect(() => {
    if (!draftDirtyRef.current) return undefined; // only user edits push
    if (draftQuery === searchQuery) { draftDirtyRef.current = false; return undefined; }
    const handle = window.setTimeout(() => { draftDirtyRef.current = false; setSearchQuery(draftQuery); }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [draftQuery, searchQuery, setSearchQuery]);
  // External query changes (clear filters, browse handoffs) win over stale drafts.
  React.useEffect(() => {
    if (!draftDirtyRef.current) setDraftQuery(searchQuery);
  }, [searchQuery]);

  // Single-tap add already exists in the shared rows; this watches the plan
  // for a NEW row and offers a 5s Undo through the real remove action.
  const knownIdsRef = React.useRef<Set<string>>(new Set(planExercises.map(row => row.id)));
  React.useEffect(() => {
    const known = knownIdsRef.current;
    const added = planExercises.filter(row => !known.has(row.id));
    const currentIds = new Set(planExercises.map(row => row.id));
    // A TAP only ever appends. A replacement (plan hydration, AI apply) drops
    // rows — so "one new id" alone cannot distinguish the two (review finding 9).
    const droppedRows = [...known].some((id) => !currentIds.has(id));
    knownIdsRef.current = currentIds;

    if (added.length !== 1 || droppedRows) {
      // REVIEW FIX (F6): the previous run's cleanup has ALREADY cancelled that
      // run's timer, so returning early without touching `undoTarget` left a
      // standing toast with nothing able to dismiss it — and it has no close
      // button. Any non-tap change therefore retires the offer.
      //
      // In scope here: bulk hydration, a removal, a reorder, an in-place edit
      // (same ids, new array identity → added 0), and a plan REPLACEMENT.
      // NOT resolved: `[] -> [X]` — a one-row plan load is indistinguishable
      // from a tap by array diffing alone, so it still arms an offer whose Undo
      // would remove a row the trainer never added. Closing that needs the add
      // to be signalled explicitly rather than inferred (recorded open).
      setUndoTarget(null);
      return undefined;
    }
    setUndoTarget({ id: added[0].id, name: added[0].exerciseSlim.name });
    const handle = window.setTimeout(() => setUndoTarget(null), UNDO_WINDOW_MS);
    return () => window.clearTimeout(handle);
  }, [planExercises]);

  const facets: Facet[] = [
    { label: 'Body part', options: BODY_PARTS, allValue: 'All', value: filterCategory, set: act.rolodex.setFilterCategory },
    { label: 'Program source', options: SOURCE_FILTERS, allValue: 'All Programs', value: sourceFilter, set: act.rolodex.setSourceFilter, lowercase: true },
    { label: 'Exercise type', options: EXERCISE_TYPES, allValue: 'All Types', value: exerciseTypeFilter, set: act.rolodex.setExerciseTypeFilter, lowercase: true },
    { label: 'Equipment', options: EQUIPMENT_FILTERS, allValue: 'All Equipment', value: equipmentFilter, set: act.rolodex.setEquipmentFilter, lowercase: true },
    { label: 'Joint impact', options: IMPACT_LEVELS, allValue: 'All Impact', value: impactFilter, set: act.rolodex.setImpactFilter },
  ];
  const activeFacets = facets.filter(facet => facet.value !== null);

  const generatedSessionCount = generatedPlan?.planSummary.totalSessions ?? 0;

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle><Search size={16} /> Exercise Rolodex</PanelTitle>
        <HeaderActions>
          <ResultsCount aria-busy={exercisesSearching} data-testid="planner-rolodex-v2-count">
            {exercisesSearching ? LIBRARY_COPY.searchPending : `${filteredExerciseCount} results`}
          </ResultsCount>
          <FiltersButton
            type="button"
            aria-expanded={facetsOpen}
            aria-label={`Filters, ${activeFilterCount} active`}
            onClick={() => setFacetsOpen(open => !open)}
          >
            <SlidersHorizontal size={14} aria-hidden /> Filters{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
          </FiltersButton>
        </HeaderActions>
      </PanelHeader>

      <SearchWrapper>
        <Search size={14} />
        <SearchInput
          ref={searchRef}
          value={draftQuery}
          onChange={event => { draftDirtyRef.current = true; setDraftQuery(event.target.value); }}
          placeholder="Search exercises..."
          aria-label="Search exercises"
        />
      </SearchWrapper>

      <TabRow role="tablist" aria-label="Rolodex views">
        <TabChip type="button" role="tab" aria-selected={tab === 'library'} $active={tab === 'library'} onClick={() => setTab('library')}>
          Library
        </TabChip>
        <TabChip type="button" role="tab" aria-selected={tab === 'plan'} $active={tab === 'plan'} onClick={() => setTab('plan')}>
          In plan · {planExercises.length}
        </TabChip>
      </TabRow>

      {facetsOpen && (
        <FacetSheet data-testid="planner-rolodex-facet-sheet">
          {facets.map(facet => (
            <div key={facet.label}>
              <FacetLabel>{facet.label}</FacetLabel>
              <ChipRow>
                {facet.options.map(option => {
                  const optionValue = option === facet.allValue ? null : (facet.lowercase ? option.toLowerCase() : option);
                  return (
                    <Chip
                      type="button"
                      key={option}
                      $active={facet.value === optionValue || (facet.value === null && optionValue === null)}
                      onClick={() => facet.set(optionValue)}
                    >
                      {option}
                    </Chip>
                  );
                })}
              </ChipRow>
            </div>
          ))}
        </FacetSheet>
      )}

      {!facetsOpen && activeFacets.length > 0 && (
        <ActiveChipsRow aria-label="Active filters">
          {activeFacets.slice(0, 3).map(facet => (
            <Chip type="button" key={facet.label} $active onClick={() => facet.set(null)} aria-label={`Remove ${facet.label} filter`}>
              {String(facet.value)} ✕
            </Chip>
          ))}
          {activeFacets.length > 3 && <Chip type="button" $active={false} onClick={() => setFacetsOpen(true)}>+{activeFacets.length - 3}</Chip>}
          <ClearFiltersButton type="button" onClick={act.rolodex.clearRolodexFilters} aria-label="Clear Exercise Rolodex filters">
            Clear filters
          </ClearFiltersButton>
        </ActiveChipsRow>
      )}

      {undoTarget && (
        <UndoToast role="status" data-testid="planner-rolodex-undo">
          <span>Added {undoTarget.name}</span>
          <button type="button" onClick={() => { act.pageActions.removeExercise(undoTarget.id); setUndoTarget(null); }}>
            Undo
          </button>
        </UndoToast>
      )}

      {tab === 'plan' ? (
        planExercises.length === 0 && generatedSessionCount === 0 ? (
          <PlannerEmpty title="Nothing in this plan yet" body="Exercises you add appear here so you never double-add." />
        ) : (
          <PlanTabList aria-label="Already in this plan">
            {planExercises.map(row => <li key={row.id}><span>{row.exerciseSlim.name}</span></li>)}
            {generatedSessionCount > 0 && <li><span>Generated program</span><span>{generatedSessionCount} sessions</span></li>}
          </PlanTabList>
        )
      ) : (
        <ExerciseListPane>
          {/* A failed refresh must stay visible even though cached rows render.
              PlannerStateViews has no disabled variant, so retry is withheld
              (undefined) while a fetch is in flight: it can never double-fire. */}
          {libraryState === 'stale' && (
            <PlannerEmpty
              title={LIBRARY_COPY.staleTitle}
              body={exercisesRefreshError || LIBRARY_COPY.staleBody}
              actionLabel={exercisesLoading ? undefined : LIBRARY_COPY.retry}
              onAction={exercisesLoading ? undefined : refreshExercises}
            />
          )}

          {libraryState === 'loading' ? (
            <PlannerSkeleton variant="list" />
          ) : libraryState === 'error' ? (
            <PlannerError
              message={exercisesLoadError || 'The exercise library failed to load.'}
              onRetry={exercisesLoading ? undefined : refreshExercises}
            />
          ) : libraryState === 'empty-catalog' ? (
            <PlannerEmpty
              title={LIBRARY_COPY.emptyCatalogTitle}
              body={LIBRARY_COPY.emptyCatalogBody}
              actionLabel={exercisesLoading ? undefined : LIBRARY_COPY.retry}
              onAction={exercisesLoading ? undefined : refreshExercises}
            />
          ) : libraryState === 'filter-empty' ? (
            <PlannerEmpty
              title="No exercises match this training stack."
              body={LIBRARY_COPY.filterEmptyBody}
              actionLabel={activeFilterCount > 0 ? LIBRARY_COPY.clearFilters : undefined}
              onAction={activeFilterCount > 0 ? act.rolodex.clearRolodexFilters : undefined}
            />
          ) : (
            // `stale` deliberately falls through to the list: a usable cache
            // keeps its rows and the notice above discloses the failure.
            React.createElement(List, {
              defaultHeight: 520,
              rowComponent: exerciseRowRenderer,
              rowCount: filteredExerciseCount,
              rowHeight: ROW_HEIGHT,
              rowProps: {},
              style: LIST_STYLE,
            })
          )}
        </ExerciseListPane>
      )}
    </Panel>
  );
};

export default WorkoutPlannerRolodexPanelV2;
