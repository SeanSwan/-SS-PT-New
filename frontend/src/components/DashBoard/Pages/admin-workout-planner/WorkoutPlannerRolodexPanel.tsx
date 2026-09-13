/**
 * COMPONENT: WorkoutPlannerRolodexPanel
 * PURPOSE: Renders exercise search, filters, and virtualized exercise results.
 *
 * Runtime flow: WorkoutPlannerPage owns search/filter state and the row
 * renderer; this panel keeps the left rail UI out of the planner shell.
 */

import React from 'react';
import { List } from 'react-window';
import { Search } from 'lucide-react';
import {
  BODY_PARTS,
  EQUIPMENT_FILTERS,
  EXERCISE_TYPES,
  IMPACT_LEVELS,
  SOURCE_FILTERS,
} from './WorkoutPlannerFilters';
import {
  Chip,
  ChipRow,
  ClearFiltersButton,
  EmptyMessage,
  Panel,
  PanelHeader,
  PanelTitle,
  RolodexStatusRail,
  RolodexStatusText,
  SearchInput,
  SearchWrapper,
  SkeletonBlock,
} from './WorkoutPlannerStyles';
import {
  ExerciseListPane,
  FiltersPane,
  ResultsCount,
} from './WorkoutPlannerPage.styles';
import {
  LIBRARY_COPY,
  resolveLibraryState,
} from '../../../WorkoutLogger/exerciseSearchLibraryState';
import type { ExerciseSearchLoadState } from '../../../WorkoutLogger/useExerciseSearch';

const WORKOUT_PLANNER_ROW_HEIGHT = 156;
const VIRTUAL_LIST_STYLE = { overflowX: 'hidden' as const };

type ExerciseRowRenderer = (props: {
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  index: number;
  style: React.CSSProperties;
}) => React.ReactElement | null;

interface WorkoutPlannerRolodexPanelProps {
  filteredExerciseCount: number;
  activeFilterCount: number;
  exercisesLoading: boolean;
  searchQuery: string;
  filterCategory: string | null;
  sourceFilter: string | null;
  exerciseTypeFilter: string | null;
  equipmentFilter: string | null;
  impactFilter: string | null;
  exerciseRowRenderer: ExerciseRowRenderer;
  /** S04 recovery state. Optional so existing callers keep compiling. */
  exercisesLoadState?: ExerciseSearchLoadState;
  exercisesLoadError?: string | null;
  exercisesRefreshError?: string | null;
  exerciseCatalogCount?: number;
  exercisesSearching?: boolean;
  onRetryExercises?: () => void;
  onSearchQueryChange: (value: string) => void;
  onFilterCategoryChange: (value: string | null) => void;
  onSourceFilterChange: (value: string | null) => void;
  onExerciseTypeFilterChange: (value: string | null) => void;
  onEquipmentFilterChange: (value: string | null) => void;
  onImpactFilterChange: (value: string | null) => void;
  onClearFilters: () => void;
}

