/**
 * ============================================================================
 * FILE: TodayTrainingModule.test.tsx
 * PURPOSE: Verify accessible Today controls and visible training truth.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the shared component and follows its public button outcomes.
 * HOW IT FITS IN THE APP: Guards the canonical client Today rollout before release.
 * KEY DECISIONS: Assertions use public state and source contracts, never private data.
 * NASM PROTOCOL CONTEXT: Verifies presentation and routing truth, not prescriptions.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TodayTrainingModule from './TodayTrainingModule';

const state = {
  loading: false,
  error: false,
  workout: {
    title: 'Lower Body Strength',
    assignmentKey: 'assignment-1',
    assignmentType: 'homework',
    assignmentStatus: 'planned',
    isLoggable: true,
    ctaLabel: 'Log Assignment',
    weekNumber: 2,
    dayNumber: 3,
    exerciseCount: 4,
    exerciseNames: ['Goblet Squat', 'Split Squat', 'Cable Row', 'Dead Bug'],
  },
  planVault: null,
} as any;

describe('TodayTrainingModule', () => {
  it('renders concise exercises and three 44px route actions', () => {
    const onNavigate = vi.fn();
    render(<TodayTrainingModule state={state} onNavigate={onNavigate} />);

    expect(screen.getByRole('region', { name: /today.s training/i })).toBeInTheDocument();
    expect(screen.getByText('Goblet Squat')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /log workout/i }));
    expect(onNavigate).toHaveBeenCalledWith(expect.stringContaining('/dashboard/client/log-workout?'));
    fireEvent.click(screen.getByRole('button', { name: /view plan/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/workouts');
    fireEvent.click(screen.getByRole('button', { name: /view schedule/i }));
    expect(onNavigate).toHaveBeenCalledWith('/dashboard/client/schedule');
  });

  it('disables logging for an honest recovery state', () => {
    render(<TodayTrainingModule
      state={{
        ...state,
        workout: { ...state.workout, assignmentType: 'active_recovery', isLoggable: false },
      }}
      onNavigate={vi.fn()}
    />);
    expect(screen.getByRole('button', { name: /log workout/i })).toBeDisabled();
    expect(screen.getByText(/active recovery/i)).toBeInTheDocument();
  });
});
