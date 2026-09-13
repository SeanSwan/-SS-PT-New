import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, useListRef } from 'react-window';
import ExerciseFilterChips from './ExerciseFilterChips';
import NASMExerciseRolodexPreview from './NASMExerciseRolodexPreview';
import { useExerciseSearch, type ExerciseSlim } from './useExerciseSearch';
import {
  ROW_HEIGHT,
  applyEquipTypeFilters,
  useVisibleRowCount,
} from './NASMExerciseRolodex.helpers';
import RolodexRecentRow from './RolodexRecentRow';
import RolodexFilterRows from './RolodexFilterRows';
import useRolodexDeepLink from './useRolodexDeepLink';
import { readRecentExercises, recordRecentExercise } from './recentExercises';
import {
  RolodexLibraryNotice,
  RolodexStatusText,
  resolveLibraryState,
  type RolodexLibraryState,
} from './NASMExerciseRolodex.states';
import {
  useExerciseSearchRow,
  useRolodexListNavigation,
} from './NASMExerciseRolodex.list';
import {
  FilterToggle,
  ListContainer,
  ListSide,
  SearchIconStyled,
  SearchInput,
  SearchRow,
  SpinnerIcon,
  SplitView,
  StatusBar,
  Wrapper,
} from './NASMExerciseRolodex.styles';
import {
  matchesSectionContextForTesting as matchesSectionContext,
  type SectionContext,
} from './NASMExerciseRolodex.sectionFilter';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

interface NASMExerciseRolodexProps {
  onSelectExercise: (exercise: ExerciseSlim) => void;
  isOpen: boolean;
  onClose: () => void;
  sectionContext?: SectionContext;
  /** Slice 11 deep-link: prefill the search (e.g. ?exercise= from /progress). */
  initialQuery?: string | null;
  /** Auto-select when a result matches initialQuery exactly (once per open). */
  autoSelectExact?: boolean;
}