const WorkoutPlannerRolodexPanel: React.FC<WorkoutPlannerRolodexPanelProps> = ({
  filteredExerciseCount,
  activeFilterCount,
  exercisesLoading,
  searchQuery,
  filterCategory,
  sourceFilter,
  exerciseTypeFilter,
  equipmentFilter,
  impactFilter,
  exerciseRowRenderer,
  exercisesLoadState,
  exercisesLoadError,
  exerciseCatalogCount,
  exercisesSearching = false,
  onRetryExercises,
  onSearchQueryChange,
  onFilterCategoryChange,
  onSourceFilterChange,
  onExerciseTypeFilterChange,
  onEquipmentFilterChange,
  onImpactFilterChange,
  onClearFilters,
}) => {
  const hasActiveFilters = activeFilterCount > 0;
  const libraryState = resolveLibraryState({
    loadState: exercisesLoadState,
    isLoading: exercisesLoading,
    catalogCount: exerciseCatalogCount ?? filteredExerciseCount,
    resultCount: filteredExerciseCount,
  });

  const retryButton = onRetryExercises ? (
    <ClearFiltersButton
      type="button"
      onClick={onRetryExercises}
      disabled={exercisesLoading}
      aria-busy={exercisesLoading}
      aria-label="Reload the exercise library"
      data-testid="planner-rolodex-retry"
    >
      {exercisesLoading ? LIBRARY_COPY.retryBusy : LIBRARY_COPY.retry}
    </ClearFiltersButton>
  ) : null;

  const clearFiltersButton = (
    <ClearFiltersButton type="button" onClick={onClearFilters} aria-label="Clear Exercise Rolodex filters">
      Clear filters
    </ClearFiltersButton>
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle><Search size={16} /> Exercise Rolodex</PanelTitle>
        <ResultsCount>
          {filteredExerciseCount} results
        </ResultsCount>
      </PanelHeader>
      <FiltersPane>
        <SearchWrapper>
          <Search size={14} />
          <SearchInput
            value={searchQuery}
            onChange={event => onSearchQueryChange(event.target.value)}
            placeholder="Search exercises..."
            aria-label="Search exercises"
          />
        </SearchWrapper>
        <ChipRow>
          {BODY_PARTS.map(bodyPart => (
            <Chip
              type="button"
              key={bodyPart}
              $active={filterCategory === null ? bodyPart === 'All' : filterCategory === bodyPart}
              onClick={() => onFilterCategoryChange(bodyPart === 'All' ? null : bodyPart)}
            >
              {bodyPart}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {SOURCE_FILTERS.map(source => (
            <Chip
              type="button"
              key={source}
              $active={sourceFilter === null ? source === 'All Programs' : sourceFilter === source.toLowerCase()}
              onClick={() => onSourceFilterChange(source === 'All Programs' ? null : source.toLowerCase())}
            >
              {source}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EXERCISE_TYPES.map(exerciseType => (
            <Chip
              type="button"
              key={exerciseType}
              $active={exerciseTypeFilter === null ? exerciseType === 'All Types' : exerciseTypeFilter === exerciseType.toLowerCase()}
              onClick={() => onExerciseTypeFilterChange(exerciseType === 'All Types' ? null : exerciseType.toLowerCase())}
            >
              {exerciseType}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {EQUIPMENT_FILTERS.map(equipment => (
            <Chip
              type="button"
              key={equipment}
              $active={equipmentFilter === null ? equipment === 'All Equipment' : equipmentFilter === equipment.toLowerCase()}
              onClick={() => onEquipmentFilterChange(equipment === 'All Equipment' ? null : equipment.toLowerCase())}
            >
              {equipment}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {IMPACT_LEVELS.map(impact => (
            <Chip
              type="button"
              key={impact}
              $active={impactFilter === null ? impact === 'All Impact' : impactFilter === impact}
              onClick={() => onImpactFilterChange(impact === 'All Impact' ? null : impact)}
            >
              {impact}
            </Chip>
          ))}
        </ChipRow>
      </FiltersPane>
      <RolodexStatusRail aria-busy={exercisesSearching} data-testid="planner-rolodex-status">
        <RolodexStatusText>
          {exercisesSearching
            ? LIBRARY_COPY.searchPending
            : hasActiveFilters
              ? `${activeFilterCount} active filter${activeFilterCount === 1 ? '' : 's'} shaping this pool`
              : 'Browsing the full exercise library'}
        </RolodexStatusText>
        {/* The filter-empty notice below already offers this action; never
            render two identically-labelled controls at the same time. */}
        {hasActiveFilters && libraryState !== 'filter-empty' && clearFiltersButton}
      </RolodexStatusRail>
      <ExerciseListPane>
        {/* A failed refresh must stay visible even though cached rows render. */}
        {libraryState === 'stale' && (
          <RolodexStatusRail role="status" aria-live="polite" data-testid="planner-rolodex-stale">
            <RolodexStatusText>{LIBRARY_COPY.staleTitle}</RolodexStatusText>
            {retryButton}
          </RolodexStatusRail>
        )}

        {libraryState === 'loading' ? (
          <>
            <RolodexStatusRail role="status" aria-live="polite">
              <RolodexStatusText>{LIBRARY_COPY.loading}</RolodexStatusText>
            </RolodexStatusRail>
            {Array.from({ length: 6 }, (_, index) => <SkeletonBlock key={index} />)}
          </>
        ) : libraryState === 'error' ? (
          <EmptyMessage role="alert" data-testid="planner-rolodex-error">
            <strong>{LIBRARY_COPY.errorTitle}</strong>
            <span>{exercisesLoadError || LIBRARY_COPY.emptyCatalogBody}</span>
            {retryButton}
          </EmptyMessage>
        ) : libraryState === 'empty-catalog' ? (
          <EmptyMessage data-testid="planner-rolodex-empty-catalog">
            <strong>{LIBRARY_COPY.emptyCatalogTitle}</strong>
            <span>{LIBRARY_COPY.emptyCatalogBody}</span>
            {retryButton}
          </EmptyMessage>
        ) : libraryState === 'filter-empty' ? (
          <EmptyMessage data-testid="planner-rolodex-filter-empty">
            {hasActiveFilters ? 'No exercises match this training stack.' : LIBRARY_COPY.filterEmptyBody}
            {hasActiveFilters && clearFiltersButton}
          </EmptyMessage>
        ) : (
          React.createElement(List, {
            defaultHeight: 520,
            rowComponent: exerciseRowRenderer,
            rowCount: filteredExerciseCount,
            rowHeight: WORKOUT_PLANNER_ROW_HEIGHT,
            rowProps: {},
            style: VIRTUAL_LIST_STYLE,
          })
        )}
      </ExerciseListPane>
    </Panel>
  );
};

export default WorkoutPlannerRolodexPanel;
