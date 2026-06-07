import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SessionSummaryForm from './SessionSummaryForm';

const renderSummary = (props: Partial<ComponentProps<typeof SessionSummaryForm>> = {}) => render(
  <SessionSummaryForm
    overallIntensity={null}
    onIntensityChange={vi.fn()}
    sessionNotes=""
    onNotesChange={vi.fn()}
    exerciseCount={4}
    totalSets={12}
    estimatedDuration={60}
    clientSource="swanstudios"
    {...props}
  />
);

describe('SessionSummaryForm deduction label', () => {
  it('names the default SwanStudios deduction as one session credit', () => {
    renderSummary();

    expect(screen.getByText('Will Deduct 1 Session Credit')).toBeInTheDocument();
  });

  it('uses scheduled session credit hints for multi-credit session types', () => {
    renderSummary({ scheduledSessionCreditHint: 2 });

    expect(screen.getByText('Will Deduct 2 Session Credits')).toBeInTheDocument();
  });

  it('keeps Move Fitness and external clients non-deducting even when a hint exists', () => {
    renderSummary({ clientSource: 'move_fitness', scheduledSessionCreditHint: 2 });

    expect(screen.getByText('No Paid Session Deduction')).toBeInTheDocument();
    expect(screen.queryByText(/Will Deduct/i)).toBeNull();
  });

  it('treats zero-credit scheduled sessions as non-deducting', () => {
    renderSummary({ scheduledSessionCreditHint: 0 });

    expect(screen.getByText('No Paid Session Deduction')).toBeInTheDocument();
  });
});