const NASMExerciseRolodex: React.FC<NASMExerciseRolodexProps> = memo(({
  onSelectExercise,
  isOpen,
  onClose,
  sectionContext,
  initialQuery = null,
  autoSelectExact = false,
}) => {
  const {
    results,
    allExercises,
    isSearching,
    isLoading,
    loadError,
    loadState,
    refreshError,
    setQuery,
    setCategory,
    query,
    category,
    refresh,
  } = useExerciseSearch();
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [previewExercise, setPreviewExercise] = useState<ExerciseSlim | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [equipFilter, setEquipFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useListRef();
  const maxVisibleRows = useVisibleRowCount();

  const sectionFiltered = useMemo(() => (
    !sectionContext || sectionContext === 'main'
      ? results
      : results.filter(ex => matchesSectionContext(ex, sectionContext))
  ), [results, sectionContext]);

  const filteredResults = useMemo(
    () => applyEquipTypeFilters(sectionFiltered, typeFilter, equipFilter),
    [sectionFiltered, typeFilter, equipFilter],
  );

  const filteredAllExercises = useMemo(() => (
    !sectionContext || sectionContext === 'main'
      ? allExercises
      : allExercises.filter(ex => matchesSectionContext(ex, sectionContext))
  ), [allExercises, sectionContext]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: filteredAllExercises.length };
    for (const ex of filteredAllExercises) {
      const cat = ex.bodyPartCategory || 'Full Body';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [filteredAllExercises]);

  useEffect(() => {
    if (!isOpen) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    setHighlightIndex(-1);
    setPreviewExercise(null);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    // F7 (hostile review findings 3+4): PREVIEW row 0, HIGHLIGHT none.
    // preview: mobile has no hover, so an at-a-glance preview is a real
    //   affordance (media contract test) and the pane has its own Add button.
    // highlight: -1, because Enter requires `highlightIndex >= 0`. Selecting row 0
    //   made a bare Enter in the SEARCH INPUT commit filteredResults[0] with zero
    //   typing. Corrected claim (review finding 8): this did NOT affect
    //   useRolodexDeepLink, which never reads highlightIndex.
    setHighlightIndex(-1);
    setPreviewExercise(filteredResults[0] || null);
  }, [filteredResults, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  const handleSelect = useCallback((exercise: ExerciseSlim) => {
    recordRecentExercise(exercise);
    onSelectExercise(exercise);
    setQuery('');
    onClose();
  }, [onSelectExercise, setQuery, onClose]);

  // Recovery action for "no exercises match current filters" — clears the
  // filters only. It never adds, saves or selects anything.
  const handleClearFilters = useCallback(() => {
    setQuery('');
    setCategory(null);
    setTypeFilter(null);
    setEquipFilter(null);
  }, [setQuery, setCategory]);

  // Slice 10 one-tap recents (catalog = truth; stale ids drop; isOpen dep re-reads storage per open)
  const recentExercises = useMemo(() => {
    if (query || allExercises.length === 0) return [];
    const byId = new Map(allExercises.map(ex => [String(ex.id), ex]));
    return readRecentExercises().map(r => byId.get(r.id)).filter((ex): ex is ExerciseSlim => Boolean(ex));
  }, [query, allExercises]);

  useRolodexDeepLink({
    isOpen, initialQuery, autoSelectExact,
    results: filteredResults, setQuery, onExactMatch: handleSelect,
  });

  const handlePreview = useCallback((exercise: ExerciseSlim, index: number) => {
    setHighlightIndex(index);
    setPreviewExercise(exercise);
  }, []);

  const handleKeyDown = useRolodexListNavigation({
    results: filteredResults,
    highlightIndex,
    listRef,
    onSelect: handleSelect,
    onClose,
    setHighlightIndex,
    setPreviewExercise,
  });

  const RowComponent = useExerciseSearchRow({
    results: filteredResults,
    highlightIndex,
    onPreview: handlePreview,
    onSelect: handleSelect,
  });

  if (!isOpen) return null;

  const activeFilterCount = [equipFilter, typeFilter].filter(Boolean).length;
  const listHeight = Math.min(filteredResults.length, maxVisibleRows) * ROW_HEIGHT;
  const hasActiveFilters = activeFilterCount > 0
    || Boolean(query)
    || Boolean(category && category !== 'All');
  const libraryState = resolveLibraryState({
    loadState,
    isLoading,
    catalogCount: filteredAllExercises.length,
    resultCount: filteredResults.length,
  });

  const renderNotice = (state: RolodexLibraryState) => (
    <RolodexLibraryNotice
      state={state} loadError={loadError} refreshError={refreshError}
      hasActiveFilters={hasActiveFilters} isBusy={isLoading}
      onRetry={refresh} onClearFilters={handleClearFilters}
    />
  );

  return (
    <Wrapper ref={wrapperRef}>
      <SearchRow>
        <SearchIconStyled size={16} />
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHighlightIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search exercises by name, type, or muscle..."
          autoComplete="off"
          aria-label="Search exercises"
          role="combobox"
          aria-expanded={filteredResults.length > 0}
          aria-controls="exercise-rolodex-list"
        />
        {(isSearching || isLoading) && <SpinnerIcon size={16} />}
      </SearchRow>

      <RolodexRecentRow recents={recentExercises} onPick={handleSelect} />
      <ExerciseFilterChips
        activeCategory={category}
        onCategoryChange={setCategory}
        categoryCounts={categoryCounts}
      />

      <FilterToggle type="button" onClick={() => setShowFilters(!showFilters)}>
        {showFilters ? 'Hide Filters' : 'More Filters'}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
      </FilterToggle>

      {showFilters && (
        <RolodexFilterRows
          typeFilter={typeFilter}
          equipFilter={equipFilter}
          onTypeChange={setTypeFilter}
          onEquipChange={setEquipFilter}
        />
      )}

      {/* A failed refresh must stay visible even though cached rows render. */}
      {libraryState === 'stale' && renderNotice('stale')}

      <SplitView $hasPreview={!!previewExercise}>
        <ListSide>
          {filteredResults.length > 0 ? (
            <ListContainer>
              <List
                listRef={listRef as any}
                rowComponent={RowComponent as any}
                rowCount={filteredResults.length}
                rowHeight={ROW_HEIGHT}
                rowProps={{} as any}
                {...reactWindowStyleProps({ height: listHeight || ROW_HEIGHT })}
                id="exercise-rolodex-list"
                role="listbox"
                aria-label="Exercise search results"
              />
            </ListContainer>
          ) : libraryState === 'stale' ? null : renderNotice(libraryState)}
        </ListSide>

        {previewExercise && (
          <NASMExerciseRolodexPreview exercise={previewExercise} onSelect={handleSelect} />
        )}
      </SplitView>

      <StatusBar>
        <RolodexStatusText
          catalogCount={filteredAllExercises.length}
          resultCount={filteredResults.length}
          query={query}
          isSearching={isSearching}
          hasPendingSearch={isSearching}
        />
        {category && category !== 'All' && ` - ${category}`}
        {sectionContext && sectionContext !== 'main' && ` - ${sectionContext.replace('_', ' ')}`}
        {previewExercise && ` - previewing ${previewExercise.name}`}
      </StatusBar>
    </Wrapper>
  );
});

NASMExerciseRolodex.displayName = 'NASMExerciseRolodex';
export default NASMExerciseRolodex;
