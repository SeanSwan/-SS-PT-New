/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  SUB-COMPONENT: NASMExerciseRolodex                          ║
 * ║  PARENT: WorkoutLogger                                       ║
 * ║  PURPOSE: Virtualized exercise search + filter dropdown       ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-20        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────┐
 * │ [🔍 Search exercises...              ]     │
 * │ [All] [Chest] [Back] [Arms] [Legs] ...     │
 * │ ┌──────────────────────────────────────┐   │
 * │ │ ▸ Barbell Bench Press               │   │ ← react-window
 * │ │   compound · Chest, Triceps          │   │   virtualized
 * │ │ ▸ Dumbbell Fly                      │   │   (44px rows)
 * │ │   isolation · Chest                  │   │
 * │ │ ▸ Cable Crossover                   │   │
 * │ │   ...                               │   │
 * │ └──────────────────────────────────────┘   │
 * │ 59 exercises · 12 matching                 │
 * └────────────────────────────────────────────┘
 *
 * Props: { onSelectExercise, isOpen, onClose }
 */

import React, { memo, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { List } from 'react-window';
import { Search, Loader } from 'lucide-react';
import { CS, withAlpha } from './WorkoutLoggerCS';
import ExerciseFilterChips from './ExerciseFilterChips';
import { useExerciseSearch, type ExerciseSlim } from './useExerciseSearch';

// ─── Types ──────────────────────────────────────────────────

interface NASMExerciseRolodexProps {
  /** Called when user picks an exercise */
  onSelectExercise: (exercise: ExerciseSlim) => void;
  /** Controls dropdown visibility */
  isOpen: boolean;
  /** Close the dropdown */
  onClose: () => void;
}

// ─── Constants ──────────────────────────────────────────────

const ROW_HEIGHT = 56;
const MAX_VISIBLE_ROWS = 6;

// ─── Component ──────────────────────────────────────────────

const NASMExerciseRolodex: React.FC<NASMExerciseRolodexProps> = memo(({
  onSelectExercise,
  isOpen,
  onClose,
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
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);

  // ── Category counts (memoized) ──
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allExercises.length };
    for (const ex of allExercises) {
      const cat = ex.bodyPartCategory || 'Full Body';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [allExercises]);

  // ── Focus input when opened ──
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setHighlightIndex(-1);
    }
  }, [isOpen]);

  // ── Click outside to close ──
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  // ── Keyboard navigation ──
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => {
        const next = prev < results.length - 1 ? prev + 1 : 0;
        listRef.current?.scrollToItem(next, 'smart');
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => {
        const next = prev > 0 ? prev - 1 : results.length - 1;
        listRef.current?.scrollToItem(next, 'smart');
        return next;
      });
    } else if (e.key === 'Enter' && highlightIndex >= 0 && results[highlightIndex]) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    }
  }, [results, highlightIndex, onClose]);

  const handleSelect = useCallback((exercise: ExerciseSlim) => {
    onSelectExercise(exercise);
    setQuery('');
    onClose();
  }, [onSelectExercise, setQuery, onClose]);

  // ── Row renderer for react-window ──
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const ex = results[index];
    if (!ex) return null;
    return (
      <ExerciseRow
        style={style}
        $highlighted={index === highlightIndex}
        onClick={() => handleSelect(ex)}
        role="option"
        aria-selected={index === highlightIndex}
      >
        <ExName>{ex.name}</ExName>
        <ExMeta>
          <TypeBadge>{ex.exerciseType || 'exercise'}</TypeBadge>
          {(ex.primaryMuscles || []).join(', ')}
        </ExMeta>
      </ExerciseRow>
    );
  }, [results, highlightIndex, handleSelect]);

  if (!isOpen) return null;

  const listHeight = Math.min(results.length, MAX_VISIBLE_ROWS) * ROW_HEIGHT;

  return (
    <Wrapper ref={wrapperRef}>
      {/* Search Input */}
      <SearchRow>
        <SearchIconStyled size={16} />
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Search exercises by name, type, or muscle\u2026"
          autoComplete="off"
          aria-label="Search exercises"
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="exercise-rolodex-list"
        />
        {(isSearching || isLoading) && <SpinnerIcon size={16} />}
      </SearchRow>

      {/* Filter Chips */}
      <ExerciseFilterChips
        activeCategory={category}
        onCategoryChange={setCategory}
        categoryCounts={categoryCounts}
      />

      {/* Virtualized Results */}
      {results.length > 0 ? (
        <ListContainer>
          <List
            ref={listRef}
            height={listHeight || ROW_HEIGHT}
            itemCount={results.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            id="exercise-rolodex-list"
            role="listbox"
            aria-label="Exercise search results"
          >
            {Row}
          </List>
        </ListContainer>
      ) : !isLoading && (
        <EmptyState>
          {query.length >= 1
            ? 'No exercises found. Try a different search.'
            : 'Start typing to search exercises...'}
        </EmptyState>
      )}

      {/* Status Bar */}
      <StatusBar>
        {allExercises.length} exercises
        {query && ` · ${results.length} matching`}
        {category && category !== 'All' && ` · ${category}`}
      </StatusBar>
    </Wrapper>
  );
});

