/**
 * HOOK: useWorkoutPlannerRolodexState
 * PURPOSE: Owns planner exercise search, advanced filters, selected exercise,
 * add-to-plan defaults, and react-window row rendering.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useExerciseSearch } from '../../../WorkoutLogger/useExerciseSearch';
import { searchExercisesSync, type ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { getJointImpact, parseEquipment } from './WorkoutPlannerFilters';
import { WorkoutPlannerExerciseRow } from './WorkoutPlannerExerciseRow';
import type { GeneratedPlan, OPTPhaseParams, PlanExercise } from './WorkoutPlannerTypes';
import {
  applyHorizonSwap,
  isDuplicateInHorizonDay,
  isHorizonSwapTargetValid,
  removeHorizonExercise,
  type HorizonSwapTarget,
  type PlannerSwapTarget,
} from './workoutPlannerHorizonSwap.helpers';
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';

interface UseWorkoutPlannerRolodexStateArgs {
  phase: OPTPhaseParams;
  planExercises: PlanExercise[];
  setPlanExercises: React.Dispatch<React.SetStateAction<PlanExercise[]>>;
  generatedPlan: GeneratedPlan | null;
  setGeneratedPlan: React.Dispatch<React.SetStateAction<GeneratedPlan | null>>;
  onSwapBlocked?: (message: string) => void;
}

export type RolodexSwapTarget = PlannerSwapTarget;

export function useWorkoutPlannerRolodexState({
  phase,
  planExercises,
  setPlanExercises,
  generatedPlan,
  setGeneratedPlan,
  onSwapBlocked,
}: UseWorkoutPlannerRolodexStateArgs) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSlim | null>(null);
  const [swapTarget, setSwapTarget] = useState<RolodexSwapTarget | null>(null);

  // Swap mode only survives while its target still exists — a regenerate,
  // plan load, or client change that rebuilds the list clears the banner.
  React.useEffect(() => {
    if (!swapTarget) return;
    const stale = swapTarget.kind === 'builder'
      ? !planExercises.some(planExercise => planExercise.id === swapTarget.rowId)
      : !isHorizonSwapTargetValid(generatedPlan, swapTarget);
    if (stale) setSwapTarget(null);
  }, [planExercises, generatedPlan, swapTarget]);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<string | null>(null);
  const [equipmentFilter, setEquipmentFilter] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);

  const {
    results: exerciseResults,
    allExercises,
    isLoading: exercisesLoading,
    setQuery: setSearchQuery,
    setCategory: setFilterCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  // Headless library search for dictated planner edits (AI events hook) —
  // does NOT touch the visible rolodex query/results state.
  const searchExercises = useCallback(
    async (query: string) => searchExercisesSync(allExercises, query, null),
    [allExercises],
  );

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

  const beginSwap = useCallback((rowId: string, exerciseName: string) => {
    setSwapTarget({ kind: 'builder', rowId, exerciseName });
  }, []);

  const beginHorizonSwap = useCallback((target: HorizonSwapTarget) => {
    setSwapTarget(target);
  }, []);

  const removeHorizonExerciseAt = useCallback((target: HorizonSwapTarget) => {
    setGeneratedPlan(prev => (prev ? removeHorizonExercise(prev, target) : prev));
    setSwapTarget(current => (current?.kind === 'horizon' ? null : current));
  }, [setGeneratedPlan]);

  const cancelSwap = useCallback(() => setSwapTarget(null), []);

  const addExercise = useCallback((exercise: ExerciseSlim) => {
    // Horizon swap mode: replace the targeted day-slot inside the generated
    // multi-week plan, keeping the slot's programming.
    if (swapTarget?.kind === 'horizon') {
      if (isDuplicateInHorizonDay(generatedPlan, swapTarget, exercise)) {
        onSwapBlocked?.(`${exercise.name} is already in that day — pick a different replacement.`);
        return;
      }
      setGeneratedPlan(prev => (prev ? applyHorizonSwap(prev, swapTarget, exercise) : prev));
      setSwapTarget(null);
      setSelectedExercise(exercise);
      return;
    }

    // Builder swap mode: the next Rolodex pick replaces the targeted builder
    // row's movement while keeping its programming (sets/reps/tempo/rest/intensity).
    if (swapTarget) {
      let blocked = false;
      let targetMissing = false;
      setPlanExercises(prev => {
        if (!prev.some(planExercise => planExercise.id === swapTarget.rowId)) {
          // Target row was removed while swap mode was active — fall through
          // to a normal add outside this updater.
          targetMissing = true;
          return prev;
        }
        const duplicate = prev.some(planExercise =>
          planExercise.exerciseSlim.id === exercise.id && planExercise.id !== swapTarget.rowId);
        if (duplicate) {
          blocked = true;
          return prev;
        }
        return prev.map(planExercise => (
          planExercise.id === swapTarget.rowId
            ? { ...planExercise, exerciseSlim: exercise }
            : planExercise
        ));
      });
      if (blocked) {
        onSwapBlocked?.(`${exercise.name} is already in this workout — pick a different replacement.`);
        return;
      }
      setSwapTarget(null);
      if (!targetMissing) {
        setSelectedExercise(exercise);
        return;
      }
      // targetMissing: fall through to a normal append below.
    }

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
  }, [phase, setPlanExercises, swapTarget, onSwapBlocked, generatedPlan, setGeneratedPlan]);

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
        inPlan={planExercises.some(planExercise => planExercise.exerciseSlim.id === exercise.id)}
        {...reactWindowStyleProps(style)}
        onAdd={addExercise}
        onSelect={setSelectedExercise}
      />
    );
  }, [filteredExercises, selectedExercise, planExercises, addExercise]);

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
    swapTarget,
    beginSwap,
    beginHorizonSwap,
    removeHorizonExerciseAt,
    cancelSwap,
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
    searchExercises,
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
