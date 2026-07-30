/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Context bar laws (Slice 1, tests-first).    │
 * │ Zone 1: STATUS lives here, controls live in the action bar. │
 * │ client · date · plan chip (→ plan sheet w/ OPT phase) ·     │
 * │ 2 numbers max · session-source signal (the 'free tracking'  │
 * │ policy absorbed from WorkoutLoggerHeader — coverage reborn, │
 * │ not dropped). 44px targets; chip is the ONLY control.       │
 * │ Source: SESSION-SHELL-HANDOFF-2026-07-30 §3 zone 1 + §4.1.  │
 * └─────────────────────────────────────────────────────────────┘
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ContextBar from './zones/ContextBar';

const baseProps = {
  clientFirstName: 'Marcus',
  clientLastName: 'Rivera',
  availableSessions: 10,
  clientSource: 'swanstudios' as string | null,
  workoutDate: '2026-07-30',
  totalSets: 12,
  estimatedDuration: 45,
  assignment: null,
  currentOPTPhase: 2,
  onOPTPhaseChange: vi.fn(),
};

afterEach(cleanup);

describe('status surface', () => {
  it('shows client, date, and the 2 session numbers', () => {
    render(<ContextBar {...baseProps} />);
    expect(screen.getByText(/Marcus Rivera/)).toBeInTheDocument();
    expect(screen.getByText(/12 sets/)).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
  });

  it("preserves the client-source policy: move_fitness reads 'free tracking', never session debt", () => {
    render(<ContextBar {...baseProps} clientSource='move_fitness' availableSessions={9} />);
    expect(screen.getByText('free tracking')).toBeInTheDocument();
    expect(screen.queryByText(/Sessions Remaining/i)).toBeNull();
  });

  it('paid clients see their session count signal', () => {
    render(<ContextBar {...baseProps} clientSource='swanstudios' availableSessions={4} />);
    expect(screen.getByText('4 paid sessions')).toBeInTheDocument();
  });
});

describe('plan chip → plan sheet (ActivePlanContextStrip absorbed, not dropped)', () => {
  const assignment = {
    title: 'Push A',
    weekNumber: 2,
    dayNumber: 1,
    exerciseCount: 6,
    firstExerciseName: 'DB Bench Press',
  } as never;

  it('chip carries the plan title; tap opens the sheet with full plan context + OPT phase', () => {
    render(<ContextBar {...baseProps} assignment={assignment} />);
    const chip = screen.getByRole('button', { name: /Session plan: Push A/i });
    fireEvent.click(chip);

    const dialog = screen.getByRole('dialog', { name: /Session plan/i });
    expect(dialog).toBeInTheDocument();
    // The proven strip renders INSIDE the sheet — same component, new home.
    expect(screen.getByRole('note', { name: 'Active plan context' })).toBeInTheDocument();
    expect(screen.getByText(/Week 2/)).toBeInTheDocument();
    expect(screen.getByText(/6 exercises/)).toBeInTheDocument();
    // OPT phase selector relocated from the deleted header.
    expect(screen.getByText(/Phase 2/i)).toBeInTheDocument();
  });

  it('no assignment → chip reads "No plan" and still opens the sheet', () => {
    render(<ContextBar {...baseProps} />);
    const chip = screen.getByRole('button', { name: /Session plan: No plan/i });
    fireEvent.click(chip);
    expect(screen.getByRole('dialog', { name: /Session plan/i })).toBeInTheDocument();
  });

  it('ESC closes the sheet and focus returns to the chip (Sheet primitive contract)', () => {
    render(<ContextBar {...baseProps} assignment={assignment} />);
    const chip = screen.getByRole('button', { name: /Session plan: Push A/i });
    chip.focus();
    fireEvent.click(chip);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(chip);
  });
});
