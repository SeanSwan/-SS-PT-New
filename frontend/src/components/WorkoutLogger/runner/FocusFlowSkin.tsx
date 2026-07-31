/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ FocusFlowSkin — the default Runner Style (Lens-switchable). │
 * │ One exercise at a time. Navigation lives in ONE top cluster │
 * │ (Sean, 2026-07-31): ◀ [chip rail] ▶ — arrows step, the rail │
 * │ scrolls (touch fling / desktop hold-drag + wheel / roving   │
 * │ arrow keys), compact chips keep the whole session on        │
 * │ screen. Below: NOW hero → the proven exercise card. The     │
 * │ bottom ThumbBar is GONE — nothing sticky-bottom remains in  │
 * │ the skin, so switching exercises can never move the page.   │
 * │ Consult floors: next-up chip mandatory, no edge swipe,      │
 * │ single pulse on focus change, rest pauses the pulse.        │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Link2, Plus } from 'lucide-react';
import type { RunnerEngine } from './RunnerEngine.types';
import { isExerciseComplete, exerciseSetProgress } from './RunnerEngine.types';
import { getExerciseEntryRowKey } from '../WorkoutLogger.helpers';
import { isLinkedToPrevious } from '../WorkoutLogger.supersets';
import { useRailDragScroll } from './useRailDragScroll';
import {
  ChipName,
  ProgressRail,
  RailArrowButton,
  RailChip,
  RailDot,
  RailGroup,
  RailNavRow,
} from './FocusFlowRail.styles';
import {
  CardStage,
  FocusShell,
  NextUpChip,
  NowExerciseName,
  NowKicker,
  NowPanel,
  RampButton,
  TrendChip,
} from './FocusFlowSkin.styles';

/** First exercise with unlogged sets — where the session actually is. */
const firstIncompleteIndex = (engine: RunnerEngine): number => {
  const idx = engine.exercises.findIndex((exercise) => !isExerciseComplete(exercise));
  return idx === -1 ? Math.max(0, engine.exercises.length - 1) : idx;
};

const FocusFlowSkin: React.FC<{ engine: RunnerEngine }> = ({ engine }) => {
  const { exercises, rest } = engine;
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
  const drag = useRailDragScroll(exercises.length > 0);
  const railRef = drag.railRef;
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
  }, [activeIndex, exercises.length, railRef]);

  // The earned moment (Kimi d): pulse the chip whose exercise JUST completed.
  // Baseline silently on mount/bulk arrival (draft restore, plan load) — the
  // same re-baseline law the PR toast follows.
  const [pulseKey, setPulseKey] = useState<string | null>(null);
  const completionRef = React.useRef<Map<string, boolean> | null>(null);
  useEffect(() => {
    const current = new Map(
      exercises.map((exercise) => [getExerciseEntryRowKey(exercise), isExerciseComplete(exercise)]),
    );
    const previous = completionRef.current;
    completionRef.current = current;
    if (!previous || previous.size === 0) return undefined;
    for (const [key, complete] of current) {
      if (complete && previous.get(key) === false) {
        setPulseKey(key);
        const timer = window.setTimeout(() => setPulseKey(null), 700);
        return () => window.clearTimeout(timer);
      }
    }
    return undefined;
  }, [exercises]);

  const active = exercises[activeIndex];
  const next = exercises[activeIndex + 1];
  const progress = useMemo(
    () => (active ? exerciseSetProgress(active) : { done: 0, total: 0 }),
    [active],
  );
  // Wayfinding (Kimi b.2): the next incomplete chip previews its name.
  const previewIndex = useMemo(() => {
    for (let i = activeIndex + 1; i < exercises.length; i += 1) {
      if (!isExerciseComplete(exercises[i])) return i;
    }
    return -1;
  }, [exercises, activeIndex]);

  if (!active) return null;

  const chipState = (index: number): 'pending' | 'active' | 'done' => {
    if (index === activeIndex) return 'active';
    return isExerciseComplete(exercises[index]) ? 'done' : 'pending';
  };

  // Roving tablist (WAI-ARIA law, same pattern as the shell StageRail):
  // Left/Right arrows move AND activate; clamped at the ends (a session is
  // a sequence, not a carousel — wrapping would lie about position).
  const handleRailKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const target = Math.min(exercises.length - 1, Math.max(0, activeIndex + delta));
    if (target === activeIndex) return;
    setActiveIndex(target);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[target]?.focus();
  };

  return (
    <FocusShell data-runner-skin='focus-flow'>
      {/* ONE navigation cluster, at the top where nothing can jump. */}
      <RailNavRow>
        <RailArrowButton
          type='button'
          disabled={activeIndex === 0}
          aria-label='Previous exercise'
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
        >
          <ChevronLeft size={20} aria-hidden='true' />
        </RailArrowButton>

        {/* Add lives OUTSIDE the tablist — a tablist may contain only tabs. */}
        <ProgressRail
          ref={drag.railRef}
          data-rail-scroller
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onClickCapture={drag.onClickCapture}
        >
          <RailGroup role='tablist' aria-label='Exercises in this session' onKeyDown={handleRailKeyDown}>
            {exercises.map((exercise, index) => {
              const state = chipState(index);
              const linked = isLinkedToPrevious(exercises, index);
              const rowKey = getExerciseEntryRowKey(exercise);
              const isPreview = index === previewIndex;
              return (
                <RailChip
                  key={rowKey}
                  type='button'
                  role='tab'
                  tabIndex={state === 'active' ? 0 : -1}
                  aria-selected={index === activeIndex}
                  aria-label={`${exercise.exerciseName}${linked ? ', superset with previous' : ''}${state === 'done' ? ', completed' : ''}`}
                  $state={state}
                  $linked={linked}
                  $preview={isPreview}
                  $pulse={pulseKey === rowKey}
                  data-just-completed={pulseKey === rowKey || undefined}
                  onClick={() => setActiveIndex(index)}
                >
                  {linked && <Link2 size={12} aria-hidden='true' />}
                  <RailDot $state={state} aria-hidden='true'>
                    {state === 'done' ? <span>✓</span> : index + 1}
                  </RailDot>
                  {(state === 'active' || isPreview) && (
                    <ChipName $preview={isPreview}>{exercise.exerciseName}</ChipName>
                  )}
                </RailChip>
              );
            })}
          </RailGroup>
          <RailChip
            type='button'
            $state='pending'
            $preview
            aria-label='Add another exercise'
            onClick={engine.openRolodex}
          >
            <Plus size={14} aria-hidden='true' />
            Add
          </RailChip>
        </ProgressRail>

        <RailArrowButton
          type='button'
          disabled={activeIndex >= exercises.length - 1}
          aria-label='Next exercise'
          onClick={() => setActiveIndex((index) => Math.min(exercises.length - 1, index + 1))}
        >
          <ChevronRight size={20} aria-hidden='true' />
        </RailArrowButton>
      </RailNavRow>

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
    </FocusShell>
  );
};

export default FocusFlowSkin;
