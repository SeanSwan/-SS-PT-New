/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ FocusFlowSkin — the default Runner Style (Lens-switchable). │
 * │ One exercise at a time: progress rail → NOW hero → the      │
 * │ proven exercise card → thumb bar (prev/next + rest-aware    │
 * │ center). Design source: RUNNER-STYLES-FINAL-10 §FOCUS #1;   │
 * │ consult floors: next-up chip mandatory, no edge swipe,      │
 * │ single pulse on focus change, rest pauses the pulse.        │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, TimerOff } from 'lucide-react';
import type { RunnerEngine } from './RunnerEngine.types';
import { isExerciseComplete, exerciseSetProgress } from './RunnerEngine.types';
import { getExerciseEntryRowKey } from '../WorkoutLogger.helpers';
import {
  BarCenter,
  CardStage,
  FocusShell,
  NavButton,
  NextUpChip,
  NowExerciseName,
  NowKicker,
  NowPanel,
  ProgressRail,
  RailChip,
  RailDot,
  RailGroup,
  RestAction,
  RestReadout,
  SessionMeter,
  ThumbBar,
} from './FocusFlowSkin.styles';

const formatRest = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** First exercise with unlogged sets — where the session actually is. */
const firstIncompleteIndex = (engine: RunnerEngine): number => {
  const idx = engine.exercises.findIndex((exercise) => !isExerciseComplete(exercise));
  return idx === -1 ? Math.max(0, engine.exercises.length - 1) : idx;
};

const FocusFlowSkin: React.FC<{ engine: RunnerEngine }> = ({ engine }) => {
  const { exercises, rest, stats } = engine;
  const [activeIndex, setActiveIndex] = useState<number>(() => firstIncompleteIndex(engine));

  // Clamp when exercises are removed. When a session ARRIVES after mount
  // (draft restore, plan load, repeat-last) re-seed onto the first
  // incomplete exercise — the mount-time seed saw an empty list.
  const prevCountRef = React.useRef(exercises.length);
  useEffect(() => {
    const prevCount = prevCountRef.current;
    prevCountRef.current = exercises.length;
    if (prevCount === 0 && exercises.length > 0) {
      setActiveIndex(firstIncompleteIndex(engine));
      return;
    }
    if (activeIndex > exercises.length - 1) {
      setActiveIndex(Math.max(0, exercises.length - 1));
    }
  }, [exercises.length, activeIndex, engine]);

  const active = exercises[activeIndex];
  const next = exercises[activeIndex + 1];
  const progress = useMemo(
    () => (active ? exerciseSetProgress(active) : { done: 0, total: 0 }),
    [active],
  );

  if (!active) return null;

  const chipState = (index: number): 'pending' | 'active' | 'done' => {
    if (index === activeIndex) return 'active';
    return isExerciseComplete(exercises[index]) ? 'done' : 'pending';
  };

  return (
    <FocusShell data-runner-skin='focus-flow'>
      {/* Add lives OUTSIDE the tablist — a tablist may contain only tabs. */}
      <ProgressRail>
        <RailGroup role='tablist' aria-label='Exercises in this session'>
          {exercises.map((exercise, index) => {
            const state = chipState(index);
            return (
              <RailChip
                key={getExerciseEntryRowKey(exercise)}
                type='button'
                role='tab'
                aria-selected={index === activeIndex}
                aria-label={`${exercise.exerciseName}${state === 'done' ? ', completed' : ''}`}
                $state={state}
                onClick={() => setActiveIndex(index)}
              >
                <RailDot $state={state} aria-hidden='true'>
                  {state === 'done' ? '' : index + 1}
                </RailDot>
                {exercise.exerciseName}
              </RailChip>
            );
          })}
        </RailGroup>
        <RailChip
          type='button'
          $state='pending'
          aria-label='Add another exercise'
          onClick={engine.openRolodex}
        >
          <Plus size={14} aria-hidden='true' />
          Add
        </RailChip>
      </ProgressRail>

      <NowPanel key={activeIndex} $resting={rest.isRunning}>
        <NowKicker>
          <span>Now · Exercise {activeIndex + 1} of {exercises.length}</span>
          <strong aria-label={`${progress.done} of ${progress.total} sets logged`}>
            SET {Math.min(progress.done + 1, progress.total)} OF {progress.total}
          </strong>
        </NowKicker>
        <NowExerciseName>{active.exerciseName}</NowExerciseName>
        <NextUpChip
          type='button'
          onClick={() => (next ? setActiveIndex(activeIndex + 1) : engine.openRolodex())}
          aria-label={next ? `Next up: ${next.exerciseName}` : 'Last exercise — add another'}
        >
          Next up → <em>{next ? next.exerciseName : 'Finish strong — add another?'}</em>
        </NextUpChip>
      </NowPanel>

      <CardStage>{engine.renderExerciseCard(activeIndex)}</CardStage>

      <ThumbBar>
        <NavButton
          type='button'
          whileTap={{ scale: 0.96 }}
          disabled={activeIndex === 0}
          aria-label='Previous exercise'
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          <ChevronLeft size={18} aria-hidden='true' />
          Prev
        </NavButton>

        <BarCenter aria-live='polite'>
          {rest.isRunning ? (
            <>
              <RestReadout aria-label={`Rest: ${formatRest(rest.secondsLeft)} remaining`}>
                {formatRest(rest.secondsLeft)}
              </RestReadout>
              <RestAction type='button' onClick={() => rest.extend(15)} aria-label='Add 15 seconds of rest'>
                +15s
              </RestAction>
              <RestAction type='button' onClick={rest.stop} aria-label='Skip rest'>
                <TimerOff size={14} aria-hidden='true' /> Skip
              </RestAction>
            </>
          ) : (
            <SessionMeter>
              <b>{stats.completedSets}</b>
              <span> / {stats.totalSets} sets</span>
            </SessionMeter>
          )}
        </BarCenter>

        <NavButton
          type='button'
          whileTap={{ scale: 0.96 }}
          disabled={activeIndex >= exercises.length - 1}
          aria-label='Next exercise'
          onClick={() => setActiveIndex((index) => Math.min(exercises.length - 1, index + 1))}
        >
          Next
          <ChevronRight size={18} aria-hidden='true' />
        </NavButton>
      </ThumbBar>
    </FocusShell>
  );
};

export default FocusFlowSkin;
