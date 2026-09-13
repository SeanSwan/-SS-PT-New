/**
 * NASMExerciseRolodex list rendering + keyboard navigation (S04)
 * ==============================================================
 * Extracted from NASMExerciseRolodex.tsx to keep the component inside the
 * project's 300-line cap (locked by NASMExerciseRolodex.touchTarget.test.ts).
 *
 * KEY DECISION — data flows through the closure, not react-window rowProps:
 *   `rowComponent` is built by a hook and closes over the current results, so
 *   it still works with list implementations (and test doubles) that call it
 *   with only { index, style }. Passing results through `rowProps` would break
 *   those callers, so that refactor was deliberately NOT taken.
 */

import React, { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import type { ExerciseSlim } from './useExerciseSearch';
// S04 remainder: the logger's own rows had no compact thumbnail. The variant already existed and its
// only caller was inside PlannerMediaThumb, so this wires the component that lives beside this file.
import ExerciseMediaPreview from './ExerciseMediaPreview';
import {
  ExMeta,
  ExName,
  ExerciseRow,
  TypeBadge,
} from './NASMExerciseRolodex.styles';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

export interface UseExerciseSearchRowArgs {
  results: ExerciseSlim[];
  highlightIndex: number;
  onPreview: (exercise: ExerciseSlim, index: number) => void;
  onSelect: (exercise: ExerciseSlim) => void;
}

/** Virtualized row renderer for the exercise result list. */
export function useExerciseSearchRow({
  results,
  highlightIndex,
  onPreview,
  onSelect,
}: UseExerciseSearchRowArgs) {
  return useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const exercise = results[index];
    if (!exercise) return null;
    return (
      <ExerciseRow
        {...reactWindowStyleProps(style)}
        $highlighted={index === highlightIndex}
        onClick={() => onPreview(exercise, index)}
        onDoubleClick={() => onSelect(exercise)}
        onFocus={() => onPreview(exercise, index)}
        onMouseEnter={() => onPreview(exercise, index)}
        role="option"
        aria-selected={index === highlightIndex}
      >
        {/* Decorative: the row is role="option", so its accessible name must be the exercise name -
            a screen reader announcing a media placeholder before every exercise would be a defect. */}
        <ExerciseMediaPreview exercise={exercise} variant="thumbnail" aria-hidden="true" />
        <ExName data-testid="exercise-row-name">{exercise.name}</ExName>
        <ExMeta>
          <TypeBadge>{exercise.exerciseType || 'exercise'}</TypeBadge>
          {(exercise.primaryMuscles || []).slice(0, 3).join(', ')}
        </ExMeta>
      </ExerciseRow>
    );
  }, [results, highlightIndex, onPreview, onSelect]);
}

export interface RolodexScrollRef {
  /**
   * react-window's ListImperativeAPI is passed straight through. It is typed
   * structurally here so this module does not depend on react-window's own
   * generic types, and so the existing `useListRef()` object assigns without a
   * cast at the call site.
   */
  current?: { scrollToRow: (args: any) => void } | null;
}

export interface UseRolodexListNavigationArgs {
  results: ExerciseSlim[];
  highlightIndex: number;
  listRef: RolodexScrollRef;
  onSelect: (exercise: ExerciseSlim) => void;
  onClose: () => void;
  setHighlightIndex: React.Dispatch<React.SetStateAction<number>>;
  setPreviewExercise: (exercise: ExerciseSlim | null) => void;
}

/** Escape / ArrowUp / ArrowDown / Enter over the result list. */
export function useRolodexListNavigation({
  results,
  highlightIndex,
  listRef,
  onSelect,
  onClose,
  setHighlightIndex,
  setPreviewExercise,
}: UseRolodexListNavigationArgs) {
  // Hostile-review finding 12: the arrow handlers must not read `highlightIndex`
  // from the closure. Two ArrowDown keydowns dispatched inside ONE batch would
  // both compute from the same render-time value and the second would overwrite
  // the first, losing an increment. A ref keeps the running value, so the handlers
  // stay correct under batching AND still pass plain VALUES to both setters — the
  // preview write is not pushed back inside an updater (which is what the earlier
  // purity fix removed).
  const highlightRef = useRef(highlightIndex);
  useEffect(() => { highlightRef.current = highlightIndex; }, [highlightIndex]);

  return useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const from = highlightRef.current;
      const next = from < results.length - 1 ? from + 1 : 0;
      highlightRef.current = next;
      listRef.current?.scrollToRow({ index: next, align: 'smart' });
      setHighlightIndex(next);
      setPreviewExercise(results[next] || null);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const from = highlightRef.current;
      const next = from > 0 ? from - 1 : results.length - 1;
      highlightRef.current = next;
      listRef.current?.scrollToRow({ index: next, align: 'smart' });
      setHighlightIndex(next);
      setPreviewExercise(results[next] || null);
    } else if (event.key === 'Enter' && highlightIndex >= 0 && results[highlightIndex]) {
      event.preventDefault();
      onSelect(results[highlightIndex]);
    }
  }, [results, highlightIndex, listRef, onSelect, onClose, setHighlightIndex, setPreviewExercise]);
}
