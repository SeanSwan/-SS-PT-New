/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ LedgerProSkin — the perfected dense table (LEDGER shell).   │
 * │ Whole session visible, maximum set throughput. Set rows ARE │
 * │ the proven ExerciseSetRowComponent (keypad, ghost prefill,  │
 * │ logged colors live in one place — Rule 18). Pinned bottom   │
 * │ bar: session meter / rest controls / Add Exercise.          │
 * │ Design source: RUNNER-STYLES-FINAL-10 §LEDGER #6.           │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useCallback, useState } from 'react';
import { Plus, TimerOff, Trash2 } from 'lucide-react';
import ExerciseSetRowComponent from '../ExerciseSetRowComponent';
import { getExerciseEntryRowKey, getExerciseSetRowKey } from '../WorkoutLogger.helpers';
import type { RunnerEngine } from './RunnerEngine.types';
import { isExerciseComplete, exerciseSetProgress } from './RunnerEngine.types';
import {
  BarButton,
  ExerciseBlock,
  ExerciseMeta,
  ExerciseRow,
  IconAction,
  LedgerBottomBar,
  LedgerHeader,
  LedgerShell,
  SetList,
  SlimAddSet,
} from './LedgerProSkin.styles';

const formatRest = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  return `${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, '0')}`;
};

const LedgerProSkin: React.FC<{ engine: RunnerEngine }> = ({ engine }) => {
  const { exercises, rest, stats, rows } = engine;
  // Session-level logged toggles (visual accent state; workout DATA lives in
  // the engine — reps>0 is the durable truth used by stats/save).
  const [loggedSetKeys, setLoggedSetKeys] = useState<ReadonlySet<string>>(() => new Set());

  // Keys are namespaced by exercise: the row-key fallback (`set-N`) repeats
  // across exercises, and a session-level Set would light sibling sets.
  const makeToggleLogged = useCallback(
    (exerciseIndex: number, exerciseKey: string) => (setKey: string, setIndex: number) => {
      const namespaced = `${exerciseKey}::${setKey}`;
      setLoggedSetKeys((previous) => {
        const next = new Set(previous);
        if (next.has(namespaced)) {
          next.delete(namespaced);
        } else {
          next.add(namespaced);
          rows.onSetLogged(exerciseIndex, setIndex);
        }
        return next;
      });
    },
    [rows],
  );

  return (
    <LedgerShell data-runner-skin='ledger-pro'>
      <LedgerHeader>
        <span>LEDGER</span>
        <span aria-live='polite'>
          <b>{stats.completedSets}</b>
          <span> / {stats.totalSets} sets</span>
        </span>
      </LedgerHeader>

      {exercises.map((exercise, exerciseIndex) => {
        const done = isExerciseComplete(exercise);
        const progress = exerciseSetProgress(exercise);
        const exerciseKey = getExerciseEntryRowKey(exercise);
        const toggleLogged = makeToggleLogged(exerciseIndex, exerciseKey);
        return (
          <ExerciseBlock key={exerciseKey} aria-label={exercise.exerciseName}>
            <ExerciseRow $done={done}>
              <h4>{exercise.exerciseName}</h4>
              <ExerciseMeta $done={done}>{progress.done}/{progress.total}</ExerciseMeta>
              <IconAction
                type='button'
                aria-label={`Remove ${exercise.exerciseName}`}
                onClick={() => rows.onRemoveExercise(exerciseIndex)}
              >
                <Trash2 size={16} aria-hidden='true' />
              </IconAction>
            </ExerciseRow>
            <SetList>
              {exercise.sets.map((set, setIndex) => (
                <ExerciseSetRowComponent
                  key={getExerciseSetRowKey(set)}
                  exerciseName={exercise.exerciseName}
                  exerciseIndex={exerciseIndex}
                  set={set}
                  setIndex={setIndex}
                  showDetails={false}
                  isLogged={loggedSetKeys.has(`${exerciseKey}::${getExerciseSetRowKey(set)}`)}
                  canRemove={exercise.sets.length > 1}
                  onToggleLogged={toggleLogged}
                  onUpdateSet={rows.onUpdateSet}
                  onRemoveSet={rows.onRemoveSet}
                  getOverload={rows.getOverload}
                  getLastWeight={rows.getLastWeight}
                />
              ))}
            </SetList>
            <SlimAddSet
              type='button'
              aria-label={`Add set to ${exercise.exerciseName}`}
              onClick={() => rows.onAddSet(exerciseIndex)}
            >
              <Plus size={14} aria-hidden='true' />
              Add set
            </SlimAddSet>
          </ExerciseBlock>
        );
      })}

      <LedgerBottomBar>
        {rest.isRunning ? (
          <>
            <span aria-label={`Rest: ${formatRest(rest.secondsLeft)} remaining`}>
              {formatRest(rest.secondsLeft)}
            </span>
            <span style={{ display: 'inline-flex', gap: 8 }}>
              <BarButton type='button' onClick={() => rest.extend(15)} aria-label='Add 15 seconds of rest'>
                +15s
              </BarButton>
              <BarButton type='button' onClick={rest.stop} aria-label='Skip rest'>
                <TimerOff size={14} aria-hidden='true' /> Skip
              </BarButton>
            </span>
          </>
        ) : (
          <>
            <span aria-live='polite'>
              <b>{stats.completedSets}</b> / {stats.totalSets} sets
            </span>
            <BarButton type='button' aria-label='Add another exercise' onClick={engine.openRolodex}>
              <Plus size={14} aria-hidden='true' />
              Add exercise
            </BarButton>
          </>
        )}
      </LedgerBottomBar>
    </LedgerShell>
  );
};

export default LedgerProSkin;
