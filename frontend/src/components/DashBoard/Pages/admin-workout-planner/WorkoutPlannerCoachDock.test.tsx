/**
 * WorkoutPlannerCoachDock — S1 render-state contract.
 * Covers: collapsed default, expand/collapse aria-expanded, mic aria-pressed,
 * busy state, error receipt row, empty-state example prompts, no-client bar.
 */
import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorkoutPlannerCoachDock, { type WorkoutPlannerCoachDockProps } from './WorkoutPlannerCoachDock';

const baseProps: WorkoutPlannerCoachDockProps = {
  clientName: 'Test Client',
  open: false,
  toggleOpen: vi.fn(),
  dockText: '',
  setDockText: vi.fn(),
  listening: false,
  interim: '',
  handleVoice: vi.fn(),
  voiceOverlay: null,
  submitting: false,
  handleSubmit: vi.fn(),
  onReceiptAction: vi.fn(),
  receipts: [],
};

/** Stateful harness so expand/collapse drives a real re-render. */
const TogglingDock: React.FC<Partial<WorkoutPlannerCoachDockProps>> = (overrides) => {
  const [open, setOpen] = useState(false);
  return (
    <WorkoutPlannerCoachDock
      {...baseProps}
      {...overrides}
      open={open}
      toggleOpen={() => setOpen((prev) => !prev)}
    />
  );
};

describe('WorkoutPlannerCoachDock', () => {
  it('renders collapsed by default with the Open Coach affordance', () => {
    render(<WorkoutPlannerCoachDock {...baseProps} />);
    expect(screen.getByText('Swan Coach — talk to build this plan')).toBeInTheDocument();
    const openBtn = screen.getByRole('button', { name: /open coach/i });
    expect(openBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Tell Swan Coach what to change')).not.toBeInTheDocument();
  });

  it('expands and collapses with an honest aria-expanded state', () => {
    render(<TogglingDock />);
    fireEvent.click(screen.getByRole('button', { name: /open coach/i }));
    const collapseBtn = screen.getByRole('button', { name: /collapse/i });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseBtn);
    expect(screen.getByRole('button', { name: /open coach/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('reflects dictation state through aria-pressed on the mic', () => {
    const { rerender } = render(<WorkoutPlannerCoachDock {...baseProps} open />);
    const mic = screen.getByRole('button', { name: 'Dictate to Swan Coach' });
    expect(mic).toHaveAttribute('aria-pressed', 'false');
    rerender(<WorkoutPlannerCoachDock {...baseProps} open listening interim="swap the leg press for…" />);
    expect(mic).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/listening…\s+"swap the leg press for…"/)).toBeInTheDocument();
  });

  it('keeps interim dictation out of the textarea value (hint only)', () => {
    render(<WorkoutPlannerCoachDock {...baseProps} open listening interim="two sets of" dockText="swap leg press" />);
    expect(screen.getByLabelText('Tell Swan Coach what to change')).toHaveValue('swap leg press');
    expect(screen.getByText(/listening…\s+"two sets of"/)).toBeInTheDocument();
  });

  it('disables Send and shows the thinking row while busy', () => {
    render(<WorkoutPlannerCoachDock {...baseProps} open submitting dockText="add squats" />);
    const send = screen.getByRole('button', { name: 'Send to Swan Coach' });
    expect(send).toBeDisabled();
    expect(send).toHaveTextContent('Working…');
    expect(screen.getByText('Swan Coach is thinking…')).toBeInTheDocument();
  });

  it('renders a failure receipt row with the ✗ prefix', () => {
    render(
      <WorkoutPlannerCoachDock
        {...baseProps}
        open
        receipts={[{ id: 'r1', ok: false, text: 'Swan Coach is unreachable — try again.' }]}
      />,
    );
    expect(screen.getByText('Swan Coach is unreachable — try again.')).toBeInTheDocument();
    expect(screen.getByText('✗')).toBeInTheDocument();
  });

  it('shows the example prompts row when the feed is empty', () => {
    render(<WorkoutPlannerCoachDock {...baseProps} open />);
    expect(screen.getByText(/Try: "Add goblet squats, three sets of twelve"/)).toBeInTheDocument();
  });

  it('renders a single accessible receipt action and identifies its receipt', () => {
    const onReceiptAction = vi.fn();
    const action = { label: 'Undo', eventName: 'AI_PLANNER_UNDO', payload: {} };
    render(
      <WorkoutPlannerCoachDock
        {...baseProps}
        open
        onReceiptAction={onReceiptAction}
        receipts={[{ id: 'r1', ok: true, text: 'Reordered 3 exercises.', action }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onReceiptAction).toHaveBeenCalledWith('r1', action);
  });

  it('shows only the muted select-a-client bar when no client is selected', () => {
    render(<WorkoutPlannerCoachDock {...baseProps} clientName={null} />);
    expect(screen.getByText('Select a client to talk to Swan Coach.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /open coach/i })).not.toBeInTheDocument();
  });

  it('submits on Enter but keeps Shift+Enter as a newline', () => {
    const handleSubmit = vi.fn();
    render(<WorkoutPlannerCoachDock {...baseProps} open dockText="add squats" handleSubmit={handleSubmit} />);
    const textarea = screen.getByLabelText('Tell Swan Coach what to change');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(handleSubmit).not.toHaveBeenCalled();
    fireEvent.submit(textarea.closest('form') as HTMLFormElement);
    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });
});
