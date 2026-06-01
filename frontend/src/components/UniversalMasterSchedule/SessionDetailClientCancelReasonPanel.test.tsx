import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailClientCancelReasonPanel from './SessionDetailClientCancelReasonPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailClientCancelReasonPanel', () => {
  it('captures a client cancellation reason and optional early-cancel selection', () => {
    const onCancelReasonChange = vi.fn();
    const onEarlyCancelChange = vi.fn();

    render(
      <SessionDetailClientCancelReasonPanel
        cancelReason=""
        onCancelReasonChange={onCancelReasonChange}
        isEarlyCancelEligible={true}
        earlyCancel={false}
        onEarlyCancelChange={onEarlyCancelChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/cancellation reason/i), {
      target: { value: 'Work conflict' },
    });
    fireEvent.click(screen.getByLabelText(/early cancel/i));

    expect(onCancelReasonChange).toHaveBeenCalledWith('Work conflict');
    expect(onEarlyCancelChange).toHaveBeenCalledWith(true);
  });

  it('hides early-cancel controls when the session is inside the penalty window', () => {
    render(
      <SessionDetailClientCancelReasonPanel
        cancelReason=""
        onCancelReasonChange={vi.fn()}
        isEarlyCancelEligible={false}
        earlyCancel={false}
        onEarlyCancelChange={vi.fn()}
      />
    );

    expect(screen.queryByLabelText(/early cancel/i)).not.toBeInTheDocument();
  });

  it('keeps plain client cancellation markup out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailClientCancelReasonPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailClientCancelReasonPanel'");
    expect(modalSource).not.toContain('Reason for cancelling this session');
    expect(modalSource).not.toContain('<EarlyCancelOption>');
    expect(panelSource).toContain('Reason for cancelling this session');
    expect(panelSource).toContain('<EarlyCancelOption>');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(100);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
