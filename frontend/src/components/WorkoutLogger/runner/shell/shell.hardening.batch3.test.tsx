/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — hostile-review Batch 3 laws.                │
 * │ ① zone crashes NEVER kill the session (boundary + Save      │
 * │   fallback) ② the context bar shows LIVE elapsed (consult   │
 * │   zone-1 spec: elapsed/volume, not an estimate) ③ tablist   │
 * │   arrow-key law (WAI-ARIA) ④ all-sets-logged flips the      │
 * │   primary to "Finish workout" (aria contract unchanged)     │
 * │ ⑤ PRs finally SHOW — earned gold on the Receipt.            │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ShellZoneBoundary from './primitives/ShellZoneBoundary';
import ReceiptPRStrip from './zones/ReceiptPRStrip';
import ContextBar from './zones/ContextBar';
import ActionBar from './zones/ActionBar';
import StageRail from './zones/StageRail';
import { createSessionStageStore } from './useSessionStage';

afterEach(cleanup);

describe('① ShellZoneBoundary — chrome crashes degrade, the session survives', () => {
  const Bomb: React.FC = () => { throw new Error('zone exploded'); };

  it('a crashing zone renders its fallback; siblings keep rendering', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <div>
        <ShellZoneBoundary zone='context-bar' fallback={<span>bare save</span>}>
          <Bomb />
        </ShellZoneBoundary>
        <p>the canvas lives</p>
      </div>,
    );
    expect(screen.getByText('bare save')).toBeInTheDocument();
    expect(screen.getByText('the canvas lives')).toBeInTheDocument();
    errorSpy.mockRestore();
  });

  it('default fallback is nothing — never a broken subtree', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(
      <ShellZoneBoundary zone='notice-lane'><Bomb /></ShellZoneBoundary>,
    );
    expect(container.textContent).toBe('');
    errorSpy.mockRestore();
  });
});

describe('② ContextBar — LIVE elapsed · volume once the session starts', () => {
  const baseProps = {
    clientFirstName: 'Marcus', clientLastName: 'Rivera', availableSessions: 10,
    clientSource: 'swanstudios', workoutDate: '2026-07-31', totalSets: 12,
    estimatedDuration: 45, assignment: null, currentOPTPhase: 2, onOPTPhaseChange: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('pre-start: the estimate; post-start: volume · ticking elapsed', () => {
    const { rerender } = render(<ContextBar {...baseProps} />);
    expect(screen.getByText(/12 sets · ~45 min/)).toBeInTheDocument();

    const startedAt = Date.now();
    rerender(<ContextBar {...baseProps} sessionStartedAt={startedAt} formattedVolume='4,120 lbs' />);
    expect(screen.getByText(/4,120 lbs · 0:00/)).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(65_000));
    expect(screen.getByText(/4,120 lbs · 1:05/)).toBeInTheDocument();
  });
});

describe('③ StageRail — WAI-ARIA tablist arrow keys (activate + wrap)', () => {
  it('ArrowRight advances, ArrowLeft wraps backward from Setup', () => {
    const store = createSessionStageStore();
    render(<StageRail store={store} />);
    const rail = screen.getByRole('tablist', { name: 'Session stages' });

    fireEvent.keyDown(rail, { key: 'ArrowRight' }); // train → finish
    expect(store.getStage()).toBe('finish');
    fireEvent.keyDown(rail, { key: 'ArrowRight' }); // finish → wraps to setup
    expect(store.getStage()).toBe('setup');
    fireEvent.keyDown(rail, { key: 'ArrowLeft' }); // setup → wraps to finish
    expect(store.getStage()).toBe('finish');
  });

  it('roving tabindex: only the active tab is in the tab order', () => {
    const store = createSessionStageStore();
    render(<StageRail store={store} />);
    expect(screen.getByRole('tab', { name: /Train/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Setup/ })).toHaveAttribute('tabindex', '-1');
  });
});

describe('④ ActionBar — every set logged flips the primary copy, not the contract', () => {
  const baseProps = {
    stage: 'train' as const, onGoTrain: vi.fn(), hasExercises: true,
    isSubmitting: false, submitted: false, onSubmit: vi.fn(), onAddExercise: vi.fn(),
    rest: { isRunning: false, secondsLeft: 0, stop: vi.fn(), extend: vi.fn() },
    canDictate: false, dictationActive: false, onToggleDictation: vi.fn(), onOpenCoach: vi.fn(),
  };

  it('mid-session says Save; all-done says Finish workout — same aria-label', () => {
    const { rerender } = render(<ActionBar {...baseProps} completedSets={3} totalSets={8} />);
    const save = screen.getByRole('button', { name: 'Complete and save workout' });
    expect(save).toHaveTextContent('Save');

    rerender(<ActionBar {...baseProps} completedSets={8} totalSets={8} />);
    expect(screen.getByRole('button', { name: 'Complete and save workout' }))
      .toHaveTextContent('Finish workout');
  });
});

describe('⑤ ReceiptPRStrip — the PRs useSessionStats always computed finally SHOW', () => {
  it('renders earned-gold chips per PR with an accessible count', () => {
    render(
      <ReceiptPRStrip prs={[
        { exerciseName: 'DB Bench Press', type: 'weight', value: 105, label: '105 lbs top set' },
        { exerciseName: 'Row', type: 'volume', value: 2400, label: '2,400 lbs volume' },
      ]} />,
    );
    expect(screen.getByRole('status', { name: '2 personal records this session' })).toBeInTheDocument();
    expect(screen.getByText(/DB Bench Press · 105 lbs top set/)).toBeInTheDocument();
    expect(screen.getByText(/Row · 2,400 lbs volume/)).toBeInTheDocument();
  });

  it('no PRs → renders nothing (never an empty gold frame)', () => {
    const { container } = render(<ReceiptPRStrip prs={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
