/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Notice lane laws (Slice 1, tests-first).    │
 * │ Zone 2 (Opus): max ONE notice, priority queue               │
 * │ offline/save-failure > draft-gate > schedule > billing >    │
 * │ tip; dismissible; overlay — never a layout shift. Absorbs   │
 * │ ScheduledSessionStatusBanner + WorkoutDraftGateBanner       │
 * │ (draft-gate BEHAVIOR unchanged — same setters, same order). │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 2 + §4.1.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ShellNotices from './zones/ShellNotices';
import type { UseWorkoutDraftResult } from '../../useWorkoutDraft';

const draftPayload = {
  version: 1 as const,
  savedAt: Date.now(),
  exercises: [
    {
      exerciseName: 'Bench Press', exerciseId: 'x1', formRating: null, painLevel: 0,
      sets: [{ setNumber: 1, weight: 100, reps: 8, rpe: null, formQuality: null, restTime: 60 }],
    },
  ],
  sessionNotes: 'draft notes',
  overallIntensity: 6,
};

const makeDraft = (overrides: Partial<UseWorkoutDraftResult> = {}): UseWorkoutDraftResult => ({
  pendingDraft: draftPayload as never,
  restore: vi.fn(() => draftPayload as never),
  discard: vi.fn(),
  clear: vi.fn(),
  ...overrides,
} as UseWorkoutDraftResult);

const baseProps = {
  isOnline: true,
  pendingCount: 0,
  workoutDraft: makeDraft({ pendingDraft: null }),
  draftOfferVisible: false,
  setDraftGate: vi.fn(),
  setExercises: vi.fn(),
  setSessionNotes: vi.fn(),
  setOverallIntensity: vi.fn(),
  scheduledSessionId: null as string | null,
  scheduledSessionCreditHint: null as number | null,
  scheduledSessionDate: null as string | null,
  clientSource: null as string | null,
};

afterEach(cleanup);

describe('priority queue — ONE notice, highest severity wins', () => {
  it('renders nothing when no notice applies', () => {
    const { container } = render(<ShellNotices {...baseProps} />);
    expect(container.querySelector('[data-shell-zone="notice-lane"]')).toBeNull();
  });

  it('offline outranks the draft offer; the draft appears once back online', () => {
    const { rerender } = render(
      <ShellNotices
        {...baseProps}
        isOnline={false}
        pendingCount={2}
        workoutDraft={makeDraft()}
        draftOfferVisible
      />,
    );
    expect(screen.getByText(/Offline/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Restore/i })).toBeNull();

    rerender(
      <ShellNotices {...baseProps} isOnline workoutDraft={makeDraft()} draftOfferVisible />,
    );
    expect(screen.queryByText(/Offline/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Restore/i })).toBeInTheDocument();
  });

  it('draft offer outranks the schedule notice', () => {
    render(
      <ShellNotices
        {...baseProps}
        workoutDraft={makeDraft()}
        draftOfferVisible
        scheduledSessionId='sched-1'
        clientSource='swanstudios'
        scheduledSessionCreditHint={1}
      />,
    );
    expect(screen.getByRole('button', { name: /Restore/i })).toBeInTheDocument();
    expect(screen.queryByText(/Schedule-linked/i)).toBeNull();
  });

  it('schedule notice carries the deduction consequence (banner absorption keeps the info)', () => {
    render(
      <ShellNotices
        {...baseProps}
        scheduledSessionId='sched-1'
        clientSource='swanstudios'
        scheduledSessionCreditHint={2}
      />,
    );
    expect(screen.getByText(/Schedule-linked/i)).toBeInTheDocument();
    expect(screen.getByText(/Will Deduct 2 Session Credits/i)).toBeInTheDocument();
  });

  it('non-deducting sources show the no-deduction consequence', () => {
    render(
      <ShellNotices
        {...baseProps}
        scheduledSessionId='sched-1'
        clientSource='move_fitness'
        scheduledSessionCreditHint={1}
      />,
    );
    expect(screen.getByText(/No Paid Session Deduction/i)).toBeInTheDocument();
  });

  it('dismissing the schedule notice empties the lane (one-way, this session)', () => {
    render(
      <ShellNotices
        {...baseProps}
        scheduledSessionId='sched-1'
        clientSource='swanstudios'
        scheduledSessionCreditHint={1}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Dismiss notice/i }));
    expect(screen.queryByText(/Schedule-linked/i)).toBeNull();
  });
});

