import { useMemo } from 'react';
import { applyEquipTypeFilters } from './NASMExerciseRolodex.helpers';
import {
  matchesSectionContextForTesting as matchesSectionContext,
  type SectionContext,
} from './NASMExerciseRolodex.sectionFilter';
import type { ExerciseSlim } from './useExerciseSearch';

interface RolodexFilteringInput {
  canonicalResults: ExerciseSlim[];
  canonicalAllExercises: ExerciseSlim[];
  sectionContext?: SectionContext;
  typeFilter: string | null;
  equipFilter: string | null;
}

/**
 * Slice 12 extraction: the Rolodex's derived search state.
 *
 * Section scoping, equipment/type narrowing, and the per-category counts that
 * feed the chips are pure derivations of the search pool, so they live beside
 * the other extracted Rolodex pieces instead of in the shell component. The
 * shell keeps the pool itself (canonical identity filtering) and every effect
 * that consumes these values, so the memo semantics are unchanged.
 */
export const useRolodexFiltering = ({
  canonicalResults,
  canonicalAllExercises,
  sectionContext,
  typeFilter,
  equipFilter,
}: RolodexFilteringInput) => {
  const sectionFiltered = useMemo(() => (
    !sectionContext || sectionContext === 'main'
      ? canonicalResults
      : canonicalResults.filter(ex => matchesSectionContext(ex, sectionContext))
  ), [canonicalResults, sectionContext]);

  const filteredResults = useMemo(
    () => applyEquipTypeFilters(sectionFiltered, typeFilter, equipFilter),
    [sectionFiltered, typeFilter, equipFilter],
  );

  const filteredAllExercises = useMemo(() => (
    !sectionContext || sectionContext === 'main'
      ? canonicalAllExercises
      : canonicalAllExercises.filter(ex => matchesSectionContext(ex, sectionContext))
  ), [canonicalAllExercises, sectionContext]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: filteredAllExercises.length };
    for (const ex of filteredAllExercises) {
      const cat = ex.bodyPartCategory || 'Full Body';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [filteredAllExercises]);

  return { filteredResults, filteredAllExercises, categoryCounts };
};
