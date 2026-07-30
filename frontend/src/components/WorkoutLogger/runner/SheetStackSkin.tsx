/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SheetStackSkin — iOS-native sheet ergonomics (SHEET shell). │
 * │ Canvas = compact session map (tap an exercise → sheet opens │
 * │ on it). ONE sheet host owns the editor (the proven card);   │
 * │ its context header survives every detent; max height rides  │
 * │ visualViewport so the keypad never occludes the editor.     │
 * │ Design source: RUNNER-STYLES-FINAL-10 §SHEET #9.            │
 * └─────────────────────────────────────────────────────────────┘
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, TimerOff } from 'lucide-react';
import { getExerciseEntryRowKey } from '../WorkoutLogger.helpers';
import type { RunnerEngine } from './RunnerEngine.types';
import { isExerciseComplete, exerciseSetProgress } from './RunnerEngine.types';
import {
  CanvasItem,
  CanvasList,
  CanvasNow,
  RestChipButton,
  SheetBody,
  SheetContext,
  SheetGrabber,
  SheetHost,
  SheetRestStrip,
  StackShell,
} from './SheetStackSkin.styles';

const formatRest = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  return `${Math.floor(clamped / 60)}:${String(clamped % 60).padStart(2, '0')}`;
};

const firstIncompleteIndex = (engine: RunnerEngine): number => {
  const idx = engine.exercises.findIndex((exercise) => !isExerciseComplete(exercise));
  return idx === -1 ? Math.max(0, engine.exercises.length - 1) : idx;
};

/** Sheet max height derived from the VISUAL viewport (keypad-aware). */
function useSheetMaxHeight(): number {
  const [maxHeight, setMaxHeight] = useState(() =>
    typeof window === 'undefined' ? 480 : Math.round(window.innerHeight * 0.68));
  useEffect(() => {
    const viewport = window.visualViewport;
    const compute = () =>
      setMaxHeight(Math.round((viewport?.height ?? window.innerHeight) * 0.68));
    compute();
    viewport?.addEventListener('resize', compute);
    window.addEventListener('resize', compute);
    return () => {
      viewport?.removeEventListener('resize', compute);
      window.removeEventListener('resize', compute);
    };
  }, []);
  return maxHeight;
}

const SheetStackSkin: React.FC<{ engine: RunnerEngine }> = ({ engine }) => {
  const { exercises, rest, stats } = engine;
  const [activeIndex, setActiveIndex] = useState<number>(() => firstIncompleteIndex(engine));
  const [expanded, setExpanded] = useState(true);
  const maxHeight = useSheetMaxHeight();

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
  const progress = useMemo(
    () => (active ? exerciseSetProgress(active) : { done: 0, total: 0 }),
    [active],
  );

  if (!active) return null;

  return (
    <StackShell data-runner-skin='sheet-stack'>
      <CanvasNow>
        <small>Session · {stats.completedSets}/{stats.totalSets} sets</small>
        <h3>{active.exerciseName}</h3>
      </CanvasNow>

      <CanvasList aria-label='Exercises in this session'>
        {exercises.map((exercise, index) => {
          const state = index === activeIndex
            ? 'active'
            : isExerciseComplete(exercise) ? 'done' : 'pending';
          const itemProgress = exerciseSetProgress(exercise);
          return (
            <CanvasItem
              key={getExerciseEntryRowKey(exercise)}
              type='button'
              $state={state}
              aria-pressed={index === activeIndex}
              aria-label={`Open ${exercise.exerciseName}${state === 'done' ? ', completed' : ''}`}
              onClick={() => { setActiveIndex(index); setExpanded(true); }}
            >
              {exercise.exerciseName}
              <em>{itemProgress.done}/{itemProgress.total}</em>
            </CanvasItem>
          );
        })}
        <CanvasItem
          type='button'
          $state='pending'
          aria-label='Add another exercise'
          onClick={engine.openRolodex}
        >
          <span><Plus size={14} aria-hidden='true' /> Add exercise</span>
          <em>{exercises.length}</em>
        </CanvasItem>
      </CanvasList>

      <SheetHost $expanded={expanded} $maxHeight={maxHeight}>
        <SheetGrabber
          type='button'
          aria-expanded={expanded}
          aria-label={expanded
            ? `Collapse editor. ${active.exerciseName}, set ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`
            : `Expand editor. ${active.exerciseName}, set ${Math.min(progress.done + 1, progress.total)} of ${progress.total}`}
          onClick={() => setExpanded((value) => !value)}
        >
          <SheetContext>
            <strong>{active.exerciseName}</strong>
            <em>Set {Math.min(progress.done + 1, progress.total)} of {progress.total}</em>
          </SheetContext>
        </SheetGrabber>
        {rest.isRunning && (
          <SheetRestStrip>
            <span aria-label={`Rest: ${formatRest(rest.secondsLeft)} remaining`}>
              {formatRest(rest.secondsLeft)}
            </span>
            <RestChipButton type='button' onClick={() => rest.extend(15)} aria-label='Add 15 seconds of rest'>
              +15s
            </RestChipButton>
            <RestChipButton type='button' onClick={rest.stop} aria-label='Skip rest'>
              <TimerOff size={12} aria-hidden='true' /> Skip
            </RestChipButton>
          </SheetRestStrip>
        )}
        {expanded && <SheetBody>{engine.renderExerciseCard(activeIndex)}</SheetBody>}
      </SheetHost>
    </StackShell>
  );
};

export default SheetStackSkin;