NASMExerciseRolodex.displayName = 'NASMExerciseRolodex';
export default NASMExerciseRolodex;

// ── Styled Components ──────────────────────────────────────

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

const Wrapper = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(0, 24, 72, 0.96);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid ${CS.border};
  border-radius: 1rem;
  padding: 12px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 40px ${withAlpha(CS.glow, 0.06)};
  animation: ${slideDown} 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const SearchRow = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 4px;
`;

const SearchIconStyled = styled(Search)`
  position: absolute;
  left: 12px;
  color: ${CS.gaming};
  pointer-events: none;
  z-index: 1;
`;

const SpinnerIcon = styled(Loader)`
  position: absolute;
  right: 12px;
  color: ${CS.gaming};
  animation: ${spin} 0.8s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 1.5s;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 10px 40px 10px 38px;
  border-radius: 0.75rem;
  border: 1.5px solid ${CS.glassBorder};
  background: ${CS.inputBg};
  color: ${CS.text};
  font-size: 0.9rem;
  font-family: 'Sora', sans-serif;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus {
    outline: none;
    border-color: ${CS.glow};
    box-shadow: 0 0 0 3px ${withAlpha(CS.glow, 0.15)};
  }

  &::placeholder {
    color: rgba(224, 236, 244, 0.4);
  }
`;

const ListContainer = styled.div`
  border-radius: 0.5rem;
  overflow: hidden;

  /* Custom scrollbar for the react-window list */
  & > div {
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: ${withAlpha(CS.glow, 0.25)};
      border-radius: 3px;
    }
  }
`;

const ExerciseRow = styled.div<{ $highlighted: boolean }>`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 0 14px;
  cursor: pointer;
  transition: background 0.12s;
  background: ${({ $highlighted }) =>
    $highlighted ? withAlpha(CS.glow, 0.12) : 'transparent'};
  border-left: 3px solid ${({ $highlighted }) =>
    $highlighted ? CS.glow : 'transparent'};

  &:hover {
    background: ${withAlpha(CS.glow, 0.08)};
    border-left-color: ${withAlpha(CS.glow, 0.4)};
  }
`;

const ExName = styled.span`
  color: ${CS.text};
  font-size: 0.88rem;
  font-weight: 600;
  font-family: 'Plus Jakarta Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ExMeta = styled.span`
  color: ${CS.textSecondary};
  font-size: 0.8rem;
  font-family: 'Sora', sans-serif;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 1px 7px;
  border-radius: 1rem;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${withAlpha(CS.glow, 0.12)};
  color: ${CS.glowLight};
  border: 1px solid ${withAlpha(CS.glow, 0.2)};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  padding: 20px 14px;
  text-align: center;
  color: ${CS.textSecondary};
  font-size: 0.85rem;
  font-family: 'Sora', sans-serif;
`;

const StatusBar = styled.div`
  padding: 6px 8px 0;
  font-size: 0.7rem;
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  color: ${withAlpha(CS.textSecondary, 0.6)};
  text-align: right;
`;
