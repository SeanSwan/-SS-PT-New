/**
 * useSwanExercisePicker (Phase 2.3a)
 * ==================================
 * The shared picker's brain: wraps the EXISTING useExerciseSearch
 * (worker-backed fetch + fuzzy text search — never reimplemented) and
 * adds the family contract on top:
 *   - 300ms query debounce (the worker is fast; the debounce keeps the
 *     virtual list from thrashing on every keystroke)
 *   - local type/muscle/equipment filter state
 *   - the pure applySwanPickerFilters pipeline (excludeIds dedupe etc.)
 *   - persistence strategies: ephemeral (default) | session | url
 *
 * Persistence: 'session' survives in-app navigation within the tab;
 * 'url' makes a filtered view shareable/refresh-proof via replaceState
 * (no navigation, no history spam). Both require a persistKey namespace.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useExerciseSearch } from '../../WorkoutLogger/useExerciseSearch';
import { applySwanPickerFilters } from './filters';
import type { ExerciseSlim, SwanExercisePickerOptions } from './types';

const DEBOUNCE_MS = 300;

interface PersistedState {
  q?: string;
  type?: string;
  muscle?: string;
  equip?: string;
}

const sessionKey = (persistKey: string) => `swan-picker:${persistKey}`;
const urlParam = (persistKey: string, field: string) => `spk_${persistKey}_${field}`;

function readPersisted(opts: SwanExercisePickerOptions): PersistedState {
  const { persistence = 'ephemeral', persistKey } = opts;
  if (!persistKey || persistence === 'ephemeral' || typeof window === 'undefined') return {};
  try {
    if (persistence === 'session') {
      const raw = window.sessionStorage.getItem(sessionKey(persistKey));
      return raw ? (JSON.parse(raw) as PersistedState) : {};
    }
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get(urlParam(persistKey, 'q')) ?? undefined,
      type: params.get(urlParam(persistKey, 'type')) ?? undefined,
      muscle: params.get(urlParam(persistKey, 'muscle')) ?? undefined,
      equip: params.get(urlParam(persistKey, 'equip')) ?? undefined,
    };
  } catch {
    return {};
  }
}

function writePersisted(opts: SwanExercisePickerOptions, state: PersistedState): void {
  const { persistence = 'ephemeral', persistKey } = opts;
  if (!persistKey || persistence === 'ephemeral' || typeof window === 'undefined') return;
  try {
    if (persistence === 'session') {
      window.sessionStorage.setItem(sessionKey(persistKey), JSON.stringify(state));
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const fields: Array<[string, string | undefined]> = [
      ['q', state.q], ['type', state.type], ['muscle', state.muscle], ['equip', state.equip],
    ];
    for (const [field, value] of fields) {
      const name = urlParam(persistKey, field);
      if (value) params.set(name, value);
      else params.delete(name);
    }
    const search = params.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`,
    );
  } catch {
    /* persistence is best-effort — never break the picker over storage */
  }
}

export interface UseSwanExercisePickerReturn {
  /** Immediate input echo (controlled input); commits to search after 300ms. */
  inputValue: string;
  onInputChange: (value: string) => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  muscleFilter: string;
  setMuscleFilter: (value: string) => void;
  equipFilter: string;
  setEquipFilter: (value: string) => void;
  /** Post-pipeline rows the list renders. */
  visible: ExerciseSlim[];
  /** Full library size (truthful "N of M" count line). */
  totalCount: number;
  isLoading: boolean;
  isSearching: boolean;
}

export function useSwanExercisePicker(opts: SwanExercisePickerOptions): UseSwanExercisePickerReturn {
  const search = useExerciseSearch();
  const initial = useRef<PersistedState | null>(null);
  if (initial.current === null) initial.current = readPersisted(opts);

  const [inputValue, setInputValue] = useState(initial.current.q ?? '');
  const [typeFilter, setTypeFilter] = useState(initial.current.type ?? '');
  const [muscleFilter, setMuscleFilter] = useState(initial.current.muscle ?? '');
  const [equipFilter, setEquipFilter] = useState(initial.current.equip ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setQueryRef = useRef(search.setQuery);
  setQueryRef.current = search.setQuery;

  // Commit the query into the worker hook 300ms after the last keystroke.
  // A hydrated initial value commits too (the worker starts at '').
  useEffect(() => {
    timerRef.current = setTimeout(() => setQueryRef.current(inputValue), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    writePersisted(opts, {
      q: inputValue || undefined,
      type: typeFilter || undefined,
      muscle: muscleFilter || undefined,
      equip: equipFilter || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, typeFilter, muscleFilter, equipFilter, opts.persistKey, opts.persistence]);

  const excludeIds = opts.excludeIds;
  const visible = useMemo(
    () => applySwanPickerFilters(
      search.results,
      {
        typeFilter: typeFilter || null,
        muscleFilter: muscleFilter || null,
        equipFilter: equipFilter || null,
        sectionContext: opts.sectionContext,
      },
      excludeIds ?? [],
    ),
    [search.results, typeFilter, muscleFilter, equipFilter, opts.sectionContext, excludeIds],
  );

  return {
    inputValue,
    onInputChange: setInputValue,
    typeFilter,
    setTypeFilter,
    muscleFilter,
    setMuscleFilter,
    equipFilter,
    setEquipFilter,
    visible,
    totalCount: search.allExercises.length,
    isLoading: search.isLoading,
    isSearching: search.isSearching,
  };
}
