import React, { memo, type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, useListRef } from 'react-window';
import ExerciseFilterChips from './ExerciseFilterChips';
import NASMExerciseRolodexPreview from './NASMExerciseRolodexPreview';
import { useExerciseSearch, type ExerciseSlim } from './useExerciseSearch';
import {
  EQUIPMENT_TYPES,
  EXERCISE_TYPES,
  ROW_HEIGHT,
  applyEquipTypeFilters,
  useVisibleRowCount,
} from './NASMExerciseRolodex.helpers';
import RolodexRecentRow from './RolodexRecentRow';
import { readRecentExercises, recordRecentExercise } from './recentExercises';
import {
  EmptyState,
  ExMeta,
  ExName,
  ExerciseRow,
  FilterLabel,
  FilterRows,
  FilterToggle,
  ListContainer,
  ListSide,
  MiniChip,
  MiniChipRow,
  SearchIconStyled,
  SearchInput,
  SearchRow,
  SpinnerIcon,
  SplitView,
  StatusBar,
  TypeBadge,
  Wrapper,
} from './NASMExerciseRolodex.styles';
import {
  matchesSectionContextForTesting as matchesSectionContext,
  type SectionContext,
} from './NASMExerciseRolodex.sectionFilter';

interface NASMExerciseRolodexProps {
  onSelectExercise: (exercise: ExerciseSlim) => void;
  isOpen: boolean;
  onClose: () => void;
  sectionContext?: SectionContext;
}

const NASMExerciseRolodex: React.FC<NASMExerciseRolodexProps> = memo(({
  onSelectExercise,
  isOpen,
  onClose,
  sectionContext,
}) => {
  const {
    results,
    allExercises,
    isSearching,
    isLoading,
    setQuery,
    setCategory,
    query,
    category,
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

  // Slice 10 one-tap recents (catalog = truth; stale ids drop; isOpen dep re-reads storage per open)
  const recentExercises = useMemo(() => {
    if (query || allExercises.length === 0) return [];
    const byId = new Map(allExercises.map(ex => [String(ex.id), ex]));
    return readRecentExercises().map(r => byId.get(r.id)).filter((ex): ex is ExerciseSlim => Boolean(ex));
  }, [query, allExercises, isOpen]);

  const handlePreview = useCallback((exercise: ExerciseSlim, index: number) => {
    setHighlightIndex(index);
    setPreviewExercise(exercise);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex(prev => {
        const next = prev < filteredResults.length - 1 ? prev + 1 : 0;
        listRef.current?.scrollToRow({ index: next, align: 'smart' });
        setPreviewExercise(filteredResults[next] || null);
        return next;
      });
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex(prev => {
        const next = prev > 0 ? prev - 1 : filteredResults.length - 1;
        listRef.current?.scrollToRow({ index: next, align: 'smart' });
        setPreviewExercise(filteredResults[next] || null);
        return next;
      });
    } else if (event.key === 'Enter' && highlightIndex >= 0 && filteredResults[highlightIndex]) {
      event.preventDefault();
      handleSelect(filteredResults[highlightIndex]);
    }
  }, [filteredResults, handleSelect, highlightIndex, listRef, onClose]);

  const RowComponent = useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const ex = filteredResults[index];
    if (!ex) return null;
    return (
      <ExerciseRow
        style={style}
        $highlighted={index === highlightIndex}
        onClick={() => handlePreview(ex, index)}
        onDoubleClick={() => handleSelect(ex)}
        onFocus={() => handlePreview(ex, index)}
        onMouseEnter={() => setPreviewExercise(ex)}
        role="option"
        aria-selected={index === highlightIndex}
      >
        <ExName>{ex.name}</ExName>
        <ExMeta>
          <TypeBadge>{ex.exerciseType || 'exercise'}</TypeBadge>
          {(ex.primaryMuscles || []).slice(0, 3).join(', ')}
        </ExMeta>
      </ExerciseRow>
    );
  }, [filteredResults, handlePreview, handleSelect, highlightIndex]);

  if (!isOpen) return null;

  const activeFilterCount = [equipFilter, typeFilter].filter(Boolean).length;
  const listHeight = Math.min(filteredResults.length, maxVisibleRows) * ROW_HEIGHT;

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
        <FilterRows>
          <FilterLabel>Type:</FilterLabel>
          <MiniChipRow>
            {EXERCISE_TYPES.map(type => (
              <MiniChip
                key={type}
                type="button"
                $active={typeFilter === null ? type === 'All' : typeFilter.toLowerCase() === type.toLowerCase()}
                onClick={() => setTypeFilter(type === 'All' ? null : type)}
              >
                {type}
              </MiniChip>
            ))}
          </MiniChipRow>
          <FilterLabel>Equipment:</FilterLabel>
          <MiniChipRow>
            {EQUIPMENT_TYPES.map(equipment => (
              <MiniChip
                key={equipment}
                type="button"
                $active={equipFilter === null ? equipment === 'All' : equipFilter.toLowerCase() === equipment.toLowerCase()}
                onClick={() => setEquipFilter(equipment === 'All' ? null : equipment)}
              >
                {equipment}
              </MiniChip>
            ))}
          </MiniChipRow>
        </FilterRows>
      )}

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
                style={{ height: listHeight || ROW_HEIGHT }}
                id="exercise-rolodex-list"
                role="listbox"
                aria-label="Exercise search results"
              />
            </ListContainer>
          ) : !isLoading && (
            <EmptyState>
              {query.length >= 1 ? 'No exercises found. Try a different search.' : 'Start typing to search exercises...'}
            </EmptyState>
          )}
        </ListSide>

        {previewExercise && (
          <NASMExerciseRolodexPreview exercise={previewExercise} onSelect={handleSelect} />
        )}
      </SplitView>

      <StatusBar>
        {filteredAllExercises.length} exercises
        {query && ` - ${filteredResults.length} matching`}
        {category && category !== 'All' && ` - ${category}`}
        {sectionContext && sectionContext !== 'main' && ` - ${sectionContext.replace('_', ' ')}`}
        {previewExercise && ` - previewing ${previewExercise.name}`}
      </StatusBar>
    </Wrapper>
  );
});

NASMExerciseRolodex.displayName = 'NASMExerciseRolodex';
export default NASMExerciseRolodex;
