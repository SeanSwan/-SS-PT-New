/**
 * useRunnerEngine — assembles the RunnerEngine contract from WorkoutLogger's
 * existing state + owns the proven exercise-card render (single source for
 * both the Classic Ledger list and every skin's card stage). Engine state
 * stays in WorkoutLogger; this hook only wires, so style swaps mid-session
 * are lossless by construction.
 */
import React, { useCallback, useMemo } from 'react';
import ExerciseCardComponent from '../ExerciseCardComponent';
import QuickLogMode from '../QuickLogMode';
import { getExerciseEntryRowKey } from '../WorkoutLogger.helpers';
import { isLinkedToPrevious } from '../WorkoutLogger.supersets';
import type { ExerciseEntry, ExerciseSet } from '../../../services/nasmApiService';
import type { RunnerEngine, RunnerSessionStats } from './RunnerEngine.types';

interface UseRunnerEngineDeps {
  exercises: ExerciseEntry[];
  effectiveClientId: number | null | undefined;
  showSetDetails: boolean;
  onToggleSetDetails: () => void;
  onToggleSuperset: (exerciseIndex: number) => void;
  onUpdateExercise: <K extends keyof ExerciseEntry>(exerciseIndex: number, field: K, value: ExerciseEntry[K]) => void;
  onUpdateSet: <K extends keyof ExerciseSet>(exerciseIndex: number, setIndex: number, field: K, value: ExerciseSet[K]) => void;
  onAddSet: (exerciseIndex: number) => void;
  onRemoveSet: (exerciseIndex: number, setIndex: number) => void;
  onRemoveExercise: (exerciseIndex: number) => void;
  ghostPreFill: React.ComponentProps<typeof QuickLogMode>['ghostPreFill'] &
    {
      getOverload: React.ComponentProps<typeof ExerciseCardComponent>['getOverload'];
      getTrend?: (exerciseName: string) => number[];
    };
  getLastWeight: React.ComponentProps<typeof ExerciseCardComponent>['getLastWeight'];
  onSetLogged: (exerciseIndex: number, setIndex: number) => void;
  onInsertWarmupRamp?: (exerciseIndex: number) => void;
  ghostSkip: boolean;
  stats: RunnerSessionStats;
  restTimer: { isRunning: boolean; secondsLeft: number; stop: () => void; start: (seconds: number) => void };
  openRolodex: () => void;
}

export function useRunnerEngine(deps: UseRunnerEngineDeps): {
  engine: RunnerEngine;
  renderClassicList: () => React.ReactNode;
  renderQuickLog: () => React.ReactNode;
} {
  const {
    exercises, effectiveClientId, showSetDetails, onToggleSetDetails, onToggleSuperset,
    onUpdateExercise, onUpdateSet, onAddSet, onRemoveSet, onRemoveExercise,
    ghostPreFill, getLastWeight, onSetLogged, onInsertWarmupRamp, ghostSkip, stats, restTimer, openRolodex,
  } = deps;

  const renderExerciseCard = useCallback((exerciseIndex: number): React.ReactNode => {
    const exercise = exercises[exerciseIndex];
    if (!exercise) return null;
    return (
      <ExerciseCardComponent
        key={getExerciseEntryRowKey(exercise)}
        exercise={exercise}
        exerciseIndex={exerciseIndex}
        clientId={effectiveClientId ?? undefined}
        supersetGroup={exercise.supersetGroup ?? undefined}
        linkedToPrevious={isLinkedToPrevious(exercises, exerciseIndex)}
        showSetDetails={showSetDetails}
        onToggleSetDetails={onToggleSetDetails}
        onToggleSupersetLink={exerciseIndex > 0 ? () => onToggleSuperset(exerciseIndex) : undefined}
        onUpdateExercise={onUpdateExercise}
        onUpdateSet={onUpdateSet}
        onAddSet={onAddSet}
        onRemoveSet={onRemoveSet}
        onRemoveExercise={onRemoveExercise}
        getOverload={ghostPreFill.getOverload}
        getLastWeight={getLastWeight}
        onSetLogged={onSetLogged}
        ghostSkip={ghostSkip}
      />
    );
  }, [
    exercises, effectiveClientId, showSetDetails, onToggleSetDetails, onToggleSuperset,
    onUpdateExercise, onUpdateSet, onAddSet, onRemoveSet, onRemoveExercise,
    ghostPreFill, getLastWeight, onSetLogged, ghostSkip,
  ]);

  const renderClassicList = useCallback((): React.ReactNode => (
    <div className='lens2-collection'>
      {exercises.map((_exercise, exerciseIndex) => renderExerciseCard(exerciseIndex))}
    </div>
  ), [exercises, renderExerciseCard]);

  /* Phase 6 Quick Log (3-tap streamlined view) — Classic-lane presentation. */
  const renderQuickLog = useCallback((): React.ReactNode => (
    <QuickLogMode
      exercises={exercises}
      onUpdateSet={onUpdateSet}
      onAddSet={onAddSet}
      ghostPreFill={ghostPreFill}
      onSetLogged={onSetLogged}
    />
  ), [exercises, onUpdateSet, onAddSet, ghostPreFill, onSetLogged]);

  const engine = useMemo<RunnerEngine>(() => ({
    exercises,
    renderExerciseCard,
    stats,
    rest: {
      isRunning: restTimer.isRunning,
      secondsLeft: restTimer.secondsLeft,
      stop: restTimer.stop,
      // extend = restart with the remaining time + bonus (engine-owned clamp).
      extend: (seconds: number) => restTimer.start(Math.max(1, restTimer.secondsLeft + seconds)),
    },
    openRolodex,
    rows: {
      onUpdateSet,
      onRemoveSet,
      onAddSet,
      onRemoveExercise,
      onSetLogged,
      onInsertWarmupRamp,
      getTrend: ghostPreFill.getTrend,
      getOverload: ghostPreFill.getOverload,
      getLastWeight,
    },
  }), [
    exercises, renderExerciseCard, stats, restTimer, openRolodex,
    onUpdateSet, onRemoveSet, onAddSet, onRemoveExercise, onSetLogged, onInsertWarmupRamp, ghostPreFill, getLastWeight,
  ]);

  return { engine, renderClassicList, renderQuickLog };
}
