import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailClientCancelWarningPanel from './SessionDetailClientCancelWarningPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

const warning = {
  isLateCancellation: true,
  hoursUntilSession: 3.5,
  lateFeeAmount: 88,
  warningMessage: 'Cancelling now may deduct a paid session.',
  sessionDateFormatted: 'May 31, 2026 at 5:00 PM',
};

describe('SessionDetailClientCancelWarningPanel', () => {
  it('renders late cancellation fee confirmation without submitting accidentally', () => {
    const onBack = vi.fn();
    const onConfirm = vi.fn();
    const onCancelReasonChange = vi.fn();

    render(
      <SessionDetailClientCancelWarningPanel
        lateCancelWarning={warning}
        loading={false}
        cancelReason=""
        onCancelReasonChange={onCancelReasonChange}
        onBack={onBack}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText('Late Cancellation Warning')).toBeInTheDocument();
    expect(screen.getByText('$88.00')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/cancellation reason/i), {
      target: { value: 'Client is sick' },
    });
    expect(onCancelReasonChange).toHaveBeenCalledWith('Client is sick');

    fireEvent.click(screen.getByRole('button', { name: /go back/i }));
    expect(onBack).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders early no-fee cancellation confirmation', () => {
    render(
      <SessionDetailClientCancelWarningPanel
        lateCancelWarning={{
          ...warning,
          isLateCancellation: false,
          hoursUntilSession: 28,
          warningMessage: 'This cancellation is early enough to avoid a fee.',
        }}
        loading={false}
        cancelReason="Schedule conflict"
        onCancelReasonChange={vi.fn()}
        onBack={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByText('Free Cancellation Available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel session \(no fee\)/i })).toBeInTheDocument();
    expect(screen.queryByText('Late Cancellation Fee')).not.toBeInTheDocument();
  });

  it('keeps client warning JSX out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailClientCancelWarningPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailClientCancelWarningPanel'");
    expect(modalSource).not.toContain('<LateCancelWarningPanel>');
    expect(modalSource).not.toContain('<EarlyCancelPanel>');
    expect(panelSource).toContain('<LateCancelWarningPanel>');
    expect(panelSource).toContain('<EarlyCancelPanel>');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
