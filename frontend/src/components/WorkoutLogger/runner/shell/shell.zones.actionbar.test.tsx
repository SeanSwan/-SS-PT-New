/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Action bar laws (Slice 4b, tests-first).    │
 * │ Zone 6: ONE bottom bar = footer + StickyLogActionBar +      │
 * │ skin thumb-bar rest + TimerFAB/FloatingRestTimer, with the  │
 * │ consult carve-outs: persistent segment (mic + coach, never  │
 * │ unmounts) · stage segment (ONE primary) · REST IS A STATE   │
 * │ of the bar (countdown + Skip/+15s, same accessible names    │
 * │ the skins carried) · destructive/rare actions live in the   │
 * │ context-bar overflow, never next to the primary.            │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 6 + §4.4.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ActionBar from './zones/ActionBar';

const baseProps = {
  stage: 'train' as const,
  onGoTrain: vi.fn(),
  hasExercises: true,
  completedSets: 3,
  totalSets: 8,
  isSubmitting: false,
  submitted: false,
  onSubmit: vi.fn(),
  onAddExercise: vi.fn(),
  rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
  canDictate: true,
  dictationActive: false,
  onToggleDictation: vi.fn(),
  onOpenCoach: vi.fn(),
};

afterEach(cleanup);

describe('stage segment — ONE primary, stage-aware', () => {
  it('Train with exercises: primary is Save (the sticky-bar contract, verbatim)', () => {
    const onSubmit = vi.fn();
    render(<ActionBar {...baseProps} onSubmit={onSubmit} />);
    const save = screen.getByRole('button', { name: 'Complete and save workout' });
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('3 of 8 sets logged')).toBeInTheDocument();
  });

  it('Train while empty: primary is Add exercise', () => {
    const onAddExercise = vi.fn();
    render(<ActionBar {...baseProps} hasExercises={false} onAddExercise={onAddExercise} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add exercise' }));
    expect(onAddExercise).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Complete and save workout' })).toBeNull();
  });

  it('Setup: primary returns to Train — never a save from Setup', () => {
    const onGoTrain = vi.fn();
    render(<ActionBar {...baseProps} stage='setup' onGoTrain={onGoTrain} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to Train' }));
    expect(onGoTrain).toHaveBeenCalledTimes(1);
  });

  it('submitting disables the primary; submitted swaps it to a saved marker', () => {
    const { rerender } = render(<ActionBar {...baseProps} isSubmitting />);
    expect(screen.getByRole('button', { name: 'Complete and save workout' })).toBeDisabled();
    rerender(<ActionBar {...baseProps} submitted />);
    expect(screen.queryByRole('button', { name: 'Complete and save workout' })).toBeNull();
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
  });
});

describe('REST is a state of the bar (skin rest coverage transplanted here)', () => {
  it('while resting: countdown + Skip + 15s, and Save stays reachable', () => {
    const stop = vi.fn();
    const extend = vi.fn();
    render(
      <ActionBar {...baseProps} rest={{ isRunning: true, secondsLeft: 65, stop, extend }} />,
    );
    expect(screen.getByLabelText('Rest: 1:05 remaining')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add 15 seconds of rest' }));
    expect(extend).toHaveBeenCalledWith(15);
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }));
    expect(stop).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Complete and save workout' })).toBeInTheDocument();
  });
});

describe('persistent segment — Coach persists; Dictate is Train-only', () => {
  it('shows Dictate only in eligible Train state', () => {
    render(<ActionBar {...baseProps} stage='train' />);
    expect(screen.getByRole('button', { name: 'Dictate workout log entries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Swan Coach' })).toBeInTheDocument();
  });

  it.each([
    { stage: 'setup' as const, submitted: false, canDictate: true },
    { stage: 'finish' as const, submitted: false, canDictate: true },
    { stage: 'train' as const, submitted: true, canDictate: true },
    { stage: 'train' as const, submitted: false, canDictate: false },
  ])('hides Dictate outside the eligible role/stage/save matrix: %o', ({ stage, submitted, canDictate }) => {
    render(<ActionBar {...baseProps} stage={stage} submitted={submitted} canDictate={canDictate} />);
    expect(screen.queryByRole('button', { name: 'Dictate workout log entries' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Swan Coach' })).toBeInTheDocument();
  });

  it('hides Dictate after save', () => {
    render(<ActionBar {...baseProps} submitted />);
    expect(screen.queryByRole('button', { name: 'Dictate workout log entries' })).not.toBeInTheDocument();
  });

  it('mic reflects dictation state via aria-pressed', () => {
    const onToggleDictation = vi.fn();
    render(<ActionBar {...baseProps} dictationActive onToggleDictation={onToggleDictation} />);
    const mic = screen.getByRole('button', { name: 'Dictate workout log entries' });
    expect(mic).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(mic);
    expect(onToggleDictation).toHaveBeenCalledTimes(1);
  });
});

describe('bar discipline', () => {
  it('no destructive actions on the bar — Cancel/PDF live in the context-bar overflow', () => {
    render(<ActionBar {...baseProps} />);
    expect(screen.queryByRole('button', { name: /Cancel/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /PDF/i })).toBeNull();
  });
});
