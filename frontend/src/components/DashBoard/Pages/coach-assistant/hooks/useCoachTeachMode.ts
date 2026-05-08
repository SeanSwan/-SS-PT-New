/**
 * ============================================================================
 * FILE: useCoachTeachMode.ts
 * PURPOSE: Manage Teach Mode panel state + exercise search within Coach Assistant
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Manages the right-side Teach Mode panel lifecycle —
 * open/close state, selected exercise, inline exercise search, and phase state.
 * Reuses the shared useExerciseTeachData hook for deep data fetching.
 *
 * HOW IT FITS IN THE APP:
 * SwanCoachAssistantPage → useCoachTeachMode → CoachTeachModePanel
 *   → useExerciseTeachData (shared from features/teach-mode)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import apiService from '../../../../../services/api.service';
import type { ExerciseSlim } from '../../../../WorkoutLogger/exerciseSearchWorker';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export interface CoachTeachModeState {
  isOpen: boolean;
  selectedExercise: ExerciseSlim | null;
  phaseNumber: number;
  searchQuery: string;
  searchResults: ExerciseSlim[];
  isSearching: boolean;
}

export interface CoachTeachModeActions {
  open: (exercise?: ExerciseSlim) => void;
  close: () => void;
  toggle: () => void;
  selectExercise: (exercise: ExerciseSlim) => void;
  setPhaseNumber: (phase: number) => void;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

export type UseCoachTeachModeReturn = CoachTeachModeState & CoachTeachModeActions;

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useCoachTeachMode(): UseCoachTeachModeReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSlim | null>(null);
  const [phaseNumber, setPhaseNumber] = useState(2); // Default: Strength Endurance
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseSlim[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  // Debounced exercise search against API
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const { data: body } = await apiService.get<{ exercises?: Record<string, unknown>[] }>(
          '/api/exercises',
          {
            params: { search: searchQuery.trim(), limit: 12 },
            signal: abortRef.current.signal,
          },
        );
        const exercises: ExerciseSlim[] = (body.exercises || []).map((ex: Record<string, unknown>) => ({
          id: String(ex.id ?? ''),
          name: String(ex.name ?? ''),
          exerciseKey: String(ex.exercise_key ?? ex.exerciseKey ?? ''),
          exerciseType: String(ex.exerciseType ?? ''),
          bodyPartCategory: String(ex.bodyPartCategory ?? ''),
          primaryMuscles: Array.isArray(ex.primaryMuscles)
            ? ex.primaryMuscles.map(String)
            : typeof ex.primaryMuscles === 'string'
              ? [ex.primaryMuscles]
              : [],
          difficulty: Number(ex.difficulty ?? 300),
          equipment: Array.isArray(ex.equipment) ? ex.equipment.map(String)
            : Array.isArray(ex.equipmentNeeded) ? ex.equipmentNeeded.map(String) : [],
          source: String(ex.source ?? ''),
        }));
        setSearchResults(exercises);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Cleanup abort controller on unmount
  useEffect(() => () => {
    if (abortRef.current) abortRef.current.abort();
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  }, []);

  const open = useCallback((exercise?: ExerciseSlim) => {
    setIsOpen(true);
    if (exercise) setSelectedExercise(exercise);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const selectExercise = useCallback((exercise: ExerciseSlim) => {
    setSelectedExercise(exercise);
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  return {
    isOpen,
    selectedExercise,
    phaseNumber,
    searchQuery,
    searchResults,
    isSearching,
    open,
    close,
    toggle,
    selectExercise,
    setPhaseNumber,
    setSearchQuery,
    clearSearch,
  };
}