describe('draft-gate behavior — VERBATIM transplant of WorkoutDraftGateBanner', () => {
  it('Restore: gate→restored, identity-ensured exercises, notes, intensity — same order', () => {
    const setDraftGate = vi.fn();
    const setExercises = vi.fn();
    const setSessionNotes = vi.fn();
    const setOverallIntensity = vi.fn();
    const workoutDraft = makeDraft();

    render(
      <ShellNotices
        {...baseProps}
        workoutDraft={workoutDraft}
        draftOfferVisible
        setDraftGate={setDraftGate}
        setExercises={setExercises}
        setSessionNotes={setSessionNotes}
        setOverallIntensity={setOverallIntensity}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Restore/i }));

    expect(workoutDraft.restore).toHaveBeenCalledTimes(1);
    expect(setDraftGate).toHaveBeenCalledWith('restored');
    const restored = setExercises.mock.calls[0][0];
    expect(restored).toHaveLength(1);
    expect(restored[0].exerciseName).toBe('Bench Press');
    expect(restored[0].loggerExerciseId).toBeTruthy(); // identity ensured
    expect(setSessionNotes).toHaveBeenCalledWith('draft notes');
    expect(setOverallIntensity).toHaveBeenCalledWith(6);
  });

  it('Discard: gate→discarded then draft.discard() — the draft is NOT restorable after', () => {
    const setDraftGate = vi.fn();
    const workoutDraft = makeDraft();
    render(
      <ShellNotices
        {...baseProps}
        workoutDraft={workoutDraft}
        draftOfferVisible
        setDraftGate={setDraftGate}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Discard/i }));
    expect(setDraftGate).toHaveBeenCalledWith('discarded');
    expect(workoutDraft.discard).toHaveBeenCalledTimes(1);
  });

  it('M6: Restore resumes a STILL-RUNNING rest countdown from the draft', () => {
    const onRestoreRest = vi.fn();
    const future = Date.now() + 45_000;
    const workoutDraft = makeDraft({
      pendingDraft: { ...draftPayload, restEndsAt: future } as never,
      restore: vi.fn(() => ({ ...draftPayload, restEndsAt: future } as never)),
    });
    render(
      <ShellNotices {...baseProps} workoutDraft={workoutDraft} draftOfferVisible onRestoreRest={onRestoreRest} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Restore/i }));
    expect(onRestoreRest).toHaveBeenCalledWith(future);
  });

  it('M6: an EXPIRED rest countdown never resurrects on restore', () => {
    const onRestoreRest = vi.fn();
    const past = Date.now() - 5_000;
    const workoutDraft = makeDraft({
      pendingDraft: { ...draftPayload, restEndsAt: past } as never,
      restore: vi.fn(() => ({ ...draftPayload, restEndsAt: past } as never)),
    });
    render(
      <ShellNotices {...baseProps} workoutDraft={workoutDraft} draftOfferVisible onRestoreRest={onRestoreRest} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Restore/i }));
    expect(onRestoreRest).not.toHaveBeenCalled();
  });

  it('the draft offer is a decision, not dismissible chrome (no dismiss button)', () => {
    render(<ShellNotices {...baseProps} workoutDraft={makeDraft()} draftOfferVisible />);
    expect(screen.queryByRole('button', { name: /Dismiss notice/i })).toBeNull();
  });

  it('hidden when the offer window is over (exercises or notes exist)', () => {
    render(<ShellNotices {...baseProps} workoutDraft={makeDraft()} draftOfferVisible={false} />);
    expect(screen.queryByRole('button', { name: /Restore/i })).toBeNull();
  });
});
