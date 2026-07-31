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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import type { RunnerEngine } from './RunnerEngine.types';
import { isExerciseComplete, exerciseSetProgress } from './RunnerEngine.types';
import { getExerciseEntryRowKey } from '../WorkoutLogger.helpers';
import { isLinkedToPrevious } from '../WorkoutLogger.supersets';
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
  RampButton,
  RailChip,
  RailDot,
  RailGroup,
  SessionMeter,
  ThumbBar,
  TrendChip,
} from './FocusFlowSkin.styles';

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

  // Keep the active chip reachable without ever moving the PAGE: assign the
  // rail's own scrollLeft (instant). scrollIntoView is banned here — it walks
  // ancestors and would scroll the shell canvas out from under the trainer.
  const railRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const rail = railRef.current;
    const chip = rail?.querySelectorAll<HTMLElement>('[role="tab"]')[activeIndex];
    if (!rail || !chip) return;
    const leftEdge = chip.offsetLeft;
    const rightEdge = leftEdge + chip.offsetWidth;
    const viewLeft = rail.scrollLeft;
    const viewRight = viewLeft + rail.clientWidth;
    const GUTTER = 12; // breathing room so the chip never kisses the fade
    if (leftEdge < viewLeft + GUTTER) {
      rail.scrollLeft = Math.max(0, leftEdge - GUTTER);
    } else if (rightEdge > viewRight - GUTTER) {
      rail.scrollLeft = rightEdge - rail.clientWidth + GUTTER;
    }
  }, [activeIndex, exercises.length]);

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
      <ProgressRail ref={railRef} data-rail-scroller>
        <RailGroup role='tablist' aria-label='Exercises in this session'>
          {exercises.map((exercise, index) => {
            const state = chipState(index);
            const linked = isLinkedToPrevious(exercises, index);
            return (
              <RailChip
                key={getExerciseEntryRowKey(exercise)}
                type='button'
                role='tab'
                aria-selected={index === activeIndex}
                aria-label={`${exercise.exerciseName}${linked ? ', superset with previous' : ''}${state === 'done' ? ', completed' : ''}`}
                $state={state}
                $linked={linked}
                onClick={() => setActiveIndex(index)}
              >
                {linked && <span aria-hidden='true'>⛓</span>}
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
        {(() => {
          const trend = engine.rows.getTrend?.(active.exerciseName) ?? [];
          if (trend.length < 2) return null;
          const chrono = [...trend].reverse(); // oldest → newest for reading
          const delta = chrono[chrono.length - 1] - chrono[0];
          return (
            <TrendChip aria-label={`Top set last ${chrono.length} sessions: ${chrono.join(', ')} lbs`}>
              {chrono.join(' → ')} lbs {delta > 0 ? '↑' : delta < 0 ? '↓' : '→'}
            </TrendChip>
          );
        })()}
        {engine.rows.onInsertWarmupRamp
          && progress.done === 0
          && Math.max(0, ...active.sets.map((set) => set.weight || 0)) > 0
          && !active.sets.some((set) => set.notes === 'warm-up') && (
          <RampButton
            type='button'
            onClick={() => engine.rows.onInsertWarmupRamp?.(activeIndex)}
            aria-label={`Add warm-up ramp sets for ${active.exerciseName}`}
          >
            + Warm-up ramp (40/60/80%)
          </RampButton>
        )}
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

        {/* Rest chrome lives in the SHELL action bar (Slice 4b) — one surface. */}
        <BarCenter>
          <SessionMeter>
            <b>{stats.completedSets}</b>
            <span> / {stats.totalSets} sets</span>
          </SessionMeter>
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
