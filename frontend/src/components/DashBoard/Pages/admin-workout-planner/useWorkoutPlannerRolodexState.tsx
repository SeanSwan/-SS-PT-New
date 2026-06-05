/**
 * HOOK: useWorkoutPlannerRolodexState
 * PURPOSE: Owns planner exercise search, advanced filters, selected exercise,
 * add-to-plan defaults, and react-window row rendering.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useExerciseSearch } from '../../../WorkoutLogger/useExerciseSearch';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { getJointImpact, parseEquipment } from './WorkoutPlannerFilters';
import { WorkoutPlannerExerciseRow } from './WorkoutPlannerExerciseRow';
import type { OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';

interface UseWorkoutPlannerRolodexStateArgs {
  phase: OPTPhaseParams;
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
}

export function useWorkoutPlannerRolodexState({
  phase,
  setPlanExercises,
}: UseWorkoutPlannerRolodexStateArgs) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSlim | null>(null);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const {
    results: exerciseResults,
    isLoading: exercisesLoading,
    setQuery: setSearchQuery,
    setCategory: setFilterCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  const filteredExercises = useMemo(() => {
    let pool = exerciseResults;

    if (exerciseTypeFilter) {
      const norm = exerciseTypeFilter.toLowerCase();
      pool = pool.filter(ex => (ex.exerciseType || '').toLowerCase() === norm);
    }

    if (equipmentFilter) {
      const norm = equipmentFilter.toLowerCase();
      if (norm === 'bodyweight') {
        pool = pool.filter(ex => {
          const eqArr = parseEquipment(ex.equipment);
          return eqArr.length === 0
            || eqArr.some(e => e.toLowerCase().includes('body') || e.toLowerCase() === 'none');
        });
      } else {
        pool = pool.filter(ex => {
          const eqArr = parseEquipment(ex.equipment);
          return eqArr.length > 0 && eqArr.some(e => e.toLowerCase().includes(norm));
        });
      }
    }

    if (sourceFilter) {
      pool = pool.filter(ex => {
        const src = (ex.source || 'swanstudios').toLowerCase();
        if (sourceFilter === 'nasm') return src.startsWith('nasm');
        if (sourceFilter === 'swanstudios') return src === 'swanstudios';
        return true;
      });
    }

    if (impactFilter) {
      pool = pool.filter(ex => getJointImpact(ex) === impactFilter);
    }

    return pool;
  }, [exerciseResults, exerciseTypeFilter, equipmentFilter, sourceFilter, impactFilter]);

  const activeFilterCount = useMemo(() => [
    searchQuery.trim(),
    filterCategory,
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
  ].filter(Boolean).length, [
    searchQuery,
    filterCategory,
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
  ]);

  const addExercise = useCallback((exercise: ExerciseSlim) => {
    setPlanExercises(prev => {
      if (prev.some(planExercise => planExercise.exerciseSlim.id === exercise.id)) return prev;
      const defaultSets = parseInt(phase.sets.split('-')[0]) || 3;
      const restStr = phase.rest.toLowerCase();
      const restSec = restStr.includes('min')
        ? (parseInt(restStr) || 3) * 60
        : parseInt(restStr.replace(/[^0-9]/g, '')) || 60;

      return [...prev, {
        id: `${exercise.id}-${Date.now()}`,
        exerciseSlim: exercise,
        sets: defaultSets,
        reps: phase.reps,
        tempo: phase.tempo,
        restSeconds: restSec,
        intensityPercent: parseInt(phase.intensity.split('-')[0]) || 70,
        notes: '',
      }];
    });
    setSelectedExercise(exercise);
  }, [phase, setPlanExercises]);

  const exerciseRowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const exercise = filteredExercises[index];
    if (!exercise) return null;
    const impact = getJointImpact(exercise);
    const equipment = parseEquipment(exercise.equipment);

    return (
      <WorkoutPlannerExerciseRow
        exercise={exercise}
        equipmentLabel={equipment.length > 0 ? equipment.slice(0, 2).join(', ') : 'Bodyweight'}
        impact={impact}
        selected={selectedExercise?.id === exercise.id}
        style={style}
        onAdd={addExercise}
        onSelect={setSelectedExercise}
      />
    );
  }, [filteredExercises, selectedExercise, addExercise]);

  const clearSearchForBrowse = useCallback(() => {
    setSearchQuery('');
    setFilterCategory(null);
  }, [setSearchQuery, setFilterCategory]);

  const clearRolodexFilters = useCallback(() => {
    setSearchQuery('');
    setFilterCategory(null);
    setSourceFilter(null);
    setExerciseTypeFilter(null);
    setEquipmentFilter(null);
    setImpactFilter(null);
  }, [setSearchQuery, setFilterCategory]);

  return {
    selectedExercise,
    setSelectedExercise,
    filteredExerciseCount: filteredExercises.length,
    activeFilterCount,
    exercisesLoading,
    searchQuery,
    filterCategory,
    sourceFilter,
    exerciseTypeFilter,
    equipmentFilter,
    impactFilter,
    exerciseRowRenderer,
    setSearchQuery,
    setFilterCategory,
    setSourceFilter,
    setExerciseTypeFilter,
    setEquipmentFilter,
    setImpactFilter,
    clearSearchForBrowse,
    clearRolodexFilters,
  };
}
