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
import styled from 'styled-components';
import {
  BODY_PARTS, EQUIPMENT_FILTERS, EXERCISE_TYPES, IMPACT_LEVELS, SOURCE_FILTERS,
} from './WorkoutPlannerFilters';
import {
  Chip, ChipRow, ClearFiltersButton, Panel, PanelHeader, PanelTitle,
  SearchInput, SearchWrapper,
} from './WorkoutPlannerStyles';
import { ExerciseListPane, ResultsCount } from './WorkoutPlannerPage.styles';
import { PlannerEmpty, PlannerSkeleton } from './PlannerStateViews';
import { usePlannerData } from './plannerContexts/PlannerDataContext';
import { usePlannerActions } from './plannerContexts/PlannerActionsContext';

const ROW_HEIGHT = 156;
const LIST_STYLE = { overflowX: 'hidden' as const };
const SEARCH_DEBOUNCE_MS = 150;
const UNDO_WINDOW_MS = 5000;

const HeaderActions = styled.div` display: flex; align-items: center; gap: 8px; `;

const FiltersButton = styled.button`
  min-height: 44px; padding: 0 12px; border-radius: 10px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: transparent; color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const TabRow = styled.div`
  display: flex; gap: 6px; padding: 0 12px 8px;
`;

const TabChip = styled.button<{ $active: boolean }>`
  min-height: 44px; padding: 0 14px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 16%, transparent)' : 'transparent')};
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.76rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const FacetSheet = styled.div`
  display: flex; flex-direction: column; gap: 10px; padding: 10px 12px;
  border-bottom: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
`;

const FacetLabel = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 0.72rem; font-weight: 800;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
`;

const ActiveChipsRow = styled.div` display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 8px; `;

const UndoToast = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin: 8px 12px; padding: 8px 12px; border-radius: 10px;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.78rem;
  button {
    min-height: 44px; padding: 0 14px; border-radius: 8px; cursor: pointer;
    border: none; background: var(--btn-primary-bg, #002060);
    color: var(--world-text, var(--text-primary, #E0ECF4)); font-weight: 800;
    &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
  }
`;

const PlanTabList = styled.ul`
  margin: 0; padding: 8px 12px; list-style: none; display: flex; flex-direction: column; gap: 6px;
  li {
    display: flex; justify-content: space-between; gap: 10px; min-height: 44px; align-items: center;
    padding: 0 10px; border-radius: 10px;
    border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
    color: var(--world-text, var(--text-primary, #E0ECF4));
    font-family: 'Sora', sans-serif; font-size: 0.78rem;
  }
`;

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
  } = data.rolodex;
  const { planExercises, generatedPlan } = data.local;

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
    knownIdsRef.current = new Set(planExercises.map(row => row.id));
    if (added.length !== 1) return undefined; // bulk hydrations are not taps
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
          <ResultsCount>{filteredExerciseCount} results</ResultsCount>
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
          {exercisesLoading ? (
            <PlannerSkeleton variant="list" />
          ) : filteredExerciseCount === 0 ? (
            <PlannerEmpty
              title={activeFilterCount > 0 ? 'No exercises match this training stack.' : 'No exercises available yet.'}
              actionLabel={activeFilterCount > 0 ? 'Clear filters' : undefined}
              onAction={activeFilterCount > 0 ? act.rolodex.clearRolodexFilters : undefined}
            />
          ) : (
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
