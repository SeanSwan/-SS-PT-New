/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ ActionBar — SESSION SHELL zone 6.                           │
 * │ ONE bottom bar replacing footer + StickyLogActionBar +      │
 * │ skin rest chrome + TimerFAB/FloatingRestTimer.              │
 * │ Persistent segment: mic (dictation) + coach — NEVER         │
 * │ unmounts. Stage segment: ONE primary (Go to Train / Add     │
 * │ exercise / Save), meter as status. REST IS A STATE: the     │
 * │ center becomes a 3-feet-readable countdown + Skip/+15s.     │
 * │ Destructive/rare actions live in the context-bar overflow.  │
 * │ z-index 80 — BELOW the numeric keypad sheet (90), so the    │
 * │ keypad replaces the bar instead of double-stacking.         │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import styled from 'styled-components';
import { Check, Mic, Plus, Save, Sparkles, TimerOff } from 'lucide-react';
import type { SessionStage } from '../useSessionStage';

const formatRest = (totalSeconds: number): string => {
  const clamped = Math.max(0, totalSeconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const BarWrap = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 80; /* keypad sheet (90) absorbs the bar — never double-stacked */
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  background: color-mix(in srgb, var(--bg-surface, #1a1a24) 96%, transparent);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
  font-family: 'Sora', sans-serif;

  @media (min-width: 1024px) {
    left: 50%;
    right: auto;
    width: min(100vw, 720px);
    transform: translateX(-50%);
    border-radius: 14px 14px 0 0;
    border: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
    border-bottom: 0;
  }
`;

/** In-flow spacer so canvas content never hides under the fixed bar. */
const Spacer = styled.div`
  height: calc(5rem + env(safe-area-inset-bottom, 0px));
`;

const IconButton = styled.button<{ $coach?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  min-height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid ${({ $coach }) =>
    $coach
      ? 'color-mix(in srgb, var(--train-coach, #8b5cf6) 50%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #e0ecf4) 16%, transparent)'};
  background: transparent;
  color: ${({ $coach }) => ($coach ? 'var(--swan-coach-fg, #c4b5fd)' : 'var(--text-primary, #e0ecf4)')};

  &[aria-pressed='true'] {
    background: color-mix(in srgb, var(--train-coach, #8b5cf6) 20%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--train-coach, #8b5cf6);
    outline-offset: 2px;
  }
`;

const Center = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Meter = styled.span`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
  white-space: nowrap;
`;

/** 3-feet-readable — this is a glance surface, not a chip. */
const RestReadout = styled.strong`
  font-family: 'Fira Code', monospace;
  font-variant-numeric: tabular-nums;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--world-accent, #60c0f0);
  white-space: nowrap;
`;

const RestButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-height: 44px;
  padding: 0 10px;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--world-accent, #60c0f0) 40%, transparent);
  border-radius: 10px;
  background: transparent;
  color: var(--text-primary, #e0ecf4);
  font: 600 0.78rem 'Sora', sans-serif;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--world-accent, #60c0f0);
    outline-offset: 2px;
  }
`;

const Primary = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 18px;
  flex-shrink: 0;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-primary, #60c0f0), var(--swan-lavender, #4070c0));
  color: var(--text-primary, #e0ecf4);
  font: 700 0.88rem 'Sora', sans-serif;
  white-space: nowrap;
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 2px;
  }
`;

const SavedMarker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 48px;
  padding: 0 14px;
  color: var(--accent-gold, #c6a84b); /* earned — the ONE gold use here */
  font: 700 0.85rem 'Sora', sans-serif;
  white-space: nowrap;
`;

export interface ActionBarRest {
  isRunning: boolean;
  secondsLeft: number;
  stop: () => void;
  extend: (seconds: number) => void;
}

export interface ActionBarProps {
  stage: SessionStage;
  onGoTrain: () => void;
  hasExercises: boolean;
  completedSets: number;
  totalSets: number;
  isSubmitting: boolean;
  submitted: boolean;
  onSubmit: () => void;
  onAddExercise: () => void;
  rest: ActionBarRest;
  canDictate: boolean;
  dictationActive: boolean;
  onToggleDictation: () => void;
  onOpenCoach: () => void;
}

const ActionBar: React.FC<ActionBarProps> = React.memo(({
  stage, onGoTrain, hasExercises, completedSets, totalSets, isSubmitting, submitted,
  onSubmit, onAddExercise, rest, canDictate, dictationActive, onToggleDictation, onOpenCoach,
}) => {
  const primary = submitted ? (
    <SavedMarker aria-live='polite'><Check size={16} aria-hidden='true' /> Saved</SavedMarker>
  ) : stage === 'setup' ? (
    <Primary type='button' onClick={onGoTrain}>Go to Train</Primary>
  ) : hasExercises ? (
    <Primary type='button' onClick={onSubmit} disabled={isSubmitting} aria-label='Complete and save workout'>
      {/* Every set logged → the bar tells you the session is done. */}
      <Save size={16} aria-hidden='true' /> {totalSets > 0 && completedSets >= totalSets ? 'Finish workout' : 'Save'}
    </Primary>
  ) : (
    <Primary type='button' onClick={onAddExercise}><Plus size={16} aria-hidden='true' /> Add exercise</Primary>
  );

  return (
    <>
      <BarWrap data-shell-zone='action-bar'>
        {canDictate && (
          <IconButton
            type='button'
            aria-label='Dictate workout log entries'
            aria-pressed={dictationActive}
            onClick={onToggleDictation}
          >
            <Mic size={18} aria-hidden='true' />
          </IconButton>
        )}
        <IconButton type='button' $coach aria-haspopup='dialog' aria-label='Open Swan Coach' onClick={onOpenCoach}>
          <Sparkles size={18} aria-hidden='true' />
        </IconButton>
        <Center aria-live='polite'>
          {rest.isRunning ? (
            <>
              <RestReadout aria-label={`Rest: ${formatRest(rest.secondsLeft)} remaining`}>
                {formatRest(rest.secondsLeft)}
              </RestReadout>
              <RestButton type='button' onClick={() => rest.extend(15)} aria-label='Add 15 seconds of rest'>
                +15s
              </RestButton>
              <RestButton type='button' onClick={rest.stop} aria-label='Skip rest'>
                <TimerOff size={14} aria-hidden='true' /> Skip
              </RestButton>
            </>
          ) : (
            hasExercises && (
              <Meter aria-label={`${completedSets} of ${totalSets} sets logged`}>
                {completedSets}/{totalSets} sets
              </Meter>
            )
          )}
        </Center>
        {primary}
      </BarWrap>
      <Spacer aria-hidden='true' />
    </>
  );
});

ActionBar.displayName = 'ActionBar';
export default ActionBar;
