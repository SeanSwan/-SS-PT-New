/**
 * HOOK: useRolodexDeepLink
 * OWNER: WorkoutLogger / NASM Exercise Rolodex (Slice 11)
 * PURPOSE: Deep-link intake for the Rolodex — when the logger is opened with
 *          ?exercise=<name> (e.g. from a Progress-page smart target), the
 *          Rolodex prefills the search query and, when an EXACT
 *          case-insensitive name match exists in the results, auto-selects
 *          it once. Tap the gap on /progress -> exercise is already added.
 * SAFETY: fires at most once per open (ref-guarded); an inexact query just
 *         leaves the user on the prefiltered list — never a surprise add of
 *         a different exercise.
 */

import { useEffect, useRef } from 'react';
import type { ExerciseSlim } from './useExerciseSearch';

interface RolodexDeepLinkArgs {
  isOpen: boolean;
  initialQuery?: string | null;
  autoSelectExact?: boolean;
  results: ExerciseSlim[];
  setQuery: (q: string) => void;
  onExactMatch: (exercise: ExerciseSlim) => void;
}

export function useRolodexDeepLink({
  isOpen,
  initialQuery,
  autoSelectExact = false,
  results,
  setQuery,
  onExactMatch,
}: RolodexDeepLinkArgs): void {
  const seededRef = useRef(false);
  const selectedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      seededRef.current = false;
      selectedRef.current = false;
      return;
    }
    if (initialQuery && !seededRef.current) {
      seededRef.current = true;
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery, setQuery]);

  useEffect(() => {
    if (!isOpen || !autoSelectExact || !initialQuery) return;
    if (!seededRef.current || selectedRef.current) return;
    const wanted = initialQuery.trim().toLowerCase();
    const match = results.find((ex) => ex.name.trim().toLowerCase() === wanted);
    if (match) {
      selectedRef.current = true;
      onExactMatch(match);
    }
  }, [isOpen, autoSelectExact, initialQuery, results, onExactMatch]);
}

export default useRolodexDeepLink;
